const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Date brute `AAAA-MM-JJ HH:MM:SS` (ou `AAAA-MM-JJTHH:MM:SS`, avec fractions de seconde et `Z` facultatifs) dans un texte. */
const DATE_BRUTE = /(\d{4})-(\d{2})-(\d{2})[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/g;

/**
 * Remplace, dans un message renvoyé par le serveur, toute date brute `AAAA-MM-JJ HH:MM:SS` par une date en français
 * (« 30 octobre 2026 »). Affichage seulement : le texte reçu n'est pas modifié. Une date invalide est laissée telle quelle.
 */
export function remplacerDatesBrutes(texte: string): string {
  return texte.replace(DATE_BRUTE, (brut, annee: string, mois: string, jour: string) => {
    const m = Number(mois);
    const j = Number(jour);
    if (m < 1 || m > 12 || j < 1 || j > 31) {
      return brut;
    }
    return `${j} ${MOIS[m - 1]} ${annee}`;
  });
}
