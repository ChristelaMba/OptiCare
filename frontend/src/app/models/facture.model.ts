export interface LigneFacture {
  id: number;
  description: string;
  quantite: number;
  montant: number;
}

export type StatutFacture = 'emise' | 'payee';

export interface Facture {
  id: string;
  numero: string;
  date: string;
  montantTotal: number;
  statut: StatutFacture;
  lignes: LigneFacture[];
}