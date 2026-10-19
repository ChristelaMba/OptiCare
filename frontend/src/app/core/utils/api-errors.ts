import { HttpErrorResponse } from '@angular/common/http';

/**
 * Forme d'erreur renvoyée par l'API réelle (Laravel), vérifiée en
 * conditions réelles le 07/09 :
 *
 *   422 → { status: "error", message: "Erreur de validation",
 *           errors: { email: ["Cet email est déjà utilisé"], telephone: [...] } }
 *   401 → { status: "error", message: "Erreur de connexion",
 *           errors: { telephone: ["Les identifiants sont incorrects."] } }
 */
interface CorpsErreurApi {
  status?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

/** Aplati les messages de `errors` (déjà en français côté back) en une seule chaîne. */
export function messagesValidationApi(erreur: HttpErrorResponse): string[] {
  const corps = erreur.error as CorpsErreurApi | null;
  if (!corps?.errors) {
    return [];
  }
  return Object.values(corps.errors).flat();
}

/**
 * Message d'erreur prêt à afficher pour les écrans d'inscription.
 * Priorité : messages de validation renvoyés par l'API (déjà lisibles) →
 * message générique.
 */
export function messageErreurInscription(erreur: HttpErrorResponse): string {
  const details = messagesValidationApi(erreur);
  if (details.length > 0) {
    return details.join(' ');
  }
  if (erreur.status === 0) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.';
  }
  return "Une erreur est survenue lors de la création du compte. Réessayez.";
}

/**
 * Message d'erreur pour une action métier (prise de rendez-vous, annulation…), d'après les formes de
 * ROUTES-API-LIONEL : 422 `errors.general` (chaîne) ou `errors.rdv[]` / `errors.<champ>[]` (tableaux) ;
 * 403 « Accès refusé ». Priorité : accès refusé → message du serveur → serveur injoignable → message générique.
 */
export function messageErreurApi(erreur: HttpErrorResponse, generique: string): string {
  if (erreur.status === 403) {
    return 'Accès refusé.';
  }
  const details = messagesValidationApi(erreur);
  if (details.length > 0) {
    return details.join(' ');
  }
  if (erreur.status === 0) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.';
  }
  return generique;
}

/**
 * Message d'erreur de connexion : `errors.telephone[0]` tel quel (identifiants incorrects, cabinet en
 * attente de validation, cabinet refusé… — ROUTES-API-LIONEL §1.3), sinon message générique.
 */
export function messageErreurConnexion(erreur: HttpErrorResponse): string {
  const corps = erreur.error as CorpsErreurApi | null;
  const message = corps?.errors?.['telephone']?.[0];
  if (message) {
    return message;
  }
  if (erreur.status === 0) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.';
  }
  return erreur.status === 401
    ? 'Identifiant ou mot de passe incorrect.'
    : 'Une erreur est survenue lors de la connexion. Réessayez.';
}
