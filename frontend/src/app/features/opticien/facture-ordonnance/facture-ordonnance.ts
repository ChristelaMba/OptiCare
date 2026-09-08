import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

interface LigneFacture {
  id: number;
  description: string;
  quantite: number;
  montant: number;
}

interface Facture {
  id: string;
  numero: string;
  date: string;
  montantTotal: number;
  statut: 'emise' | 'payee';
  lignes: LigneFacture[];
}

interface Ordonnance {
  id: string;
  date: string;
  contenu: string;
}

@Component({
  selector: 'app-facture-ordonnance',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe
  ],
  templateUrl: './facture-ordonnance.html',
  styleUrl: './facture-ordonnance.css'
})
export class FactureOrdonnance implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /* =====================================================
     IDENTIFIANTS
  ===================================================== */

  ficheId = '';
  patientId = '';
  dossierVisuelId = '';

  /* =====================================================
     PATIENT
  ===================================================== */

  patientNom = signal('Jean Dupont');
  patientTelephone = signal('06 12 34 56 78');
  patientReference = signal('9482-A');

  /* =====================================================
     ONGLET
  ===================================================== */

  ongletActif = signal<'facture' | 'ordonnance'>('facture');

  /* =====================================================
     FACTURE
  ===================================================== */

  lignesFacture = signal<LigneFacture[]>([
    {
      id: 1,
      description: 'Monture optique',
      quantite: 1,
      montant: 45000
    },
    {
      id: 2,
      description: 'Verres progressifs',
      quantite: 1,
      montant: 85000
    },
    {
      id: 3,
      description: 'Traitement antireflet',
      quantite: 1,
      montant: 15000
    }
  ]);

  montantTotal = computed(() =>
    this.lignesFacture().reduce(
      (total, ligne) =>
        total + ligne.quantite * ligne.montant,
      0
    )
  );

  factures = signal<Facture[]>([
    {
      id: 'facture-001',
      numero: 'FAC-2026-001',
      date: '02/09/2026',
      montantTotal: 145000,
      statut: 'emise',
      lignes: []
    }
  ]);

  /* =====================================================
     ORDONNANCE
  ===================================================== */

  ordonnanceContenu = signal(
    `Verres progressifs personnalisés
Traitement antireflet Premium
Port permanent`
  );

  ordonnances = signal<Ordonnance[]>([
    {
      id: 'ordonnance-001',
      date: '02/09/2026',
      contenu: 'Verres progressifs personnalisés'
    }
  ]);

  /* =====================================================
     MESSAGES / ETATS
  ===================================================== */

  messageSucces = signal('');
  messageErreur = signal('');
  documentGenere = signal(false);

  /* =====================================================
     INITIALISATION
  ===================================================== */

  ngOnInit(): void {

    this.route.queryParamMap.subscribe(params => {

      this.ficheId =
        params.get('ficheId') ?? '';

      this.patientId =
        params.get('patientId') ?? '';

      this.dossierVisuelId =
        params.get('dossierVisuelId') ?? '';

      this.chargerPatient();

    });
  }

  /* =====================================================
     PATIENT MOCK
  ===================================================== */

  private chargerPatient(): void {

    const patients: Record<
      string,
      {
        nom: string;
        telephone: string;
        reference: string;
      }
    > = {

      'patient-001': {
        nom: 'Jean Dupont',
        telephone: '06 12 34 56 78',
        reference: '9482-A'
      },

      'patient-002': {
        nom: 'Alice Mbarga',
        telephone: '06 98 45 21 10',
        reference: '9482-B'
      },

      'patient-003': {
        nom: 'Paul Ndi',
        telephone: '06 55 32 14 87',
        reference: '9482-C'
      },

      'patient-004': {
        nom: 'Sophie Kamdem',
        telephone: '06 74 21 65 43',
        reference: '9482-D'
      },

      'patient-005': {
        nom: 'Michel Tchoumi',
        telephone: '06 82 11 43 90',
        reference: '9482-E'
      },

      'patient-006': {
        nom: 'Clara Ngono',
        telephone: '06 61 29 38 74',
        reference: '9482-F'
      }
    };

    const patient = patients[this.patientId];

    if (!patient) {
      return;
    }

    this.patientNom.set(patient.nom);
    this.patientTelephone.set(patient.telephone);
    this.patientReference.set(patient.reference);
  }

  /* =====================================================
     ONGLET
  ===================================================== */

  changerOnglet(
    onglet: 'facture' | 'ordonnance'
  ): void {

    this.ongletActif.set(onglet);

    this.messageSucces.set('');
    this.messageErreur.set('');
  }

  /* =====================================================
     FACTURE
  ===================================================== */

  ajouterLigne(): void {

    const lignes = this.lignesFacture();

    const nouvelleLigne: LigneFacture = {
      id: Date.now(),
      description: 'Nouvelle prestation',
      quantite: 1,
      montant: 0
    };

    this.lignesFacture.set([
      ...lignes,
      nouvelleLigne
    ]);
  }

  supprimerLigne(id: number): void {

    this.lignesFacture.update(
      lignes =>
        lignes.filter(ligne => ligne.id !== id)
    );
  }

  modifierDescription(
    id: number,
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;

    this.lignesFacture.update(lignes =>
      lignes.map(ligne =>
        ligne.id === id
          ? {
              ...ligne,
              description: input.value
            }
          : ligne
      )
    );
  }

  modifierQuantite(
    id: number,
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;

    const quantite =
      Math.max(1, Number(input.value) || 1);

    this.lignesFacture.update(lignes =>
      lignes.map(ligne =>
        ligne.id === id
          ? {
              ...ligne,
              quantite
            }
          : ligne
      )
    );
  }

  modifierMontant(
    id: number,
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;

    const montant =
      Math.max(0, Number(input.value) || 0);

    this.lignesFacture.update(lignes =>
      lignes.map(ligne =>
        ligne.id === id
          ? {
              ...ligne,
              montant
            }
          : ligne
      )
    );
  }

  /* =====================================================
     GENERER FACTURE
  ===================================================== */

  genererFacture(): void {

    this.messageErreur.set('');

    if (this.lignesFacture().length === 0) {

      this.messageErreur.set(
        'Ajoutez au moins une prestation à la facture.'
      );

      return;
    }

    const nouvelleFacture: Facture = {

      id: `facture-${Date.now()}`,

      numero:
        `FAC-${new Date().getFullYear()}-${String(
          this.factures().length + 1
        ).padStart(3, '0')}`,

      date:
        new Intl.DateTimeFormat('fr-FR').format(
          new Date()
        ),

      montantTotal:
        this.montantTotal(),

      statut: 'emise',

      lignes:
        this.lignesFacture().map(ligne => ({
          ...ligne
        }))
    };

    this.factures.update(
      factures => [
        nouvelleFacture,
        ...factures
      ]
    );

    this.documentGenere.set(true);

    this.messageSucces.set(
      'La facture a été générée avec succès.'
    );
  }

  /* =====================================================
     ORDONNANCE
  ===================================================== */

  modifierOrdonnance(event: Event): void {

    const textarea =
      event.target as HTMLTextAreaElement;

    this.ordonnanceContenu.set(
      textarea.value
    );
  }

  genererOrdonnance(): void {

    this.messageErreur.set('');

    if (
      !this.ordonnanceContenu()
        .trim()
    ) {

      this.messageErreur.set(
        'Veuillez renseigner le contenu de l’ordonnance.'
      );

      return;
    }

    const nouvelleOrdonnance: Ordonnance = {

      id: `ordonnance-${Date.now()}`,

      date:
        new Intl.DateTimeFormat('fr-FR').format(
          new Date()
        ),

      contenu:
        this.ordonnanceContenu()
    };

    this.ordonnances.update(
      ordonnances => [
        nouvelleOrdonnance,
        ...ordonnances
      ]
    );

    this.documentGenere.set(true);

    this.messageSucces.set(
      'L’ordonnance a été générée avec succès.'
    );
  }

  /* =====================================================
     GENERER ET ENVOYER AU PATIENT
  ===================================================== */

  genererEtEnvoyer(): void {

    this.messageErreur.set('');

    if (
      this.ongletActif() === 'facture'
    ) {

      if (this.lignesFacture().length === 0) {

        this.messageErreur.set(
          'Ajoutez au moins une prestation avant de générer la facture.'
        );

        return;
      }

      this.genererFacture();

    } else {

      this.genererOrdonnance();

    }

    if (!this.messageErreur()) {

      this.messageSucces.set(
        `${this.ongletActif() === 'facture'
          ? 'La facture'
          : 'L’ordonnance'
        } a été générée et rendue disponible pour le patient.`
      );

    }
  }

  /* =====================================================
     SUIVI DE COMMANDE
  ===================================================== */

  voirSuiviCommande(): void {

    this.messageErreur.set('');
    this.messageSucces.set('');

    this.router.navigate(
      ['/opticien/suivi-commande'],
      {
        queryParams: {
          patientId: this.patientId,
          dossierVisuelId: this.dossierVisuelId
        }
      }
    );
  }

  /* =====================================================
     RETOUR DOSSIER
  ===================================================== */

  retourPatient(): void {

    if (this.dossierVisuelId) {

      this.router.navigate(
        ['/opticien/dossier-visuel-patient'],
        {
          queryParams: {
            dossierVisuelId:
              this.dossierVisuelId
          }
        }
      );

      return;
    }

    this.router.navigate(
      ['/opticien/mes-patients']
    );
  }

  /* =====================================================
     RETOUR PATIENTS
  ===================================================== */

  retourPatients(): void {

    this.router.navigate(
      ['/opticien/mes-patients']
    );
  }

  /* =====================================================
     IMPRESSION
  ===================================================== */

  imprimer(): void {

    window.print();
  }

  /* =====================================================
     INITIALLES
  ===================================================== */

  initiales(): string {

    const nom =
      this.patientNom();

    const morceaux =
      nom
        .trim()
        .split(' ')
        .filter(Boolean);

    if (morceaux.length >= 2) {

      return (
        morceaux[0].charAt(0) +
        morceaux[morceaux.length - 1].charAt(0)
      ).toUpperCase();
    }

    return nom
      .substring(0, 2)
      .toUpperCase();
  }
}