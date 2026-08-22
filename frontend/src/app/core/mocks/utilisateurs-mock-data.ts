import { Utilisateur } from '../../models/utilisateur.model';

/**
 * OUTIL DE DEV UNIQUEMENT — jeu d'utilisateurs factices utilisé par
 * `mock-utilisateurs-interceptor.ts` tant que le back-end n'est pas branché.
 * Couvre les comptes Opticien/Secretaire/Proprietaire des cabinets validés
 * de `cabinets-mock-data.ts`, plus quelques Patients pour la vue Super Admin
 * (§9.7). À retirer une fois l'API réelle disponible.
 */
export let utilisateursFactices: Utilisateur[] = [
  // --- cab-004 · Vision Plus (Bonapriso) ---
  { id: 'user-001', role: 'Proprietaire', nom: 'Kamga', prenom: 'Étienne', email: 'etienne.kamga@visionplus.cm', telephone: '+237 6 99 88 77 66', ville: 'Douala', cabinetId: 'cab-004', actif: true, dateCreation: new Date('2026-05-02T10:00:00') },
  { id: 'user-002', role: 'Opticien', nom: 'Nkeng', prenom: 'Sylvie', email: 's.nkeng@visionplus.cm', telephone: '+237 6 71 22 33 44', ville: 'Douala', cabinetId: 'cab-004', actif: true, dateCreation: new Date('2026-05-10T09:00:00') },
  { id: 'user-003', role: 'Secretaire', nom: 'Ebogo', prenom: 'Junior', email: 'j.ebogo@visionplus.cm', telephone: '+237 6 82 33 44 55', ville: 'Douala', cabinetId: 'cab-004', actif: true, dateCreation: new Date('2026-05-12T09:00:00') },
  { id: 'user-004', role: 'Opticien', nom: 'Fouda', prenom: 'Aïcha', email: 'a.fouda@visionplus.cm', telephone: '+237 6 93 44 55 66', ville: 'Douala', cabinetId: 'cab-004', actif: false, dateCreation: new Date('2026-05-15T09:00:00') },
  { id: 'user-005', role: 'Secretaire', nom: 'Talla', prenom: 'Brice', email: 'b.talla@visionplus.cm', telephone: '+237 6 54 55 66 77', ville: 'Douala', cabinetId: 'cab-004', actif: true, dateCreation: new Date('2026-05-18T09:00:00') },

  // --- cab-005 · Horizon Optique (Deido) ---
  { id: 'user-006', role: 'Proprietaire', nom: 'Mballa', prenom: 'Rose', email: 'rose.mballa@horizonoptique.cm', telephone: '+237 6 71 23 45 67', ville: 'Douala', cabinetId: 'cab-005', actif: true, dateCreation: new Date('2026-03-20T08:45:00') },
  { id: 'user-007', role: 'Opticien', nom: 'Same', prenom: 'Patrick', email: 'p.same@horizonoptique.cm', telephone: '+237 6 62 33 44 55', ville: 'Douala', cabinetId: 'cab-005', actif: true, dateCreation: new Date('2026-03-25T09:00:00') },
  { id: 'user-008', role: 'Secretaire', nom: 'Ngo Bakal', prenom: 'Carine', email: 'c.ngobakal@horizonoptique.cm', telephone: '+237 6 73 44 55 66', ville: 'Douala', cabinetId: 'cab-005', actif: true, dateCreation: new Date('2026-03-28T09:00:00') },

  // --- cab-008 · Vistéa (Bonaberi) ---
  { id: 'user-009', role: 'Proprietaire', nom: 'Essomba', prenom: 'Paul', email: 'paul.essomba@vistea.cm', telephone: '+237 6 74 33 22 11', ville: 'Douala', cabinetId: 'cab-008', actif: true, dateCreation: new Date('2026-06-11T09:30:00') },
  { id: 'user-010', role: 'Opticien', nom: 'Biya', prenom: 'Larissa', email: 'l.biya@vistea.cm', telephone: '+237 6 85 44 33 22', ville: 'Douala', cabinetId: 'cab-008', actif: true, dateCreation: new Date('2026-06-15T09:00:00') },
  { id: 'user-011', role: 'Secretaire', nom: 'Onana', prenom: 'Gilbert', email: 'g.onana@vistea.cm', telephone: '+237 6 96 55 44 33', ville: 'Douala', cabinetId: 'cab-008', actif: true, dateCreation: new Date('2026-06-18T09:00:00') },

  // --- cab-009 · Maison Vision (Akwa) ---
  { id: 'user-012', role: 'Proprietaire', nom: 'Belinga', prenom: 'Christiane', email: 'c.belinga@maisonvision.cm', telephone: '+237 6 88 40 20 10', ville: 'Douala', cabinetId: 'cab-009', actif: true, dateCreation: new Date('2026-04-15T10:15:00') },
  { id: 'user-013', role: 'Opticien', nom: 'Ateba', prenom: 'Marcel', email: 'm.ateba@maisonvision.cm', telephone: '+237 6 79 20 10 30', ville: 'Douala', cabinetId: 'cab-009', actif: true, dateCreation: new Date('2026-04-18T09:00:00') },
  { id: 'user-014', role: 'Secretaire', nom: 'Djoumessi', prenom: 'Estelle', email: 'e.djoumessi@maisonvision.cm', telephone: '+237 6 60 30 20 10', ville: 'Douala', cabinetId: 'cab-009', actif: true, dateCreation: new Date('2026-04-20T09:00:00') },

  // --- cab-010 · Sawa Optique (Bali) ---
  { id: 'user-015', role: 'Proprietaire', nom: 'Ekwalla', prenom: 'Daniel', email: 'd.ekwalla@sawa-optique.cm', telephone: '+237 6 61 05 40 30', ville: 'Douala', cabinetId: 'cab-010', actif: true, dateCreation: new Date('2026-02-28T14:00:00') },
  { id: 'user-016', role: 'Opticien', nom: 'Manga', prenom: 'Odette', email: 'o.manga@sawa-optique.cm', telephone: '+237 6 52 40 30 20', ville: 'Douala', cabinetId: 'cab-010', actif: true, dateCreation: new Date('2026-03-02T09:00:00') },

  // --- cab-011 · The Vision Lab (Village) ---
  { id: 'user-017', role: 'Proprietaire', nom: 'Njoya', prenom: 'Bertrand', email: 'b.njoya@thevisionlab.cm', telephone: '+237 6 95 70 60 50', ville: 'Douala', cabinetId: 'cab-011', actif: true, dateCreation: new Date('2026-01-10T09:00:00') },
  { id: 'user-018', role: 'Opticien', nom: 'Voundi', prenom: 'Nadège', email: 'n.voundi@thevisionlab.cm', telephone: '+237 6 86 60 50 40', ville: 'Douala', cabinetId: 'cab-011', actif: true, dateCreation: new Date('2026-01-14T09:00:00') },
  { id: 'user-019', role: 'Secretaire', nom: 'Feudjio', prenom: 'Hervé', email: 'h.feudjio@thevisionlab.cm', telephone: '+237 6 97 70 60 50', ville: 'Douala', cabinetId: 'cab-011', actif: false, dateCreation: new Date('2026-01-16T09:00:00') },

  // --- Patients (aucun cabinetId) ---
  { id: 'user-020', role: 'Patient', nom: 'Dupont', prenom: 'Jean', email: 'jean.dupont@gmail.com', telephone: '+237 6 70 11 22 33', ville: 'Douala', actif: true, dateCreation: new Date('2026-01-05T10:00:00') },
  { id: 'user-021', role: 'Patient', nom: 'Laurent', prenom: 'Marie', email: 'marie.laurent@gmail.com', telephone: '+237 6 81 22 33 44', ville: 'Douala', actif: true, dateCreation: new Date('2026-02-14T10:00:00') },
  { id: 'user-022', role: 'Patient', nom: 'Bernard', prenom: 'Thomas', email: 'thomas.bernard@gmail.com', telephone: '+237 6 92 33 44 55', ville: 'Douala', actif: true, dateCreation: new Date('2026-03-01T10:00:00') },
  { id: 'user-023', role: 'Patient', nom: 'Lemaire', prenom: 'Pierre', email: 'pierre.lemaire@gmail.com', telephone: '+237 6 53 44 55 66', ville: 'Douala', actif: true, dateCreation: new Date('2026-03-10T10:00:00') },
  { id: 'user-024', role: 'Patient', nom: 'Fabre', prenom: 'Sophie', email: 'sophie.fabre@gmail.com', telephone: '+237 6 64 55 66 77', ville: 'Douala', actif: true, dateCreation: new Date('2026-03-22T10:00:00') },
  { id: 'user-025', role: 'Patient', nom: 'Roux', prenom: 'Lucas', email: 'lucas.roux@gmail.com', telephone: '+237 6 75 66 77 88', ville: 'Douala', actif: false, dateCreation: new Date('2026-04-02T10:00:00') },
  { id: 'user-026', role: 'Patient', nom: 'Leclerc', prenom: 'Jean', email: 'jean.leclerc@gmail.com', telephone: '+237 6 86 77 88 99', ville: 'Douala', actif: false, dateCreation: new Date('2026-04-14T10:00:00') },

  // --- Super Admin ---
  { id: 'user-027', role: 'SuperAdmin', nom: 'Owona', prenom: 'Francine', email: 'f.owona@opticare.cm', telephone: '+237 6 90 00 00 01', ville: 'Douala', actif: true, dateCreation: new Date('2026-01-01T09:00:00') },
];
