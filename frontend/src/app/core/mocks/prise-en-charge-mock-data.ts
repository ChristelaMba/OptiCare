import { PriseEnCharge } from '../../models/prise-en-charge.model';

/**
 * OUTIL DE DEV UNIQUEMENT — jeu de prises en charge factices, utilisé par
 * `mock-prise-en-charge-interceptor.ts` tant que le back-end n'est pas
 * branché. Voir POINTS-A-CONFIRMER-BACKEND.md, point 0 : les routes
 * `/prises-en-charge` sont une hypothèse complète, non confirmée. Vide au
 * démarrage — peuplé au runtime par `PriseEnCharge.creer()` (contrairement
 * à `rendez-vous-mock-data.ts`, il n'y a pas de jeu de données de départ à
 * charger : chaque fiche de consultation ouvre sa propre prise en charge).
 * À retirer une fois l'API réelle disponible.
 */
export let prisesEnChargeFactices: PriseEnCharge[] = [];
