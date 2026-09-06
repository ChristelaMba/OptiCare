import { Utilisateur } from '../../models/utilisateur.model';

/**
 * OUTIL DE DEV UNIQUEMENT — jeu d'utilisateurs factices utilisé par
 * `mock-auth-interceptor.ts` tant que le back-end n'est pas branché.
 * `let` (pas `const`) : une inscription réussie (patient ou cabinet)
 * pousse un nouvel utilisateur ici en mémoire, pour pouvoir se
 * reconnecter avec le compte qu'on vient de créer dans la même session
 * de page. À retirer une fois l'API réelle disponible.
 *
 * Comptes de test disponibles (mot de passe identique pour tous,
 * `password123`, uniquement pour simplifier les tests manuels) :
 *
 * | Rôle         | Téléphone         |
 * |--------------|-------------------|
 * | Patient      | +237600000001     |
 * | Secretaire   | +237600000002     |
 * | Opticien     | +237600000003     |
 * | Proprietaire | +237600000004     |
 * | SuperAdmin   | +237600000005     |
 */
export interface UtilisateurFactice extends Utilisateur {
  /** Mock uniquement — jamais un vrai champ de Utilisateur côté API. */
  motDePasse: string;
}

export let utilisateursFactices: UtilisateurFactice[] = [
  {
    id: 'user-patient-01',
    role: 'Patient',
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean.dupont@email.cm',
    telephone: '+237600000001',
    ville: 'Douala',
    actif: true,
    dateCreation: new Date('2026-01-15'),
    motDePasse: 'password123',
  },
  {
    id: 'user-secretaire-01',
    role: 'Secretaire',
    nom: 'Mbarga',
    prenom: 'Aline',
    email: 'aline.mbarga@email.cm',
    telephone: '+237600000002',
    ville: 'Douala',
    cabinetId: 'cab-004',
    actif: true,
    dateCreation: new Date('2026-01-15'),
    motDePasse: 'password123',
  },
  {
    id: 'user-opticien-01',
    role: 'Opticien',
    nom: 'Nkeng',
    prenom: 'Sylvie',
    email: 'sylvie.nkeng@email.cm',
    telephone: '+237600000003',
    ville: 'Douala',
    cabinetId: 'cab-004',
    actif: true,
    dateCreation: new Date('2026-01-15'),
    motDePasse: 'password123',
  },
  {
    id: 'user-proprietaire-01',
    role: 'Proprietaire',
    nom: 'Fotso',
    prenom: 'Marc',
    email: 'marc.fotso@email.cm',
    telephone: '+237600000004',
    ville: 'Douala',
    cabinetId: 'cab-004',
    actif: true,
    dateCreation: new Date('2026-01-15'),
    motDePasse: 'password123',
  },
  {
    id: 'user-superadmin-01',
    role: 'SuperAdmin',
    nom: 'Admin',
    prenom: 'Super',
    email: 'admin@opticare.cm',
    telephone: '+237600000005',
    ville: 'Douala',
    actif: true,
    dateCreation: new Date('2026-01-01'),
    motDePasse: 'password123',
  },
];
