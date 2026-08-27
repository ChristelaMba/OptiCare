 import { Component, computed, signal } from '@angular/core';

interface RendezVous {
  id: number;
  heure: string;
  duree: string;
  patient: string;
  motif: string;
  statut: 'confirmé' | 'attente' | 'annulé' | 'honoré';
  dossier?: string;
  telephone?: string;
}

@Component({
  selector: 'app-agenda',
  standalone: true,
  templateUrl: './agenda.html',
  styleUrl: './agenda.css'
})
export class Agenda {

  dateActuelle = signal(new Date());

  vueActive = signal<'jour' | 'semaine'>('jour');

  rendezVous = signal<RendezVous[]>([
    {
      id: 1,
      heure: '08:30',
      duree: '30 min',
      patient: 'Jean Dupont',
      motif: 'Consultation de suivi · Rétine',
      statut: 'confirmé',
      dossier: '#4829',
      telephone: '+237 6 90 12 34 56'
    },
    {
      id: 2,
      heure: '09:15',
      duree: '45 min',
      patient: 'Marie Curie',
      motif: 'Bilan visuel complet · Nouveau patient',
      statut: 'attente',
      telephone: '+237 6 77 45 21 08'
    },
    {
      id: 3,
      heure: '10:00',
      duree: '15 min',
      patient: 'Lucas Martin',
      motif: 'Renouvellement ordonnance',
      statut: 'annulé',
      dossier: '#4712'
    },
    {
      id: 4,
      heure: '11:30',
      duree: '30 min',
      patient: 'Sophie Bernard',
      motif: 'Contrôle visuel annuel',
      statut: 'confirmé',
      dossier: '#4918'
    },
    {
      id: 5,
      heure: '14:00',
      duree: '45 min',
      patient: 'Paul Ngono',
      motif: 'Première consultation',
      statut: 'confirmé',
      telephone: '+237 6 99 32 11 45'
    },
    {
      id: 6,
      heure: '15:30',
      duree: '30 min',
      patient: 'Claire Mbarga',
      motif: 'Contrôle après équipement',
      statut: 'attente',
      dossier: '#4982'
    }
  ]);

  rendezVousActif = signal<RendezVous | null>(null);

  dateFormatee = computed(() => {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(this.dateActuelle());
  });

  nombreConfirmes = computed(() =>
    this.rendezVous().filter(r => r.statut === 'confirmé').length
  );

  nombreAttente = computed(() =>
    this.rendezVous().filter(r => r.statut === 'attente').length
  );

  nombreAnnules = computed(() =>
    this.rendezVous().filter(r => r.statut === 'annulé').length
  );

  ouvrirDetails(rdv: RendezVous): void {
    this.rendezVousActif.set(rdv);
  }

  fermerDetails(): void {
    this.rendezVousActif.set(null);
  }

  changerJour(direction: number): void {
    const nouvelleDate = new Date(this.dateActuelle());

    nouvelleDate.setDate(
      nouvelleDate.getDate() + direction
    );

    this.dateActuelle.set(nouvelleDate);
  }

  allerAujourdHui(): void {
    this.dateActuelle.set(new Date());
  }

  changerVue(vue: 'jour' | 'semaine'): void {
    this.vueActive.set(vue);
  }

  statutLabel(statut: RendezVous['statut']): string {
    switch (statut) {
      case 'confirmé':
        return 'Confirmé';

      case 'attente':
        return 'En attente';

      case 'annulé':
        return 'Annulé';

      case 'honoré':
        return 'Honoré';
    }
  }

  confirmerRendezVous(): void {
    const rdv = this.rendezVousActif();

    if (!rdv) {
      return;
    }

    this.rendezVous.update(liste =>
      liste.map(item =>
        item.id === rdv.id
          ? { ...item, statut: 'confirmé' }
          : item
      )
    );

    this.rendezVousActif.set({
      ...rdv,
      statut: 'confirmé'
    });
  }

  annulerRendezVous(): void {
    const rdv = this.rendezVousActif();

    if (!rdv) {
      return;
    }

    this.rendezVous.update(liste =>
      liste.map(item =>
        item.id === rdv.id
          ? { ...item, statut: 'annulé' }
          : item
      )
    );

    this.rendezVousActif.set({
      ...rdv,
      statut: 'annulé'
    });
  }

  marquerHonore(): void {
    const rdv = this.rendezVousActif();

    if (!rdv) {
      return;
    }

    this.rendezVous.update(liste =>
      liste.map(item =>
        item.id === rdv.id
          ? { ...item, statut: 'honoré' }
          : item
      )
    );

    this.rendezVousActif.set({
      ...rdv,
      statut: 'honoré'
    });
  }
}