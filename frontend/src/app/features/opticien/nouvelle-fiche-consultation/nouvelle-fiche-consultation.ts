import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, of, switchMap } from 'rxjs';

import { Auth } from '../../../core/services/auth';
import { ConsultationService } from '../../../core/services/consultation';
import { PatientCabinet, PatientsCabinet } from '../../../core/services/patients-cabinet';
import { erreursParChamp, messageErreurApi } from '../../../core/utils/api-errors';
import { ConsultationEcriture, ConsultationModification, ConsultationOpticien } from '../../../models/consultation.model';

/** Champs du serveur affichés sous leur champ de formulaire ; les autres (od_*, og_*, plainte_*) vont dans le bandeau. */
const CHAMPS_FORMULAIRE = ['patient_id', 'date_consultation', 'motif', 'observations', 'ecart_pupillaire'];

const LIBELLES_CHAMPS: Record<string, string> = {
  sphere: 'sphère',
  cylindre: 'cylindre',
  axe: 'axe',
  addition: 'addition',
  acuite_loin: 'acuité de loin',
  acuite_pres: 'acuité de près',
};

/** Décimal signé (virgule ou point) : sphère, cylindre, addition. Les valeurs restent des chaînes, comme à l'envoi. */
const DECIMAL = /^[+-]?\d+([.,]\d+)?$/;
const ENTIER = /^\d{1,3}$/;

function aujourdHui(): string {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

/** Valeur de formulaire → chaîne (l'API exige des chaînes pour la prescription) ; vide → `undefined` (champ non envoyé). */
function texte(valeur: unknown): string | undefined {
  if (valeur === null || valeur === undefined) return undefined;
  const s = String(valeur).trim();
  return s === '' ? undefined : s;
}

/**
 * Fiche de consultation de l'opticien (20/10/2026), branchée sur POST/GET/PATCH /consultations et PUT /terminer.
 * - `?patientId=` : création pour ce patient ; sans paramètre : choix du patient parmi `GET /cabinets/{id}/patients` ;
 * - `?consultationId=` : consultation existante — modifiable tant qu'elle est `en_cours`, lecture seule ensuite.
 * Le format d'écriture est à plat (voir `models/consultation.model.ts`).
 */
@Component({
  selector: 'app-nouvelle-fiche-consultation',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './nouvelle-fiche-consultation.html',
  styleUrl: './nouvelle-fiche-consultation.css',
})
export class NouvelleFicheConsultation implements OnInit {
  private readonly auth = inject(Auth);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly consultationService = inject(ConsultationService);
  private readonly patientsService = inject(PatientsCabinet);

  private readonly cabinetId = this.auth.utilisateur()?.cabinetId ?? '';

  readonly patients = signal<PatientCabinet[]>([]);
  readonly consultation = signal<ConsultationOpticien | null>(null);
  readonly consultationId = signal<string | null>(null);

  readonly chargement = signal(false);
  readonly erreurChargement = signal<string | null>(null);
  readonly enSoumission = signal(false);
  readonly enTerminaison = signal(false);
  readonly confirmationTerminer = signal(false);

  readonly erreurGenerale = signal<string | null>(null);
  readonly erreursChamps = signal<Record<string, string>>({});
  readonly erreursAutres = signal<string[]>([]);
  readonly succes = signal<string | null>(null);

  /** Valeurs du formulaire telles que le serveur les connaît (dernière réponse) : sert à n'envoyer que les champs modifiés. */
  private reference: Record<string, string | boolean> = {};

  private groupeOeil() {
    return this.fb.nonNullable.group({
      sphere: ['', Validators.pattern(DECIMAL)],
      cylindre: ['', Validators.pattern(DECIMAL)],
      axe: ['', [Validators.pattern(ENTIER), Validators.min(0), Validators.max(180)]],
      add: ['', Validators.pattern(DECIMAL)],
      acuiteLoin: [''],
      acuitePres: [''],
    });
  }

  readonly formulaire = this.fb.nonNullable.group({
    patientId: ['', Validators.required],
    dateConsultation: [aujourdHui(), Validators.required],
    motif: ['', Validators.required],
    plaintes: this.fb.nonNullable.group({
      visionFlouLoin: [false],
      visionFlouPres: [false],
      visionDouble: [false],
      larmoiement: [false],
      demangeaisons: [false],
    }),
    autresPlaintes: [''],
    ecartPupillaire: [''],
    od: this.groupeOeil(),
    og: this.groupeOeil(),
    observations: [''],
  });

  /** Création (pas encore d'id) ou consultation `en_cours` : modifiable ; terminée/verrouillée : lecture seule. */
  readonly modifiable = computed(() => this.consultation()?.modifiable ?? true);
  readonly enCreation = computed(() => this.consultationId() === null);

  readonly patientNom = computed(() => {
    const existante = this.consultation();
    if (existante?.patientNom) return existante.patientNom;
    const id = this.patientIdChoisi();
    return this.patients().find((p) => p.id === id)?.nomComplet ?? '';
  });

  private readonly patientIdChoisi = signal('');

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const consultationId = params.get('consultationId');
    const patientId = params.get('patientId');

    if (!this.cabinetId) {
      this.erreurChargement.set("Aucun cabinet rattaché à ce compte — impossible d'afficher les consultations.");
      return;
    }

    this.formulaire.controls.patientId.valueChanges.subscribe((v) => this.patientIdChoisi.set(v));

    if (consultationId) {
      this.chargerConsultation(consultationId);
      return;
    }

    if (patientId) {
      this.formulaire.controls.patientId.setValue(patientId);
    }
    this.patientsService.lister(this.cabinetId).subscribe({
      next: (patients) => this.patients.set(patients),
      error: (e: HttpErrorResponse) =>
        this.erreurChargement.set(this.message(e, 'Impossible de charger la liste des patients')),
    });
  }

  /** « Accès refusé. » sur 403, sinon erreurs 422 du serveur, sinon message générique complété du message serveur. */
  private message(e: HttpErrorResponse, debut: string): string {
    const messageServeur = (e.error as { message?: string } | null)?.message;
    return messageErreurApi(e, `${debut}.${messageServeur ? ` Le serveur répond : ${messageServeur}` : ' Réessayez plus tard.'}`);
  }

  private chargerConsultation(id: string): void {
    this.chargement.set(true);
    this.consultationService.obtenir(id).subscribe({
      next: (c) => {
        this.chargement.set(false);
        this.consultationId.set(c.id);
        this.appliquerConsultation(c);
      },
      error: (e: HttpErrorResponse) => {
        this.chargement.set(false);
        this.erreurChargement.set(this.message(e, 'Impossible de charger la consultation'));
      },
    });
  }

  /** Remplit le formulaire avec la consultation renvoyée par le serveur ; la verrouille si elle n'est plus modifiable. */
  private appliquerConsultation(c: ConsultationOpticien): void {
    this.consultation.set(c);
    this.patientIdChoisi.set(c.patientId);
    this.formulaire.reset({
      patientId: c.patientId,
      dateConsultation: c.date,
      motif: c.motif,
      plaintes: {
        visionFlouLoin: c.plaintes.vision_flou_loin,
        visionFlouPres: c.plaintes.vision_flou_pres,
        visionDouble: c.plaintes.vision_double,
        larmoiement: c.plaintes.larmoiement,
        demangeaisons: c.plaintes.demangeaisons,
      },
      autresPlaintes: c.plaintes.autres ?? '',
      ecartPupillaire: c.ecartPupillaire,
      od: {
        sphere: c.od.sphere ?? '',
        cylindre: c.od.cylindre ?? '',
        axe: c.od.axe ?? '',
        add: c.od.addition ?? '',
        acuiteLoin: c.od.acuite_loin ?? '',
        acuitePres: c.od.acuite_pres ?? '',
      },
      og: {
        sphere: c.og.sphere ?? '',
        cylindre: c.og.cylindre ?? '',
        axe: c.og.axe ?? '',
        add: c.og.addition ?? '',
        acuiteLoin: c.og.acuite_loin ?? '',
        acuitePres: c.og.acuite_pres ?? '',
      },
      observations: c.observations,
    });
    this.reference = this.aplatir();
    // Le patient et la date ne changent pas après la création.
    this.formulaire.controls.patientId.disable();
    if (c.modifiable) {
      this.formulaire.enable({ emitEvent: false });
      this.formulaire.controls.patientId.disable({ emitEvent: false });
    } else {
      this.formulaire.disable({ emitEvent: false });
    }
  }

  /**
   * Formulaire → champs à plat de l'API. Valeurs de prescription en **chaînes** (le serveur refuse les nombres),
   * virgule décimale convertie en point ; champ vide = chaîne vide.
   */
  private aplatir(): Record<string, string | boolean> {
    const v = this.formulaire.getRawValue();
    const t = (valeur: unknown) => texte(valeur) ?? '';
    const dec = (valeur: unknown) => t(valeur).replace(',', '.');
    return {
      date_consultation: v.dateConsultation,
      motif: v.motif.trim(),
      plainte_vision_flou_loin: v.plaintes.visionFlouLoin,
      plainte_vision_flou_pres: v.plaintes.visionFlouPres,
      plainte_vision_double: v.plaintes.visionDouble,
      plainte_demangeaisons: v.plaintes.demangeaisons,
      plainte_larmoiement: v.plaintes.larmoiement,
      plainte_autres: t(v.autresPlaintes),
      ecart_pupillaire: t(v.ecartPupillaire),
      observations: t(v.observations),
      od_sphere: dec(v.od.sphere),
      od_cylindre: dec(v.od.cylindre),
      od_axe: t(v.od.axe),
      od_addition: dec(v.od.add),
      od_acuite_loin: t(v.od.acuiteLoin),
      od_acuite_pres: t(v.od.acuitePres),
      og_sphere: dec(v.og.sphere),
      og_cylindre: dec(v.og.cylindre),
      og_axe: t(v.og.axe),
      og_addition: dec(v.og.add),
      og_acuite_loin: t(v.og.acuiteLoin),
      og_acuite_pres: t(v.og.acuitePres),
    };
  }

  /** POST : seuls les champs renseignés sont envoyés (les cases à cocher le sont toujours). */
  private corpsCreation(): ConsultationEcriture {
    const corps: Record<string, string | boolean> = {};
    for (const [cle, valeur] of Object.entries(this.aplatir())) {
      if (typeof valeur === 'boolean' || valeur !== '') corps[cle] = valeur;
    }
    return corps as ConsultationEcriture;
  }

  /**
   * PATCH : uniquement les champs différents de la dernière réponse du serveur ; un champ vidé est envoyé à `null`
   * (c'est ce que le serveur enregistre comme « vide »).
   */
  private corpsModification(): ConsultationModification {
    const corps: Record<string, string | boolean | null> = {};
    for (const [cle, valeur] of Object.entries(this.aplatir())) {
      if (valeur !== this.reference[cle]) {
        corps[cle] = valeur === '' ? null : valeur;
      }
    }
    return corps as ConsultationModification;
  }

  private reinitialiserMessages(): void {
    this.erreurGenerale.set(null);
    this.erreursChamps.set({});
    this.erreursAutres.set([]);
    this.succes.set(null);
  }

  enregistrer(): void {
    if (!this.modifiable() || this.enSoumission()) return;
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    this.reinitialiserMessages();
    this.enSoumission.set(true);

    const id = this.consultationId();
    if (id && Object.keys(this.corpsModification()).length === 0) {
      this.enSoumission.set(false);
      this.succes.set('Aucune modification à enregistrer.');
      return;
    }
    const appel = id
      ? this.consultationService.modifier(id, this.corpsModification())
      : this.consultationService.creer({
          ...this.corpsCreation(),
          patient_id: Number(this.formulaire.getRawValue().patientId),
          cabinet_id: Number(this.cabinetId),
        });

    appel.subscribe({
      next: (c) => {
        this.enSoumission.set(false);
        const etaitCreation = !id;
        this.consultationId.set(c.id);
        this.appliquerConsultation(c);
        this.succes.set(etaitCreation ? 'Consultation créée (en cours). Vous pouvez la modifier tant qu’elle n’est pas terminée.' : 'Modifications enregistrées.');
        if (etaitCreation) {
          void this.router.navigate([], { queryParams: { consultationId: c.id }, replaceUrl: true });
        }
      },
      error: (e: HttpErrorResponse) => {
        this.enSoumission.set(false);
        this.afficherErreur(e, "L'enregistrement a échoué");
      },
    });
  }

  demanderTerminer(): void {
    if (!this.consultationId() || !this.modifiable()) return;
    this.confirmationTerminer.set(true);
  }

  annulerTerminer(): void {
    this.confirmationTerminer.set(false);
  }

  /** Enregistre d'abord les modifications en attente, puis `PUT /terminer` : la consultation est verrouillée définitivement. */
  confirmerTerminer(): void {
    const id = this.consultationId();
    if (!id || !this.modifiable() || this.enTerminaison() || !this.confirmationTerminer()) return;
    if (this.formulaire.invalid) {
      this.confirmationTerminer.set(false);
      this.formulaire.markAllAsTouched();
      return;
    }
    this.reinitialiserMessages();
    this.enTerminaison.set(true);

    const modifications = this.corpsModification();
    const enregistrement$: Observable<unknown> =
      Object.keys(modifications).length > 0 ? this.consultationService.modifier(id, modifications) : of(null);
    enregistrement$.pipe(switchMap(() => this.consultationService.terminer(id))).subscribe({
      next: (c) => {
        this.enTerminaison.set(false);
        this.confirmationTerminer.set(false);
        this.appliquerConsultation(c);
        this.succes.set('Consultation terminée et verrouillée. Elle est maintenant en lecture seule.');
      },
      error: (e: HttpErrorResponse) => {
        this.enTerminaison.set(false);
        this.confirmationTerminer.set(false);
        this.afficherErreur(e, 'La clôture de la consultation a échoué');
      },
    });
  }

  /** 403 « Accès refusé. » ; 422 : `errors.consultation[0]` (verrouillée), erreurs par champ ; sinon message du serveur. */
  private afficherErreur(e: HttpErrorResponse, debut: string): void {
    if (e.status !== 422) {
      this.erreurGenerale.set(this.message(e, debut));
      return;
    }
    const champs = erreursParChamp(e);
    const sousChamp: Record<string, string> = {};
    const autres: string[] = [];
    for (const [cle, message] of Object.entries(champs)) {
      if (cle === 'consultation' || cle === 'general') {
        this.erreurGenerale.set(message);
      } else if (CHAMPS_FORMULAIRE.includes(cle)) {
        sousChamp[cle] = message;
      } else {
        autres.push(`${this.libelleChamp(cle)} : ${message}`);
      }
    }
    this.erreursChamps.set(sousChamp);
    this.erreursAutres.set(autres);
    if (!this.erreurGenerale() && autres.length === 0 && Object.keys(sousChamp).length === 0) {
      this.erreurGenerale.set(this.message(e, debut));
    }
  }

  /** `od_axe` → « Œil droit — axe » ; `plainte_autres` → « Plaintes — autres ». */
  private libelleChamp(cle: string): string {
    const oeil = cle.match(/^(od|og)_(.+)$/);
    if (oeil) return `${oeil[1] === 'od' ? 'Œil droit' : 'Œil gauche'} — ${LIBELLES_CHAMPS[oeil[2]] ?? oeil[2]}`;
    if (cle.startsWith('plainte_')) return `Plaintes — ${cle.slice(8).replace(/_/g, ' ')}`;
    return cle;
  }

  annuler(): void {
    const patientId = this.consultation()?.patientId ?? (this.formulaire.getRawValue().patientId || null);
    if (patientId) {
      void this.router.navigate(['/opticien/dossier-visuel-patient'], { queryParams: { patientId } });
    } else {
      void this.router.navigate(['/opticien/mes-patients']);
    }
  }
}
