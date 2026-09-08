export interface PriseEnCharge {
  id: string;
  dossierVisuelId: string; // reference → DossierVisuel
  cabinetId: string; // reference → Cabinet
  type: 'consultation' | 'confection';
  statut: 'initiee' | 'enCours' | 'terminee';
  opticienResponsableId: string; // reference → Utilisateur
  dateDebut: Date;
  dateFin?: Date;
}
