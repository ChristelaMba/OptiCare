/**
 * OUTIL DE DEV UNIQUEMENT — aucune interface « Statistiques » n'existe au
 * §5 du cahier des charges (le Dashboard comptable, §9.6, ne précise que le
 * contenu visuel attendu, pas le contrat de données). Type et données
 * définis ici pour ce sprint, à remplacer par le vrai contrat une fois
 * confirmé côté back-end — voir TODO sur `statistiques.ts`.
 */
export interface StatistiquesCabinet {
  chiffreAffaires: number;
  chiffreAffairesVariation: number; // % vs période précédente
  nombreRendezVous: number;
  nombreRendezVousVariation: number;
  panierMoyen: number;
  panierMoyenVariation: number;
  nouveauxPatients: number;
  nouveauxPatientsVariation: number;
  evolutionRevenus: { mois: string; montant: number }[];
  joursAffluence: { jour: string; nombreRdv: number }[];
  distributionAge: { tranche: string; pourcentage: number }[];
}

/** Jeu de base (période « Mois ») — cab-004, Vision Plus. */
const STATS_MENSUELLES_CAB_004: StatistiquesCabinet = {
  chiffreAffaires: 1_607_500, // FCFA — équivalent de l'ordre de grandeur de la maquette (24 500 €)
  chiffreAffairesVariation: 12.5,
  nombreRendezVous: 342,
  nombreRendezVousVariation: 5.2,
  panierMoyen: 4700,
  panierMoyenVariation: -1.1,
  nouveauxPatients: 48,
  nouveauxPatientsVariation: 8.4,
  evolutionRevenus: [
    { mois: 'Mars', montant: 655_000 },
    { mois: 'Avr', montant: 980_000 },
    { mois: 'Mai', montant: 720_000 },
    { mois: 'Juin', montant: 1_310_000 },
    { mois: 'Juil', montant: 1_120_000 },
    { mois: 'Août', montant: 1_607_500 },
  ],
  joursAffluence: [
    { jour: 'Lundi', nombreRdv: 85 },
    { jour: 'Mardi', nombreRdv: 62 },
    { jour: 'Mercredi', nombreRdv: 74 },
    { jour: 'Jeudi', nombreRdv: 45 },
    { jour: 'Vendredi', nombreRdv: 58 },
    { jour: 'Samedi', nombreRdv: 18 },
  ],
  distributionAge: [
    { tranche: '30-50 ans', pourcentage: 45 },
    { tranche: '50 ans et +', pourcentage: 30 },
    { tranche: 'Moins de 30 ans', pourcentage: 25 },
  ],
};

/**
 * Simule des chiffres cohérents pour « Jour »/« Semaine » à partir du jeu
 * mensuel (facteurs approximatifs, pas de vraie agrégation temporelle).
 */
export function genererStatistiques(periode: 'jour' | 'semaine' | 'mois'): StatistiquesCabinet {
  const facteur = periode === 'jour' ? 1 / 30 : periode === 'semaine' ? 1 / 4 : 1;
  const base = STATS_MENSUELLES_CAB_004;

  return {
    ...base,
    chiffreAffaires: Math.round(base.chiffreAffaires * facteur),
    nombreRendezVous: Math.round(base.nombreRendezVous * facteur),
    nouveauxPatients: Math.max(1, Math.round(base.nouveauxPatients * facteur)),
  };
}
