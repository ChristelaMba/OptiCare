/**
 * Statistiques d'un cabinet (`GET /cabinets/{id}/statistiques`, ROUTES-API-LIONEL §15.1). Forme réelle observée le
 * 20/10/2026 : `data{ cabinet, rdv, consultations, commandes, patients, revenus, tendances }`, tous les compteurs et
 * montants (francs CFA) sont des **entiers** ; `tranches_age` est un objet `{ "0-18": n, … , "non_renseigne": n }` ;
 * `tendances[].label` est en anglais (« May 2026 ») : l'écran formate lui-même le mois à partir de `mois`.
 * L'API ne fournit pas de panier moyen, ni de jours d'affluence, ni d'évolution des rendez-vous.
 */
export interface ApiStatistiquesBrutes {
  cabinet?: { id?: number; nom?: string | null } | null;
  rdv?: Partial<Record<'total' | 'confirme' | 'termine' | 'annule' | 'non_honore' | 'reserve' | 'ce_mois' | 'cette_semaine' | 'aujourd_hui', number | string | null>> | null;
  consultations?: Partial<Record<'total' | 'terminees' | 'en_cours' | 'ce_mois' | 'cette_semaine', number | string | null>> | null;
  commandes?: Partial<Record<'total' | 'initie' | 'en_cours' | 'en_verification' | 'termine', number | string | null>> | null;
  patients?: {
    total?: number | string | null;
    nouveaux_ce_mois?: number | string | null;
    tranches_age?: Record<string, number | string | null> | null;
    top_villes?: { ville: string; total: number | string }[] | null;
  } | null;
  revenus?: Partial<Record<'total' | 'ce_mois' | 'mois_precedent' | 'en_attente' | 'evolution_pourcentage', number | string | null>> | null;
  tendances?: { mois?: string | null; label?: string | null; rdv?: number | string | null; consultations?: number | string | null; commandes?: number | string | null; revenus?: number | string | null }[] | null;
}

export interface StatistiquesCabinet {
  cabinetNom: string | null;
  rdv: { total: number; ceMois: number; cetteSemaine: number; aujourdHui: number };
  patients: { total: number; nouveauxCeMois: number; tranchesAge: { tranche: string; total: number }[] };
  revenus: {
    total: number;
    ceMois: number;
    moisPrecedent: number;
    enAttente: number;
    /** `null` si absente ou non numérique : l'indicateur n'est alors pas affiché. */
    evolutionPourcentage: number | null;
  };
  tendances: { mois: string; libelle: string; revenus: number }[];
}
