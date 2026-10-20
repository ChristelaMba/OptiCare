import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { Auth } from '../../../core/services/auth';
import { CommandeService } from '../../../core/services/commande';
import { ConsultationService } from '../../../core/services/consultation';
import { PatientCabinet, PatientsCabinet } from '../../../core/services/patients-cabinet';
import { erreursParChamp, messageErreurApi } from '../../../core/utils/api-errors';
import { Commande, NouvelleCommandePayload, STATUTS_COMMANDE, StatutCommande } from '../../../models/commande.model';
import { ConsultationOpticien } from '../../../models/consultation.model';

const LIBELLE_STATUT: Record<StatutCommande, string> = {
  initie: 'Initiée',
  en_cours: 'En cours',
  en_verification: 'En vérification',
  termine: 'Terminée',
};

const DECIMAL = /^[+-]?\d+([.,]\d+)?$/;
const ENTIER = /^\d{1,3}$/;

const CHAMPS_FORMULAIRE = ['consultation_id', 'numero_monture', 'type_verre', 'teinte', 'description_foyers', 'port', 'antireflet', 'notes'];

interface LigneCommande {
  commande: Commande;
  patientId: string | null;
  patientNom: string | null;
}

/**
 * Suivi des commandes de l'opticien (20/10/2026), branché sur les routes réelles : `GET /cabinets/{id}/commandes`,
 * `POST /commandes`, `PATCH /commandes/{id}` (statut). `?patientId=` limite la liste aux commandes de ce patient (retrouvé
 * par la consultation de chaque commande : l'API ne renvoie pas le patient dans la commande). Aucune donnée en dur :
 * le patient vient de `GET /cabinets/{id}/patients/{patientId}`.
 */
@Component({
  selector: 'app-suivi-commande',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './suivi-commande.html',
  styleUrl: '../documents-opticien.css',
})
export class SuiviCommande implements OnInit {
  private readonly auth = inject(Auth);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly commandeService = inject(CommandeService);
  private readonly consultationService = inject(ConsultationService);
  private readonly patientsService = inject(PatientsCabinet);

  private readonly cabinetId = this.auth.utilisateur()?.cabinetId ?? '';

  readonly statuts = STATUTS_COMMANDE;
  readonly libelleStatut = LIBELLE_STATUT;

  patientId = '';
  readonly patient = signal<PatientCabinet | null>(null);
  readonly commandes = signal<Commande[]>([]);
  readonly consultations = signal<ConsultationOpticien[]>([]);

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly filtreStatut = signal<StatutCommande | 'tous'>('tous');

  readonly selection = signal<Commande | null>(null);
  readonly statutChoisi = signal<StatutCommande>('initie');
  readonly enCours = signal(false);
  readonly erreurAction = signal<string | null>(null);
  readonly succes = signal<string | null>(null);

  readonly formulaireOuvert = signal(false);
  readonly erreurFormulaire = signal<string | null>(null);
  readonly erreursChamps = signal<Record<string, string>>({});
  readonly erreursAutres = signal<string[]>([]);

  readonly formulaire = this.fb.nonNullable.group({
    consultationId: ['', Validators.required],
    numeroMonture: [''],
    typeVerre: [''],
    teinte: [''],
    descriptionFoyers: [''],
    port: [''],
    antireflet: [false],
    od: this.groupeOeil(),
    og: this.groupeOeil(),
    notes: [''],
  });

  private groupeOeil() {
    return this.fb.nonNullable.group({
      sphere: ['', Validators.pattern(DECIMAL)],
      cylindre: ['', Validators.pattern(DECIMAL)],
      axe: ['', [Validators.pattern(ENTIER), Validators.min(0), Validators.max(180)]],
      addition: ['', Validators.pattern(DECIMAL)],
    });
  }

  private readonly consultationParId = computed(() => new Map(this.consultations().map((c) => [c.id, c])));

  /** Commandes affichées : filtre patient (si `?patientId=`) et filtre de statut, avec le patient retrouvé par la consultation. */
  readonly lignes = computed<LigneCommande[]>(() => {
    const statut = this.filtreStatut();
    return this.commandes()
      .map((commande) => {
        const consultation = this.consultationParId().get(commande.consultationId);
        return { commande, patientId: consultation?.patientId ?? null, patientNom: consultation?.patientNom ?? null };
      })
      .filter((l) => !this.patientId || l.patientId === this.patientId)
      .filter((l) => statut === 'tous' || l.commande.statut === statut);
  });

  readonly aucuneCommande = computed(() => this.commandes().length === 0);

  /** Consultations proposées pour une nouvelle commande (celles du patient si `?patientId=`). */
  readonly consultationsProposees = computed(() =>
    this.consultations().filter((c) => !this.patientId || c.patientId === this.patientId),
  );

  ngOnInit(): void {
    this.patientId = this.route.snapshot.queryParamMap.get('patientId') ?? '';
    if (!this.cabinetId) {
      this.chargement.set(false);
      this.erreur.set("Aucun cabinet rattaché à ce compte — impossible d'afficher les commandes.");
      return;
    }

    if (this.patientId) {
      this.patientsService.obtenir(this.cabinetId, this.patientId).subscribe({
        next: (p) => this.patient.set(p),
        error: (e: HttpErrorResponse) => this.erreur.set(this.message(e, 'Impossible de charger le patient')),
      });
    }

    // Les consultations servent à retrouver le patient de chaque commande ; leur échec ne bloque pas la liste.
    this.consultationService.listerParCabinet(this.cabinetId).subscribe({
      next: (c) => this.consultations.set(c),
    });

    this.commandeService.listerParCabinet(this.cabinetId).subscribe({
      next: (c) => {
        this.commandes.set([...c].sort((a, b) => Number(b.id) - Number(a.id)));
        this.chargement.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.chargement.set(false);
        this.erreur.set(this.message(e, 'Impossible de charger les commandes'));
      },
    });
  }

  /** « Accès refusé. » sur 403, sinon erreurs 422 du serveur, sinon message générique complété du message serveur. */
  private message(e: HttpErrorResponse, debut: string): string {
    const messageServeur = (e.error as { message?: string } | null)?.message;
    return messageErreurApi(e, `${debut}.${messageServeur ? ` Le serveur répond : ${messageServeur}` : ' Réessayez plus tard.'}`);
  }

  selectionner(commande: Commande): void {
    this.selection.set(commande);
    this.statutChoisi.set(commande.statut);
    this.erreurAction.set(null);
    this.succes.set(null);
  }

  fermerDetail(): void {
    this.selection.set(null);
  }

  nomConsultation(c: ConsultationOpticien): string {
    return `Consultation n°${c.id} du ${c.date.split('-').reverse().join('/')} — ${c.patientNom ?? 'patient inconnu'} (${c.statut === 'terminee' ? 'terminée' : 'en cours'})`;
  }

  /** `PATCH /commandes/{id}` avec le nouveau statut ; une commande terminée n'est plus modifiable (422 côté serveur). */
  changerStatut(): void {
    const commande = this.selection();
    if (!commande || !commande.modifiable || this.enCours() || this.statutChoisi() === commande.statut) return;
    this.enCours.set(true);
    this.erreurAction.set(null);
    this.succes.set(null);

    this.commandeService.changerStatut(commande.id, this.statutChoisi()).subscribe({
      next: (maj) => {
        this.enCours.set(false);
        this.commandes.update((liste) => liste.map((c) => (c.id === maj.id ? maj : c)));
        this.selection.set(maj);
        this.statutChoisi.set(maj.statut);
        this.succes.set(`Statut mis à jour : ${LIBELLE_STATUT[maj.statut]}.`);
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        this.erreurAction.set(this.messageStatut(e));
      },
    });
  }

  /** 422 : `errors.commande[0]` / `errors.statut[0]` du serveur (ex. commande terminée), 403 « Accès refusé. ». */
  private messageStatut(e: HttpErrorResponse): string {
    return this.message(e, "Le changement de statut a échoué");
  }

  ouvrirFormulaire(): void {
    this.formulaire.reset({
      consultationId: this.consultationsProposees().length === 1 ? this.consultationsProposees()[0].id : '',
      antireflet: false,
    });
    this.erreurFormulaire.set(null);
    this.erreursChamps.set({});
    this.erreursAutres.set([]);
    this.succes.set(null);
    this.formulaireOuvert.set(true);
  }

  fermerFormulaire(): void {
    this.formulaireOuvert.set(false);
  }

  private payload(): NouvelleCommandePayload {
    const v = this.formulaire.getRawValue();
    const t = (s: unknown) => String(s ?? '').trim();
    const dec = (s: unknown) => t(s).replace(',', '.');
    const corps: NouvelleCommandePayload = { consultation_id: Number(v.consultationId), antireflet: v.antireflet };
    const ajouter = (cle: keyof NouvelleCommandePayload, valeur: string) => {
      if (valeur !== '') (corps as unknown as Record<string, unknown>)[cle] = valeur;
    };
    ajouter('numero_monture', t(v.numeroMonture));
    ajouter('type_verre', t(v.typeVerre));
    ajouter('teinte', t(v.teinte));
    ajouter('description_foyers', t(v.descriptionFoyers));
    ajouter('port', t(v.port));
    ajouter('diag_od_sphere', dec(v.od.sphere));
    ajouter('diag_od_cylindre', dec(v.od.cylindre));
    ajouter('diag_od_axe', t(v.od.axe));
    ajouter('diag_od_addition', dec(v.od.addition));
    ajouter('diag_og_sphere', dec(v.og.sphere));
    ajouter('diag_og_cylindre', dec(v.og.cylindre));
    ajouter('diag_og_axe', t(v.og.axe));
    ajouter('diag_og_addition', dec(v.og.addition));
    ajouter('notes', t(v.notes));
    return corps;
  }

  creer(): void {
    if (this.enCours()) return;
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    this.enCours.set(true);
    this.erreurFormulaire.set(null);
    this.erreursChamps.set({});
    this.erreursAutres.set([]);

    this.commandeService.creer(this.payload()).subscribe({
      next: (commande) => {
        this.enCours.set(false);
        this.commandes.update((liste) => [commande, ...liste]);
        this.formulaireOuvert.set(false);
        this.selectionner(commande);
        this.succes.set('Commande créée (statut « Initiée »).');
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status !== 422) {
          this.erreurFormulaire.set(this.message(e, 'La création de la commande a échoué'));
          return;
        }
        const champs = erreursParChamp(e);
        const sousChamp: Record<string, string> = {};
        const autres: string[] = [];
        for (const [cle, texte] of Object.entries(champs)) {
          if (CHAMPS_FORMULAIRE.includes(cle)) sousChamp[cle] = texte;
          else if (cle === 'general' || cle === 'commande' || cle === 'consultation') this.erreurFormulaire.set(texte);
          else autres.push(`${cle} : ${texte}`);
        }
        this.erreursChamps.set(sousChamp);
        this.erreursAutres.set(autres);
        if (!this.erreurFormulaire() && autres.length === 0 && Object.keys(sousChamp).length === 0) {
          this.erreurFormulaire.set(this.message(e, 'La création de la commande a échoué'));
        }
      },
    });
  }
}
