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

/**
 * Erreurs de validation 422 champ par champ : `errors.<champ>[0]` (ou la chaîne de `errors.general`). Sert aux
 * formulaires qui affichent chaque message sous son champ.
 */
export function erreursParChamp(erreur: HttpErrorResponse): Record<string, string> {
  const errors = (erreur.error as { errors?: Record<string, string[] | string> } | null)?.errors;
  const resultat: Record<string, string> = {};
  if (!errors || erreur.status !== 422) {
    return resultat;
  }
  for (const [champ, valeur] of Object.entries(errors)) {
    resultat[champ] = Array.isArray(valeur) ? valeur.join(' ') : String(valeur);
  }
  return resultat;
}

/**
 * Message d'erreur d'un téléchargement (`responseType: 'blob'`) : le corps d'une erreur est alors un `Blob`, lu comme
 * texte JSON (`errors.*` ou `message`). 403 → « Accès refusé. » ; corps non JSON (ex. page HTML d'un 500) → message
 * générique avec le code HTTP.
 */
export async function messageErreurTelechargement(erreur: HttpErrorResponse, generique: string): Promise<string> {
  if (erreur.status === 403) {
    return 'Accès refusé.';
  }
  if (erreur.status === 0) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.';
  }
  let corps: unknown = erreur.error;
  if (corps instanceof Blob) {
    try {
      corps = JSON.parse(await corps.text());
    } catch {
      return `${generique} (erreur serveur ${erreur.status}).`;
    }
  }
  const json = corps as CorpsErreurApi | null;
  const details = json?.errors ? Object.values(json.errors).flat().map(String) : [];
  if (details.length) return details.join(' ');
  if (json?.message) return `${generique} Le serveur répond : ${json.message}`;
  return `${generique} (erreur serveur ${erreur.status}).`;
}
