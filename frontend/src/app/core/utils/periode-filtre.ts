/**
 * Filtre de période côté navigateur (21/10/2026).
 *
 * L'API ne propose aucune plage de dates : `GET /cabinets/{id}/rdv` n'accepte
 * que `date` (dont le filtre serveur est cassé, §6.8), `GET /cabinets/{id}/factures`
 * que `statut` + `search` (§11.2) et `GET /cabinets/{id}/patients` que `search`
 * (§7.1). Les écrans chargent donc la liste complète du cabinet puis filtrent
 * dans le navigateur. Cet utilitaire centralise le calcul des bornes pour
 * éviter que chaque page réinvente sa propre arithmétique de dates.
 *
 * Les clés de comparaison sont des chaînes `AAAA-MM-JJ` (comme `RendezVous.date`
 * et `Facture.dateEmission`) : comparables lexicalement, sans objet `Date`
 * intermédiaire ni décalage de fuseau.
 */

/** Périodes prédéfinies proposées par les écrans (l'ordre est celui de l'affichage). */
export type PeriodePredefinie = 'tous' | 'jour' | 'semaine' | 'mois' | 'annee';

/** Sélection complète d'un filtre de date : période prédéfinie, date précise ou plage. */
export type ModePeriode = PeriodePredefinie | 'date' | 'plage';

export const LIBELLE_PERIODE: Record<PeriodePredefinie, string> = {
  tous: 'Tous',
  jour: "Aujourd'hui",
  semaine: 'Cette semaine',
  mois: 'Ce mois',
  annee: 'Cette année',
};

/** `Date` locale → `AAAA-MM-JJ` (sans passer par `toISOString`, qui décale en UTC). */
export function cleDate(date: Date): string {
  const j = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${j}`;
}

/** `AAAA-MM-JJ` → `JJ/MM/AAAA`. Une valeur vide ou nulle reste vide. */
export function formaterDateFr(cle: string | null): string {
  if (!cle) return '';
  const [annee, mois, jour] = cle.slice(0, 10).split('-');
  if (!annee || !mois || !jour) return cle;
  return `${jour}/${mois}/${annee}`;
}

/** Lundi de la semaine contenant `reference` (semaine qui commence le lundi, usage français). */
export function lundiDeLaSemaine(reference: Date): Date {
  const jour = reference.getDay(); // 0 = dimanche … 6 = samedi
  const recul = (jour + 6) % 7; // lundi → 0, dimanche → 6
  const lundi = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - recul);
  return lundi;
}

/** Bornes inclusives `[debut, fin]` d'une période prédéfinie, ou `null` pour « tous ». */
export function bornesPeriode(periode: PeriodePredefinie, aujourdHui: Date): { debut: string; fin: string } | null {
  const annee = aujourdHui.getFullYear();
  const mois = aujourdHui.getMonth();
  switch (periode) {
    case 'tous':
      return null;
    case 'jour':
      return { debut: cleDate(aujourdHui), fin: cleDate(aujourdHui) };
    case 'semaine': {
      const lundi = lundiDeLaSemaine(aujourdHui);
      const dimanche = new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + 6);
      return { debut: cleDate(lundi), fin: cleDate(dimanche) };
    }
    case 'mois': {
      const premier = new Date(annee, mois, 1);
      const dernier = new Date(annee, mois + 1, 0);
      return { debut: cleDate(premier), fin: cleDate(dernier) };
    }
    case 'annee':
      return { debut: cleDate(new Date(annee, 0, 1)), fin: cleDate(new Date(annee, 11, 31)) };
  }
}

/**
 * Bornes `[debut, fin]` d'une sélection : période prédéfinie, date précise
 * (`date` seule) ou plage (`debut` → `fin`). Renvoie `null` quand aucun
 * filtre n'est actif (période « tous ») ou quand la sélection est incomplète
 * (date ou plage à moitié saisie) — dans ce cas rien n'est bloqué, la liste
 * reste entière plutôt que de se vider sur une saisie en cours.
 */
export function bornesSelection(
  mode: ModePeriode,
  valeurs: { date?: string | null; debut?: string | null; fin?: string | null },
  aujourdHui: Date,
): { debut: string; fin: string } | null {
  if (mode === 'date') {
    const jour = valeurs.date?.slice(0, 10);
    return jour ? { debut: jour, fin: jour } : null;
  }
  if (mode === 'plage') {
    const debut = valeurs.debut?.slice(0, 10);
    const fin = valeurs.fin?.slice(0, 10);
    if (!debut || !fin) return null;
    // Une plage saisie à l'envers est remise dans l'ordre.
    return debut <= fin ? { debut, fin } : { debut: fin, fin: debut };
  }
  return bornesPeriode(mode, aujourdHui);
}

/** Vrai si la clé `AAAA-MM-JJ` tombe dans les bornes inclusives (bornes `null` = pas de filtre). */
export function dateDansBornes(cle: string | null | undefined, bornes: { debut: string; fin: string } | null): boolean {
  if (!bornes) return true;
  if (!cle) return false;
  const jour = cle.slice(0, 10);
  return jour >= bornes.debut && jour <= bornes.fin;
}
