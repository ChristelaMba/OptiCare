import { remplacerDatesBrutes } from './dates-fr';

describe('remplacerDatesBrutes', () => {
  it('« 2026-10-30 00:00:00 » → « 30 octobre 2026 » (message réel du serveur)', () => {
    expect(remplacerDatesBrutes('Votre RDV du 2026-10-30 00:00:00 à 14:30 est confirmé.')).toBe('Votre RDV du 30 octobre 2026 à 14:30 est confirmé.');
  });

  it('séparateur T, fractions de seconde et Z', () => {
    expect(remplacerDatesBrutes('Le 2026-02-01T09:15:00.000000Z.')).toBe('Le 1 février 2026.');
  });

  it('plusieurs dates dans un même message', () => {
    expect(remplacerDatesBrutes('Du 2026-08-03 10:00:00 au 2026-12-25 18:30:00')).toBe('Du 3 août 2026 au 25 décembre 2026');
  });

  it('texte sans date, heure seule ou date sans heure : inchangés', () => {
    expect(remplacerDatesBrutes('Votre RDV est confirmé à 14:30.')).toBe('Votre RDV est confirmé à 14:30.');
    expect(remplacerDatesBrutes('Rendez-vous le 2026-10-30.')).toBe('Rendez-vous le 2026-10-30.');
    expect(remplacerDatesBrutes('')).toBe('');
  });

  it('date impossible : laissée telle quelle', () => {
    expect(remplacerDatesBrutes('2026-13-45 00:00:00')).toBe('2026-13-45 00:00:00');
  });
});
