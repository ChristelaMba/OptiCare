export interface PrescriptionOeilAffichage {
  sphere: string;
  cylindre: string;
  axe: string;
  add?: string;
  avl?: string;
  avp?: string;
}

export interface Prescription {
  oeilDroit: PrescriptionOeilAffichage;
  oeilGauche: PrescriptionOeilAffichage;
}

export interface DocumentMedical {
  id: string;
  nom: string;
  date: string;
  taille?: string;
  url?: string;
}

export interface FicheConsultationResume {
  id: string;
  date: string;
  motif: string;
  cabinet: string;
  plaintes?: string;
  observations?: string;
  prescription?: Prescription;
  documents?: DocumentMedical[];
  dossierPdf?: DocumentMedical;
}

export interface PatientDossier {
  prenom: string;
  nom: string;
  age: number;
  sexe: string;
  fiches: FicheConsultationResume[];
}
