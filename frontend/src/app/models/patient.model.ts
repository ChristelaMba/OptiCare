export type Sexe = 'M' | 'F' | 'Autre';

export interface Patient {
  id: string;
  nom: string;
  prenom: string;

  dateNaissance?: string;
  age: number;

  sexe: Sexe;

  telephone: string;
  whatsapp?: string;

  profession?: string;
  quartier?: string;
  nombreEnfants?: number;

  derniereVisite?: string;
}
