const FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** Montant en francs CFA, arrondi à l'entier, sans décimale : `20000` → « 20 000 FCFA ». */
export function formaterFcfa(montant: number): string {
  // Espace insécable fine d'Intl → espace normale (lisible dans les tests et les exports).
  return `${FORMAT.format(Math.round(montant)).replace(/[  ]/g, ' ')} FCFA`;
}
