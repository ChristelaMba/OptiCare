import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Auth } from '../../../core/services/auth';
import { CommandeService } from '../../../core/services/commande';
import { ConsultationService } from '../../../core/services/consultation';
import { FactureService } from '../../../core/services/facture';
import { OrdonnanceService } from '../../../core/services/ordonnance';
import { PatientCabinet, PatientsCabinet } from '../../../core/services/patients-cabinet';
import { erreursParChamp, messageErreurApi } from '../../../core/utils/api-errors';
import { formaterFcfa } from '../../../core/utils/montant';
import { Commande } from '../../../models/commande.model';
import { ConsultationOpticien } from '../../../models/consultation.model';
import { Facture, NouvelleFacturePayload, STATUTS_FACTURE, StatutFacture, TYPES_FACTURE, TypeFacture } from '../../../models/facture.model';
import { NouvelleOrdonnancePayload, Ordonnance } from '../../../models/ordonnance.model';

const DECIMAL = /^[+-]?\d+([.,]\d+)?$/;
const ENTIER_AXE = /^\d{1,3}$/;
const MONTANT = /^\d+$/;

const LIBELLE_STATUT: Record<StatutFacture, string> = { impaye: 'Impayée', partiel: 'Partielle', paye: 'Payée', annule: 'Annulée' };
const LIBELLE_TYPE: Record<TypeFacture, string> = { acompte: 'Acompte', solde: 'Solde', unique: 'Facture unique' };

function aujourdHui(decalageAnnees = 0): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + decalageAnnees);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

/**
 * Ordonnances et factures de l'opticien (20/10/2026), branchées sur les routes réelles (§10 et §11).
 * Plus aucune donnée en dur : le patient vient de `GET /cabinets/{id}/patients/{patientId}` (`?patientId=`), les
 * numéros ORD-… / FAC-… sont ceux du serveur, les montants sont en francs CFA sans décimales.
 * Boutons retirés (aucune route) : impression, PDF, brouillon local, lignes de facture libres.
 */
@Component({
  selector: 'app-facture-ordonnance',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './facture-ordonnance.html',
  styleUrl: '../documents-opticien.css',
})
export class FactureOrdonnance implements OnInit {
  private readonly auth = inject(Auth);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly ordonnanceService = inject(OrdonnanceService);
  private readonly factureService = inject(FactureService);
  private readonly commandeService = inject(CommandeService);
  private readonly consultationService = inject(ConsultationService);
  private readonly patientsService = inject(PatientsCabinet);

  private readonly cabinetId = this.auth.utilisateur()?.cabinetId ?? '';

  readonly formaterFcfa = formaterFcfa;
  readonly libelleStatut = LIBELLE_STATUT;
  readonly libelleType = LIBELLE_TYPE;
  readonly statutsFacture = STATUTS_FACTURE;
  readonly typesFacture = TYPES_FACTURE;

  patientId = '';
  readonly patient = signal<PatientCabinet | null>(null);
  readonly onglet = signal<'ordonnances' | 'factures'>('ordonnances');

  readonly ordonnances = signal<Ordonnance[]>([]);
  readonly factures = signal<Facture[]>([]);
  readonly commandes = signal<Commande[]>([]);
  readonly consultations = signal<ConsultationOpticien[]>([]);

  readonly chargementOrdonnances = signal(true);
  readonly chargementFactures = signal(true);
  readonly erreurOrdonnances = signal<string | null>(null);
  readonly erreurFactures = signal<string | null>(null);
  readonly erreurGlobale = signal<string | null>(null);
  readonly succes = signal<string | null>(null);

  readonly filtreStatut = signal<StatutFacture | ''>('');
  readonly recherche = signal('');

  // ---- ordonnance ----
  readonly formulaireOrdonnanceOuvert = signal(false);
  readonly envoiOrdonnance = signal(false);
  readonly erreurFormOrdonnance = signal<string | null>(null);
  readonly erreursOrdonnance = signal<string[]>([]);

  readonly formOrdonnance = this.fb.nonNullable.group({
    consultationId: ['', Validators.required],
    od: this.groupeOeil(),
    og: this.groupeOeil(),
    ecartPupillaire: [''],
    recommandations: [''],
    dateEmission: [aujourdHui()],
    dateValidite: [aujourdHui(1)],
  });

  // ---- facture ----
  readonly formulaireFactureOuvert = signal(false);
  readonly envoiFacture = signal(false);
  readonly erreurFormFacture = signal<string | null>(null);
  readonly erreursChampsFacture = signal<Record<string, string>>({});

  readonly formFacture = this.fb.nonNullable.group({
    commandeId: ['', Validators.required],
    type: ['acompte' as TypeFacture, Validators.required],
    montant: ['', [Validators.required, Validators.pattern(MONTANT)]],
    description: [''],
  });

  // ---- paiement ----
  readonly paiementOuvertPour = signal<string | null>(null);
  readonly montantPaiement = signal('');
  readonly paiementEnCours = signal(false);
  readonly erreurPaiement = signal<string | null>(null);

  private groupeOeil() {
    return this.fb.nonNullable.group({
      sphere: ['', Validators.pattern(DECIMAL)],
      cylindre: ['', Validators.pattern(DECIMAL)],
      axe: ['', [Validators.pattern(ENTIER_AXE), Validators.min(0), Validators.max(180)]],
      addition: ['', Validators.pattern(DECIMAL)],
    });
  }

  private readonly consultationParId = computed(() => new Map(this.consultations().map((c) => [c.id, c])));

  readonly ordonnancesAffichees = computed(() =>
    this.ordonnances().filter((o) => !this.patientId || o.patientId === this.patientId),
  );

  readonly facturesAffichees = computed(() => this.factures().filter((f) => !this.patientId || f.patientId === this.patientId));

  /** Consultations terminées sans ordonnance (une seule ordonnance par consultation). */
  readonly consultationsPourOrdonnance = computed(() => {
    const avecOrdonnance = new Set(this.ordonnances().map((o) => o.consultationId));
    return this.consultations().filter(
      (c) => c.statut === 'terminee' && !avecOrdonnance.has(c.id) && (!this.patientId || c.patientId === this.patientId),
    );
  });

  /** Commandes sur lesquelles émettre une facture (celles du patient si `?patientId=`). */
  readonly commandesPourFacture = computed(() =>
    this.commandes().filter((c) => !this.patientId || this.consultationParId().get(c.consultationId)?.patientId === this.patientId),
  );

  ngOnInit(): void {
    this.patientId = this.route.snapshot.queryParamMap.get('patientId') ?? '';
    if (!this.cabinetId) {
      this.chargementOrdonnances.set(false);
      this.chargementFactures.set(false);
      this.erreurGlobale.set("Aucun cabinet rattaché à ce compte — impossible d'afficher les documents.");
      return;
    }

    if (this.patientId) {
      this.patientsService.obtenir(this.cabinetId, this.patientId).subscribe({
        next: (p) => this.patient.set(p),
        error: (e: HttpErrorResponse) => this.erreurGlobale.set(this.message(e, 'Impossible de charger le patient')),
      });
    }

    this.consultationService.listerParCabinet(this.cabinetId).subscribe({ next: (c) => this.consultations.set(c) });
    this.commandeService.listerParCabinet(this.cabinetId).subscribe({ next: (c) => this.commandes.set(c) });

    this.ordonnanceService.listerParCabinet(this.cabinetId).subscribe({
      next: (o) => {
        this.ordonnances.set([...o].sort((a, b) => Number(b.id) - Number(a.id)));
        this.chargementOrdonnances.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.chargementOrdonnances.set(false);
        this.erreurOrdonnances.set(this.message(e, 'Impossible de charger les ordonnances'));
      },
    });
    this.chargerFactures();
  }

  /** « Accès refusé. » sur 403, sinon erreurs 422 du serveur, sinon message générique complété du message serveur. */
  private message(e: HttpErrorResponse, debut: string): string {
    const messageServeur = (e.error as { message?: string } | null)?.message;
    return messageErreurApi(e, `${debut}.${messageServeur ? ` Le serveur répond : ${messageServeur}` : ' Réessayez plus tard.'}`);
  }

  changerOnglet(onglet: 'ordonnances' | 'factures'): void {
    this.onglet.set(onglet);
    this.succes.set(null);
  }

  // ===================== FACTURES =====================

  chargerFactures(): void {
    this.chargementFactures.set(true);
    this.erreurFactures.set(null);
    const statut = this.filtreStatut();
    const search = this.recherche().trim();
    this.factureService
      .listerParCabinet(this.cabinetId, { ...(statut ? { statut } : {}), ...(search ? { search } : {}) })
      .subscribe({
        next: (f) => {
          this.factures.set([...f].sort((a, b) => Number(b.id) - Number(a.id)));
          this.chargementFactures.set(false);
        },
        error: (e: HttpErrorResponse) => {
          this.chargementFactures.set(false);
          this.erreurFactures.set(this.message(e, 'Impossible de charger les factures'));
        },
      });
  }

  filtrerStatut(valeur: string): void {
    this.filtreStatut.set(valeur as StatutFacture | '');
    this.chargerFactures();
  }

  rechercher(valeur: string): void {
    this.recherche.set(valeur);
    this.chargerFactures();
  }

  libelleCommande(c: Commande): string {
    const patient = this.consultationParId().get(c.consultationId)?.patientNom;
    return `Commande n°${c.id} — ${patient ?? 'patient inconnu'} — ${c.typeVerre || 'verre non précisé'}`;
  }

  ouvrirFormulaireFacture(): void {
    this.formFacture.reset({
      commandeId: this.commandesPourFacture().length === 1 ? this.commandesPourFacture()[0].id : '',
      type: 'acompte',
      montant: '',
      description: '',
    });
    this.erreurFormFacture.set(null);
    this.erreursChampsFacture.set({});
    this.succes.set(null);
    this.formulaireFactureOuvert.set(true);
  }

  fermerFormulaireFacture(): void {
    this.formulaireFactureOuvert.set(false);
  }

  creerFacture(): void {
    if (this.envoiFacture()) return;
    if (this.formFacture.invalid) {
      this.formFacture.markAllAsTouched();
      return;
    }
    const v = this.formFacture.getRawValue();
    const payload: NouvelleFacturePayload = {
      type: v.type,
      montant: Number(v.montant),
      ...(v.description.trim() ? { description: v.description.trim() } : {}),
    };
    this.envoiFacture.set(true);
    this.erreurFormFacture.set(null);
    this.erreursChampsFacture.set({});

    this.factureService.creer(v.commandeId, payload).subscribe({
      next: (f) => {
        this.envoiFacture.set(false);
        this.factures.update((liste) => [f, ...liste]);
        this.formulaireFactureOuvert.set(false);
        this.succes.set(`Facture ${f.numero} créée.`);
      },
      error: (e: HttpErrorResponse) => {
        this.envoiFacture.set(false);
        if (e.status !== 422) {
          this.erreurFormFacture.set(this.message(e, 'La création de la facture a échoué'));
          return;
        }
        const champs = erreursParChamp(e);
        const sousChamp: Record<string, string> = {};
        for (const [cle, texte] of Object.entries(champs)) {
          if (['type', 'montant', 'description'].includes(cle)) sousChamp[cle] = texte;
          else this.erreurFormFacture.set(texte);
        }
        this.erreursChampsFacture.set(sousChamp);
        if (!this.erreurFormFacture() && Object.keys(sousChamp).length === 0) {
          this.erreurFormFacture.set(this.message(e, 'La création de la facture a échoué'));
        }
      },
    });
  }

  ouvrirPaiement(f: Facture): void {
    this.paiementOuvertPour.set(f.id);
    this.montantPaiement.set('');
    this.erreurPaiement.set(null);
    this.succes.set(null);
  }

  fermerPaiement(): void {
    this.paiementOuvertPour.set(null);
  }

  /** `PUT /factures/{id}/paiement` : montant supérieur à 0 ; la ligne est remplacée par la réponse (cumul, solde, statut). */
  enregistrerPaiement(f: Facture): void {
    if (this.paiementEnCours()) return;
    const montant = this.montantPaiement().trim();
    if (!MONTANT.test(montant) || Number(montant) <= 0) {
      this.erreurPaiement.set('Saisissez un montant entier supérieur à 0 (en francs CFA).');
      return;
    }
    this.paiementEnCours.set(true);
    this.erreurPaiement.set(null);

    this.factureService.enregistrerPaiement(f.id, Number(montant)).subscribe({
      next: (maj) => {
        this.paiementEnCours.set(false);
        this.factures.update((liste) => liste.map((x) => (x.id === maj.id ? { ...maj, patientNom: maj.patientNom ?? x.patientNom } : x)));
        this.paiementOuvertPour.set(null);
        this.succes.set(`Paiement enregistré sur ${maj.numero} : solde restant ${formaterFcfa(maj.soldeRestant)}.`);
      },
      error: (e: HttpErrorResponse) => {
        this.paiementEnCours.set(false);
        const champs = erreursParChamp(e);
        this.erreurPaiement.set(Object.values(champs).join(' ') || this.message(e, "L'enregistrement du paiement a échoué"));
      },
    });
  }

  // ===================== ORDONNANCES =====================

  ouvrirFormulaireOrdonnance(): void {
    this.formOrdonnance.reset({ dateEmission: aujourdHui(), dateValidite: aujourdHui(1) });
    const propositions = this.consultationsPourOrdonnance();
    if (propositions.length === 1) {
      this.formOrdonnance.controls.consultationId.setValue(propositions[0].id);
      this.preremplirDepuisConsultation(propositions[0].id);
    }
    this.erreurFormOrdonnance.set(null);
    this.erreursOrdonnance.set([]);
    this.succes.set(null);
    this.formulaireOrdonnanceOuvert.set(true);
  }

  fermerFormulaireOrdonnance(): void {
    this.formulaireOrdonnanceOuvert.set(false);
  }

  nomConsultation(c: ConsultationOpticien): string {
    return `Consultation n°${c.id} du ${c.date.split('-').reverse().join('/')} — ${c.patientNom ?? 'patient inconnu'}`;
  }

  /** Reprend la prescription de la consultation choisie (valeurs réelles du serveur) comme base de l'ordonnance. */
  preremplirDepuisConsultation(consultationId: string): void {
    const c = this.consultationParId().get(consultationId);
    if (!c) return;
    const v = (s: string | null) => s ?? '';
    this.formOrdonnance.patchValue({
      od: { sphere: v(c.od.sphere), cylindre: v(c.od.cylindre), axe: v(c.od.axe), addition: v(c.od.addition) },
      og: { sphere: v(c.og.sphere), cylindre: v(c.og.cylindre), axe: v(c.og.axe), addition: v(c.og.addition) },
      ecartPupillaire: c.ecartPupillaire,
    });
  }

  creerOrdonnance(): void {
    if (this.envoiOrdonnance()) return;
    if (this.formOrdonnance.invalid) {
      this.formOrdonnance.markAllAsTouched();
      return;
    }
    const v = this.formOrdonnance.getRawValue();
    const t = (s: unknown) => String(s ?? '').trim();
    const dec = (s: unknown) => t(s).replace(',', '.');
    const corps: Record<string, string> = {};
    const ajouter = (cle: keyof NouvelleOrdonnancePayload, valeur: string) => {
      if (valeur !== '') corps[cle] = valeur;
    };
    ajouter('od_sphere', dec(v.od.sphere));
    ajouter('od_cylindre', dec(v.od.cylindre));
    ajouter('od_axe', t(v.od.axe));
    ajouter('od_addition', dec(v.od.addition));
    ajouter('og_sphere', dec(v.og.sphere));
    ajouter('og_cylindre', dec(v.og.cylindre));
    ajouter('og_axe', t(v.og.axe));
    ajouter('og_addition', dec(v.og.addition));
    ajouter('ecart_pupillaire', t(v.ecartPupillaire));
    ajouter('recommandations', t(v.recommandations));
    ajouter('date_emission', v.dateEmission);
    ajouter('date_validite', v.dateValidite);

    this.envoiOrdonnance.set(true);
    this.erreurFormOrdonnance.set(null);
    this.erreursOrdonnance.set([]);

    this.ordonnanceService.creer(v.consultationId, corps as NouvelleOrdonnancePayload).subscribe({
      next: (o) => {
        this.envoiOrdonnance.set(false);
        this.ordonnances.update((liste) => [{ ...o, patientNom: o.patientNom ?? this.consultationParId().get(o.consultationId)?.patientNom ?? null }, ...liste]);
        this.formulaireOrdonnanceOuvert.set(false);
        this.succes.set(`Ordonnance ${o.numero} créée.`);
      },
      error: (e: HttpErrorResponse) => {
        this.envoiOrdonnance.set(false);
        if (e.status !== 422) {
          this.erreurFormOrdonnance.set(this.message(e, "La création de l'ordonnance a échoué"));
          return;
        }
        // 422 : consultation non terminée, ordonnance déjà existante, ou champs refusés (un message par ligne).
        const messages = Object.entries(erreursParChamp(e)).map(([cle, texte]) => (['general', 'consultation', 'ordonnance'].includes(cle) ? texte : `${cle} : ${texte}`));
        this.erreursOrdonnance.set(messages.length ? messages : [this.message(e, "La création de l'ordonnance a échoué")]);
      },
    });
  }
}
