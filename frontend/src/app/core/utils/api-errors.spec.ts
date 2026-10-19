import { HttpErrorResponse } from '@angular/common/http';

import { messageErreurApi, erreursParChamp, messageErreurConnexion } from './api-errors';

function erreur(status: number, corps: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: corps });
}

describe('messageErreurApi', () => {
  it('422 : errors.general (chaîne) renvoyé tel quel', () => {
    const e = erreur(422, { status: 'error', message: 'Erreur lors de la prise de RDV', errors: { general: 'Ce créneau est déjà réservé.' } });

    expect(messageErreurApi(e, 'générique')).toBe('Ce créneau est déjà réservé.');
  });

  it('422 : errors.rdv[] (tableau) renvoyé tel quel', () => {
    const e = erreur(422, { status: 'error', message: 'Action impossible', errors: { rdv: ['Ce RDV est déjà annulé.'] } });

    expect(messageErreurApi(e, 'générique')).toBe('Ce RDV est déjà annulé.');
  });

  it('403 : « Accès refusé. » même si le serveur renvoie un autre détail', () => {
    const e = erreur(403, { status: 'error', message: 'Accès refusé', errors: { rdv: ["Vous n'êtes pas autorisé à accéder à ce RDV."] } });

    expect(messageErreurApi(e, 'générique')).toBe('Accès refusé.');
  });

  it('serveur injoignable, puis message générique', () => {
    expect(messageErreurApi(erreur(0, null), 'générique')).toContain('Impossible de joindre le serveur');
    expect(messageErreurApi(erreur(500, null), 'générique')).toBe('générique');
  });
});

describe('messageErreurConnexion', () => {
  it('401 : errors.telephone[0] tel quel (cabinet en attente)', () => {
    const e = erreur(401, {
      status: 'error',
      message: 'Erreur de connexion',
      errors: { telephone: ["Votre cabinet est en attente de validation par un administrateur."] },
    });

    expect(messageErreurConnexion(e)).toBe('Votre cabinet est en attente de validation par un administrateur.');
  });

  it('401 : identifiants incorrects du serveur tels quels', () => {
    const e = erreur(401, { status: 'error', message: 'Erreur de connexion', errors: { telephone: ['Les identifiants sont incorrects.'] } });

    expect(messageErreurConnexion(e)).toBe('Les identifiants sont incorrects.');
  });

  it('sans message serveur : repli générique', () => {
    expect(messageErreurConnexion(erreur(401, null))).toBe('Identifiant ou mot de passe incorrect.');
    expect(messageErreurConnexion(erreur(500, null))).toContain('Une erreur est survenue');
    expect(messageErreurConnexion(erreur(0, null))).toContain('Impossible de joindre le serveur');
  });

  it('erreursParChamp() : 422 → un message par champ ; autre statut → vide', () => {
    const e422 = new HttpErrorResponse({
      status: 422,
      error: { errors: { telephone: ['Déjà utilisé.', 'Format invalide.'], general: 'Quota atteint.' } },
    });
    expect(erreursParChamp(e422)).toEqual({ telephone: 'Déjà utilisé. Format invalide.', general: 'Quota atteint.' });
    expect(erreursParChamp(new HttpErrorResponse({ status: 500, error: { errors: { x: ['y'] } } }))).toEqual({});
  });
});
