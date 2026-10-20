import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SuperAdminDemo } from '../../../core/services/super-admin-demo';
import { ModeleMessage, ParametresGenerauxPlateforme } from '../../../models/super-admin.model';

type OngletParametres = 'general' | 'securite' | 'messages' | 'maintenance';

/**
 * Paramètres généraux (`/admin/parametres`), organisés en 4 onglets :
 * Général, Sécurité, Modèles de messages, Maintenance.
 *
 * Données **factices** fournies par `SuperAdminDemo` (aucune route serveur
 * pour cet écran). L'enregistrement est **local** : il met à jour le
 * formulaire et affiche un bandeau de confirmation, sans appel réseau.
 */
@Component({
  selector: 'app-parametres-generaux',
  imports: [FormsModule],
  templateUrl: './parametres-generaux.html',
  styleUrl: './parametres-generaux.css',
})
export class ParametresGeneraux implements OnInit {
  private readonly demo = inject(SuperAdminDemo);

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly succes = signal<string | null>(null);

  readonly ongletActif = signal<OngletParametres>('general');

  readonly onglets: { cle: OngletParametres; libelle: string; icone: string }[] = [
    { cle: 'general', libelle: 'Général', icone: 'tune' },
    { cle: 'securite', libelle: 'Sécurité', icone: 'shield' },
    { cle: 'messages', libelle: 'Modèles de messages', icone: 'mail' },
    { cle: 'maintenance', libelle: 'Maintenance', icone: 'build' },
  ];

  /** Paramètres édités (copie locale du jeu de démo). */
  readonly parametres = signal<ParametresGenerauxPlateforme>({
    nomPlateforme: '',
    emailSupport: '',
    devise: 'FCFA',
    delaiSessionMinutes: 60,
    doubleAuthentificationObligatoire: false,
    tentativesConnexionMax: 5,
    maintenanceActive: false,
    messageMaintenance: '',
  });

  readonly modeles = signal<ModeleMessage[]>([]);

  ngOnInit(): void {
    this.demo.obtenirParametres().subscribe({
      next: (parametres) => {
        this.parametres.set({ ...parametres });
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set('Impossible de charger les paramètres.');
      },
    });

    this.demo.listerModelesMessages().subscribe({
      next: (modeles) => this.modeles.set(modeles),
    });
  }

  changerOnglet(onglet: OngletParametres): void {
    this.ongletActif.set(onglet);
    this.succes.set(null);
  }

  /**
   * Applique une modification à un paramètre (mise à jour immuable).
   * `cle` est typée sur les clés modifiables pour éviter toute faute de frappe.
   */
  majParametre<K extends keyof ParametresGenerauxPlateforme>(cle: K, valeur: ParametresGenerauxPlateforme[K]): void {
    this.parametres.update((p) => ({ ...p, [cle]: valeur }));
    this.succes.set(null);
  }

  majModele(index: number, champ: 'objet' | 'corps', valeur: string): void {
    this.modeles.update((liste) => liste.map((m, i) => (i === index ? { ...m, [champ]: valeur } : m)));
    this.succes.set(null);
  }

  /**
   * Enregistrement **local** (aucune route serveur pour les paramètres).
   * Le bandeau de succès précise explicitement qu'aucune modification n'a
   * été transmise au serveur, pour ne pas induire l'utilisateur en erreur.
   */
  enregistrer(): void {
    this.succes.set('Paramètres enregistrés localement (aucune route serveur disponible pour l’instant).');
  }
}
