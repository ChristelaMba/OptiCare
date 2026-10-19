import { Commande } from '../../models/commande.model';

/**
 * OUTIL DE DEV UNIQUEMENT — jeu de commandes factices utilisé par
 * `mock-commande-interceptor.ts` tant que le back-end n'est pas branché.
 * 3 statuts différents pour pouvoir tester la progression du statut sur
 * `suivi-commande.ts`. `patientId` reprend volontairement les patients de
 * `patient-mock-data.ts` (patient-042/043) pour que le rappel patient de
 * l'écran se résolve réellement. `priseEnChargeId` en revanche ne pointe
 * vers rien de résolvable : `prise-en-charge-mock-data.ts` démarre vide et
 * n'est peuplé qu'au runtime par un vrai passage dans
 * nouvelle-fiche-consultation.ts — attendu, voir suivi-commande.ts (la
 * prise en charge liée n'est affichée qu'en référence, jamais re-fetchée).
 * À retirer une fois l'API réelle disponible.
 */
export let commandesFactices: Commande[] = [
  {
    id: 'cmd-001',
    priseEnChargeId: 'pec-demo-001',
    cabinetId: 'cab-004',
    patientId: 'patient-042',
    numeroMonture: 'MT-2201',
    typeVerre: 'Unifocal',
    teinte: 'Neutre',
    descriptionFoyers: 'Foyer unique',
    port: 'Permanent',
    antireflet: 'Oui',
    autresDetails: 'Écart pupillaire 62 mm',
    diagnosticOeilDroit: { sphere: -1.25, cylindre: -0.5, axe: 180, addition: 0 },
    diagnosticOeilGauche: { sphere: -1, cylindre: -0.25, axe: 170, addition: 0 },
    statut: 'initie',
    modifieParId: 'opticien-001',
    dateInitiation: new Date('2026-08-28T09:15:00'),
    dateDerniereMiseAJour: new Date('2026-08-28T09:15:00'),
    notificationEnvoyee: false,
  },
  {
    id: 'cmd-002',
    priseEnChargeId: 'pec-demo-002',
    cabinetId: 'cab-004',
    patientId: 'patient-043',
    numeroMonture: 'MT-1187',
    typeVerre: 'Progressif',
    teinte: 'Photochromique',
    descriptionFoyers: 'Double foyer, transition douce',
    port: 'Permanent',
    antireflet: 'Oui',
    autresDetails: 'Épaisseur réduite demandée',
    diagnosticOeilDroit: { sphere: -2.5, cylindre: -0.75, axe: 90, addition: 1.5 },
    diagnosticOeilGauche: { sphere: -2.25, cylindre: -0.5, axe: 85, addition: 1.5 },
    statut: 'enCours',
    modifieParId: 'opticien-001',
    dateInitiation: new Date('2026-08-25T14:00:00'),
    dateDerniereMiseAJour: new Date('2026-08-27T11:30:00'),
    notificationEnvoyee: false,
  },
  {
    id: 'cmd-003',
    priseEnChargeId: 'pec-demo-003',
    cabinetId: 'cab-004',
    patientId: 'patient-042',
    numeroMonture: 'MT-0954',
    typeVerre: 'Bifocal',
    teinte: 'Léger gris 15%',
    descriptionFoyers: 'Bifocal, segment rond',
    port: 'Occasionnel',
    antireflet: 'Non',
    autresDetails: 'Monture apportée par le patient',
    diagnosticOeilDroit: { sphere: 0.75, cylindre: 0, axe: 0, addition: 2 },
    diagnosticOeilGauche: { sphere: 1, cylindre: -0.25, axe: 15, addition: 2 },
    statut: 'enVerification',
    modifieParId: 'opticien-001',
    dateInitiation: new Date('2026-08-19T10:00:00'),
    dateDerniereMiseAJour: new Date('2026-08-26T16:45:00'),
    notificationEnvoyee: false,
  },
];
