import { Routes } from '@angular/router';
import { DossierVisuelPatient } from './dossier-visuel-patient/dossier-visuel-patient';
import { NouvelleFicheConsultation } from './nouvelle-fiche-consultation/nouvelle-fiche-consultation';
import { SuiviCommande } from './suivi-commande/suivi-commande';
import { FactureOrdonnance } from './facture-ordonnance/facture-ordonnance';

export const OPTICIEN_ROUTES: Routes = [
  // 2026-09-03 : route par défaut manquante — contrairement aux 4 autres
  // rôles (patient/secretaire/proprietaire/super-admin), aucun écran
  // Opticien ne fonctionne sans un id en paramètre (§9.5 du cahier des
  // charges ne décrit aucun tableau de bord Opticien). 'dv1' est le
  // dossierVisuelId de démo déjà utilisé ailleurs dans les mocks
  // (fiche-consultation-mock-data.ts, valeur de repli de
  // dossier-visuel-patient.ts) — redirection artificielle mais
  // fonctionnelle, à revoir le jour où un vrai écran d'accueil Opticien
  // existe. Voir JOURNAL-MODIFICATIONS-PARTAGEES.md.
  { path: '', redirectTo: 'dossier-visuel-patient/dv1', pathMatch: 'full' },
  { path: 'dossier-visuel-patient/:dossierVisuelId', component: DossierVisuelPatient },
  { path: 'nouvelle-fiche-consultation/:dossierVisuelId', component: NouvelleFicheConsultation },
  { path: 'suivi-commande/:commandeId', component: SuiviCommande },
  { path: 'facture-ordonnance/:ficheId', component: FactureOrdonnance },
];