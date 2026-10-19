export interface CabinetEligible {
  id: string;
  nom: string;
  dateVisite: string;
}

export interface Avis {
  id: string;
  cabinetId: string;
  cabinetNom: string;
  note: number;
  commentaire: string;
  datePublication: string;
}