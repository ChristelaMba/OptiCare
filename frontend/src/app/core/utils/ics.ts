import { RendezVous } from '../../models/rendez-vous.model';

/** Douala (Cameroun) : UTC+1 toute l'année, pas d'heure d'été. */
const DECALAGE_DOUALA_MINUTES = 60;

const DUREE_PAR_DEFAUT_MINUTES = 30;

function enMinutes(heure: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(heure ?? '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Instant UTC d'un rendez-vous pris à `date` (YYYY-MM-DD) et `heure` (HH:mm), heure locale de Douala. */
function instantUtc(date: string, minutesDansLaJournee: number): Date {
  const [annee, mois, jour] = date.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(annee, mois - 1, jour, 0, minutesDansLaJournee - DECALAGE_DOUALA_MINUTES));
}

/** `20261026T100000Z` */
function formaterUtc(date: Date): string {
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return (
    `${p(date.getUTCFullYear(), 4)}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}` +
    `T${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z`
  );
}

/** Échappement des valeurs TEXT (RFC 5545 §3.3.11). */
function echapper(texte: string): string {
  return texte
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Pliage des lignes de plus de 75 octets (RFC 5545 §3.1) : suite précédée d'une espace, séparateur CRLF. */
function plier(ligne: string): string {
  const octets = new TextEncoder();
  if (octets.encode(ligne).length <= 75) {
    return ligne;
  }

  const morceaux: string[] = [];
  let courant = '';
  for (const caractere of ligne) {
    const limite = morceaux.length === 0 ? 75 : 74; // la ligne de suite commence par une espace
    if (octets.encode(courant + caractere).length > limite) {
      morceaux.push(courant);
      courant = caractere;
    } else {
      courant += caractere;
    }
  }
  morceaux.push(courant);

  return morceaux.join('\r\n ');
}

/**
 * Fichier iCalendar (.ics) d'un rendez-vous, généré côté navigateur (aucun appel API).
 *
 * - Heures en UTC (`...Z`), converties depuis l'heure de Douala (UTC+1) : l'événement s'affiche à la
 *   bonne heure locale dans n'importe quel agenda, sans dépendre d'un fuseau déclaré.
 * - Durée : `heureFin` si elle est valide et postérieure au début, sinon 30 minutes.
 * - UID stable par rendez-vous (`opticare-rdv-{id}@opticare`) : réimporter le fichier met à jour
 *   l'événement au lieu de le dupliquer.
 * - Fins de ligne CRLF, lignes pliées à 75 octets.
 *
 * `maintenant` n'est injectable que pour rendre DTSTAMP testable.
 */
export function genererIcs(rdv: RendezVous, maintenant: Date = new Date()): string {
  const debut = enMinutes(rdv.heureDebut);
  if (debut === null || !/^\d{4}-\d{2}-\d{2}/.test(rdv.date)) {
    throw new Error('Date ou heure de rendez-vous invalide');
  }

  const fin = enMinutes(rdv.heureFin);
  const finEffective = fin !== null && fin > debut ? fin : debut + DUREE_PAR_DEFAUT_MINUTES;

  const lignes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OptiCare//Rendez-vous//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:opticare-rdv-${rdv.id}@opticare`,
    `DTSTAMP:${formaterUtc(maintenant)}`,
    `DTSTART:${formaterUtc(instantUtc(rdv.date, debut))}`,
    `DTEND:${formaterUtc(instantUtc(rdv.date, finEffective))}`,
    `SUMMARY:${echapper(`Rendez-vous ${rdv.cabinetNom}`.trim())}`,
  ];

  const lieu = rdv.cabinetAdresse || rdv.cabinetNom;
  if (lieu) {
    lignes.push(`LOCATION:${echapper(lieu)}`);
  }
  if (rdv.motif) {
    lignes.push(`DESCRIPTION:${echapper(rdv.motif)}`);
  }

  lignes.push(
    `STATUS:${rdv.statut === 'confirme' ? 'CONFIRMED' : 'TENTATIVE'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  );

  return lignes.map(plier).join('\r\n') + '\r\n';
}

/** Nom de fichier : `rendez-vous-opticare-2026-10-26.ics`. */
export function nomFichierIcs(rdv: RendezVous): string {
  return `rendez-vous-opticare-${rdv.date.slice(0, 10)}.ics`;
}

/** Déclenche le téléchargement du fichier dans le navigateur. */
export function telechargerIcs(rdv: RendezVous): void {
  const blob = new Blob([genererIcs(rdv)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichierIcs(rdv);
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}
