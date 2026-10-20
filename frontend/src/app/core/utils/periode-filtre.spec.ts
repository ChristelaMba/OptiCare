import { bornesPeriode, bornesSelection, cleDate, dateDansBornes, formaterDateFr, lundiDeLaSemaine } from './periode-filtre';

describe('periode-filtre', () => {
  // Mercredi 21 octobre 2026 (semaine du lundi 19 au dimanche 25).
  const mercredi = new Date(2026, 9, 21);

  describe('cleDate', () => {
    it('formate en AAAA-MM-JJ sans décalage de fuseau', () => {
      expect(cleDate(new Date(2026, 0, 5))).toBe('2026-01-05');
      expect(cleDate(mercredi)).toBe('2026-10-21');
    });

    it('ne recule pas d’un jour à minuit local (contrairement à toISOString)', () => {
      expect(cleDate(new Date(2026, 9, 1))).toBe('2026-10-01');
    });
  });

  describe('formaterDateFr', () => {
    it('convertit AAAA-MM-JJ en JJ/MM/AAAA', () => {
      expect(formaterDateFr('2026-10-21')).toBe('21/10/2026');
    });

    it('tolère un horodatage complet et les valeurs vides', () => {
      expect(formaterDateFr('2026-10-21T00:00:00.000000Z')).toBe('21/10/2026');
      expect(formaterDateFr(null)).toBe('');
      expect(formaterDateFr('')).toBe('');
    });
  });

  describe('lundiDeLaSemaine', () => {
    it('renvoie le lundi de la semaine, y compris un dimanche (semaine qui commence le lundi)', () => {
      expect(cleDate(lundiDeLaSemaine(mercredi))).toBe('2026-10-19');
      expect(cleDate(lundiDeLaSemaine(new Date(2026, 9, 25)))).toBe('2026-10-19'); // dimanche
      expect(cleDate(lundiDeLaSemaine(new Date(2026, 9, 19)))).toBe('2026-10-19'); // lundi
    });
  });

  describe('bornesPeriode', () => {
    it('« tous » ne borne rien', () => {
      expect(bornesPeriode('tous', mercredi)).toBeNull();
    });

    it('« jour » couvre uniquement aujourd’hui', () => {
      expect(bornesPeriode('jour', mercredi)).toEqual({ debut: '2026-10-21', fin: '2026-10-21' });
    });

    it('« semaine » couvre du lundi au dimanche', () => {
      expect(bornesPeriode('semaine', mercredi)).toEqual({ debut: '2026-10-19', fin: '2026-10-25' });
    });

    it('« mois » couvre le 1er au dernier jour du mois', () => {
      expect(bornesPeriode('mois', mercredi)).toEqual({ debut: '2026-10-01', fin: '2026-10-31' });
      // Février d'une année bissextile.
      expect(bornesPeriode('mois', new Date(2028, 1, 15))).toEqual({ debut: '2028-02-01', fin: '2028-02-29' });
    });

    it('« annee » couvre le 1er janvier au 31 décembre', () => {
      expect(bornesPeriode('annee', mercredi)).toEqual({ debut: '2026-01-01', fin: '2026-12-31' });
    });
  });

  describe('bornesSelection', () => {
    it('date précise : une seule journée', () => {
      expect(bornesSelection('date', { date: '2026-10-11' }, mercredi)).toEqual({ debut: '2026-10-11', fin: '2026-10-11' });
    });

    it('date précise vide : aucun filtre', () => {
      expect(bornesSelection('date', { date: '' }, mercredi)).toBeNull();
      expect(bornesSelection('date', {}, mercredi)).toBeNull();
    });

    it('plage : bornes inclusives dans l’ordre saisi', () => {
      expect(bornesSelection('plage', { debut: '2026-10-01', fin: '2026-10-15' }, mercredi)).toEqual({
        debut: '2026-10-01',
        fin: '2026-10-15',
      });
    });

    it('plage saisie à l’envers : remise dans l’ordre', () => {
      expect(bornesSelection('plage', { debut: '2026-10-20', fin: '2026-10-05' }, mercredi)).toEqual({
        debut: '2026-10-05',
        fin: '2026-10-20',
      });
    });

    it('plage incomplète : aucun filtre (saisie en cours)', () => {
      expect(bornesSelection('plage', { debut: '2026-10-01' }, mercredi)).toBeNull();
      expect(bornesSelection('plage', { fin: '2026-10-15' }, mercredi)).toBeNull();
    });

    it('période prédéfinie : délègue à bornesPeriode', () => {
      expect(bornesSelection('mois', {}, mercredi)).toEqual(bornesPeriode('mois', mercredi));
    });
  });

  describe('dateDansBornes', () => {
    it('sans bornes, tout passe', () => {
      expect(dateDansBornes('2026-10-21', null)).toBe(true);
      expect(dateDansBornes(null, null)).toBe(true);
    });

    it('bornes inclusives', () => {
      const bornes = { debut: '2026-10-01', fin: '2026-10-31' };
      expect(dateDansBornes('2026-10-01', bornes)).toBe(true);
      expect(dateDansBornes('2026-10-31', bornes)).toBe(true);
      expect(dateDansBornes('2026-11-01', bornes)).toBe(false);
      expect(dateDansBornes('2026-09-30', bornes)).toBe(false);
    });

    it('une date absente est exclue dès qu’un filtre est actif', () => {
      expect(dateDansBornes(null, { debut: '2026-10-01', fin: '2026-10-31' })).toBe(false);
      expect(dateDansBornes(undefined, { debut: '2026-10-01', fin: '2026-10-31' })).toBe(false);
    });

    it('accepte un horodatage complet', () => {
      expect(dateDansBornes('2026-10-21T00:00:00.000000Z', { debut: '2026-10-21', fin: '2026-10-21' })).toBe(true);
    });
  });
});
