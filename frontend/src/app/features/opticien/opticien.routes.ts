import { Routes } from '@angular/router';
import { DossierVisuelPatient } from './dossier-visuel-patient/dossier-visuel-patient';
import { NouvelleFicheConsultation } from './nouvelle-fiche-consultation/nouvelle-fiche-consultation';
import { SuiviCommande } from './suivi-commande/suivi-commande';
import { FactureOrdonnance } from './facture-ordonnance/facture-ordonnance';

export const OPTICIEN_ROUTES: Routes = [
  { path: 'dossier-visuel-patient/:patientId', component: DossierVisuelPatient },
  { path: 'nouvelle-fiche-consultation/:patientId', component: NouvelleFicheConsultation },
  { path: 'suivi-commande/:commandeId', component: SuiviCommande },
  { path: 'facture-ordonnance/:ficheId', component: FactureOrdonnance },
];