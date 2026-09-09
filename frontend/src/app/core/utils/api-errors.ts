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
