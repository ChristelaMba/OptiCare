import { genererIcs, nomFichierIcs } from './ics';
import { RendezVous } from '../../models/rendez-vous.model';

const RDV: RendezVous = {
  id: '8',
  cabinetId: '5',
  cabinetNom: 'Cabinet TEST Diagnostic',
  cabinetAdresse: 'Rue de Test, Diagnostic Connectivite, Douala',
  motif: 'TEST-DIAG2',
  date: '2026-10-26',
  heureDebut: '11:00',
  heureFin: '11:30',
  statut: 'confirme',
};

const MAINTENANT = new Date(Date.UTC(2026, 9, 19, 12, 0, 0));

function lignes(ics: string): string[] {
  return ics.split('\r\n');
}

describe('genererIcs', () => {
  it('structure iCalendar valide : VCALENDAR / VEVENT, fins de ligne CRLF uniquement, CRLF final', () => {
    const ics = genererIcs(RDV, MAINTENANT);

    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VEVENT\r\nEND:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('\r\nVERSION:2.0\r\n');
    expect(ics).toContain('\r\nBEGIN:VEVENT\r\n');
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/); // aucun LF ou CR isolé
  });

  it("heure de Douala (UTC+1) : 11:00 locale → 10:00 UTC, fin à 10:30 UTC, DTSTAMP donné", () => {
    const l = lignes(genererIcs(RDV, MAINTENANT));

    expect(l).toContain('DTSTART:20261026T100000Z');
    expect(l).toContain('DTEND:20261026T103000Z');
    expect(l).toContain('DTSTAMP:20261019T120000Z');
  });

  it('une heure proche de minuit bascule correctement de jour en UTC (00:30 Douala = 23:30 UTC la veille)', () => {
    const l = lignes(genererIcs({ ...RDV, heureDebut: '00:30', heureFin: '01:00' }, MAINTENANT));

    expect(l).toContain('DTSTART:20261025T233000Z');
    expect(l).toContain('DTEND:20261026T000000Z');
  });

  it('durée de 30 minutes par défaut quand l\'heure de fin est absente ou incohérente', () => {
    expect(lignes(genererIcs({ ...RDV, heureFin: '' }, MAINTENANT))).toContain('DTEND:20261026T103000Z');
    expect(lignes(genererIcs({ ...RDV, heureFin: '10:00' }, MAINTENANT))).toContain('DTEND:20261026T103000Z');
  });

  it('une heure de fin valide est respectée (45 min)', () => {
    expect(lignes(genererIcs({ ...RDV, heureFin: '11:45' }, MAINTENANT))).toContain('DTEND:20261026T104500Z');
  });

  it('titre, lieu (adresse du cabinet) et description (motif)', () => {
    const l = lignes(genererIcs(RDV, MAINTENANT));

    expect(l).toContain('SUMMARY:Rendez-vous Cabinet TEST Diagnostic');
    expect(l).toContain('LOCATION:Rue de Test\\, Diagnostic Connectivite\\, Douala');
    expect(l).toContain('DESCRIPTION:TEST-DIAG2');
    expect(l).toContain('STATUS:CONFIRMED');
  });

  it('lieu = nom du cabinet sans adresse ; pas de DESCRIPTION sans motif ; RDV réservé = TENTATIVE', () => {
    const l = lignes(genererIcs({ ...RDV, cabinetAdresse: undefined, motif: '', statut: 'reserve' }, MAINTENANT));

    expect(l).toContain('LOCATION:Cabinet TEST Diagnostic');
    expect(l.some((x) => x.startsWith('DESCRIPTION'))).toBe(false);
    expect(l).toContain('STATUS:TENTATIVE');
  });

  it('UID stable et propre à chaque rendez-vous', () => {
    const a = lignes(genererIcs(RDV, MAINTENANT)).find((x) => x.startsWith('UID:'));
    const b = lignes(genererIcs({ ...RDV, id: '9' }, MAINTENANT)).find((x) => x.startsWith('UID:'));

    expect(a).toBe('UID:opticare-rdv-8@opticare');
    expect(b).toBe('UID:opticare-rdv-9@opticare');
    expect(a).not.toBe(b);
  });

  it('caractères spéciaux échappés (virgule, point-virgule, antislash, retour à la ligne)', () => {
    const l = lignes(genererIcs({ ...RDV, motif: 'Contrôle; lunettes, verres\\ok\nligne 2' }, MAINTENANT));

    expect(l).toContain('DESCRIPTION:Contrôle\\; lunettes\\, verres\\\\ok\\nligne 2');
  });

  it('les lignes de plus de 75 octets sont pliées (suite précédée d\'une espace)', () => {
    const ics = genererIcs({ ...RDV, motif: 'x'.repeat(200) }, MAINTENANT);
    const octets = new TextEncoder();

    for (const ligne of lignes(ics)) {
      expect(octets.encode(ligne).length).toBeLessThanOrEqual(75);
    }
    const description = ics.replace(/\r\n /g, '').split('\r\n').find((x) => x.startsWith('DESCRIPTION:'));
    expect(description).toBe('DESCRIPTION:' + 'x'.repeat(200));
  });

  it('date ou heure invalide : erreur explicite', () => {
    expect(() => genererIcs({ ...RDV, heureDebut: '' }, MAINTENANT)).toThrow();
    expect(() => genererIcs({ ...RDV, date: 'demain' }, MAINTENANT)).toThrow();
  });

  it('nom du fichier', () => {
    expect(nomFichierIcs(RDV)).toBe('rendez-vous-opticare-2026-10-26.ics');
  });
});
