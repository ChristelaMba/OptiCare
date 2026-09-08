import { FicheConsultationHistorique } from '../../models/fiche-consultation.model';

/**
 * OUTIL DE DEV UNIQUEMENT — historique factice utilisé par
 * `mock-fiche-consultation-interceptor.ts` pour
 * `GET /dossiers-visuels/{id}/consultations` (route hypothèse, voir
 * POINTS-A-CONFIRMER-BACKEND.md). Clé : dossierVisuelId. À retirer une
 * fois l'API réelle disponible.
 */
export const fichesHistoriqueFactices: Record<string, FicheConsultationHistorique[]> = {
  'dv1': [
    {
      id: 'fc-1',
      date: '2026-01-14',
      motif: 'Examen de la vue standard',
      modifiable: false,
      opticien: 'Dr. Marie Fotso',
      cabinet: 'OptiCare Centre',
      diagnostic: 'Presbytie débutante confirmée.'
    }
  ]
};
