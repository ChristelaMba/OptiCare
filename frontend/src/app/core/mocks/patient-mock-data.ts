import { Patient } from '../../models/patient.model';

/**
 * OUTIL DE DEV UNIQUEMENT — jeu de patients factices, utilisé par
 * `mock-patient-interceptor.ts` tant que le back-end n'est pas branché.
 * `dossierVisuelId` est la valeur qui compte ici : c'est elle que
 * nouvelle-fiche-consultation.ts résout désormais via
 * PatientService.getPatientById() au lieu du placeholder patientId
 * (voir JOURNAL-MODIFICATIONS-PARTAGEES.md). À retirer une fois l'API
 * réelle disponible.
 */
export let patientsFactices: Patient[] = [
  {
    id: 'patient-042',
    dossierVisuelId: 'dv-042',
    estUtilisateur: false,
    cabinetCreateurId: 'cab-004',
    nom: 'Dupont',
    prenom: 'Jean',
    age: 45,
    sexe: 'M',
    telephone: '+237 6 12 34 56 78',
    quartier: 'Bonanjo',
  },
  {
    id: 'patient-043',
    dossierVisuelId: 'dv-043',
    estUtilisateur: false,
    cabinetCreateurId: 'cab-004',
    nom: 'Fabre',
    prenom: 'Sophie',
    age: 32,
    sexe: 'F',
    telephone: '+237 6 98 76 54 32',
    quartier: 'Akwa',
  },
];
