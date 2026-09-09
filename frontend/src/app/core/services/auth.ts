import { Service, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { libelleRole, RoleUtilisateur, Utilisateur } from '../../models/utilisateur.model';
import {
  ApiAuthEnveloppe,
  ApiUtilisateurBrut,
  AuthResponse,
  ConnexionPayload,
  InscriptionCabinetPayload,
  InscriptionPatientPayload,
} from '../../models/auth.model';

const CLE_TOKEN = 'opticare_token';
const CLE_UTILISATEUR = 'opticare_utilisateur';

// environment.apiUrl se termine parfois par '/', parfois non (dev vs prod) :
// on normalise pour ne jamais produire d'URL avec un slash en trop ou manquant.
const BASE_URL = environment.apiUrl.replace(/\/$/, '');

// Redirection par défaut après connexion, selon le rôle retourné par l'API.
const ROUTE_PAR_ROLE: Record<RoleUtilisateur, string> = {
  patient: '/patient',
  secretaire: '/secretaire',
  opticien: '/opticien',
  proprietaire: '/proprietaire',
  super_admin: '/super-admin',
};

@Service()
export class Auth {
  private readonly http = inject(HttpClient);

  private readonly tokenSignal = signal<string | null>(this.lire(CLE_TOKEN));
  private readonly utilisateurSignal = signal<Utilisateur | null>(this.lireUtilisateur());

  readonly token = this.tokenSignal.asReadonly();
  readonly utilisateur = this.utilisateurSignal.asReadonly();
  readonly role = computed<RoleUtilisateur | null>(() => this.utilisateurSignal()?.role ?? null);
  readonly estConnecte = computed(() => this.tokenSignal() !== null);

  registerPatient(payload: InscriptionPatientPayload): Observable<AuthResponse> {
    return this.http
      .post<ApiAuthEnveloppe>(`${BASE_URL}/auth/register/patient`, payload)
      .pipe(
        map((brut) => Auth.normaliserEnveloppe(brut)),
        tap((reponse) => this.ouvrirSession(reponse, true)),
      );
  }

  registerCabinet(payload: InscriptionCabinetPayload): Observable<AuthResponse> {
    return this.http
      .post<ApiAuthEnveloppe>(`${BASE_URL}/auth/register/cabinet`, payload)
      .pipe(
        map((brut) => Auth.normaliserEnveloppe(brut)),
        tap((reponse) => this.ouvrirSession(reponse, true)),
      );
  }

  /**
   * @param seSouvenir si vrai, la session survit à la fermeture du navigateur
   * (localStorage) ; sinon elle est effacée à la fermeture de l'onglet (sessionStorage).
   */
  login(payload: ConnexionPayload, seSouvenir: boolean): Observable<AuthResponse> {
    return this.http
      .post<ApiAuthEnveloppe>(`${BASE_URL}/auth/login`, payload)
      .pipe(
        map((brut) => Auth.normaliserEnveloppe(brut)),
        tap((reponse) => this.ouvrirSession(reponse, seSouvenir)),
      );
  }

  /**
   * Normalise la réponse réelle de l'API (`{ status, message, data: { user, token, role } }`,
   * `user` en snake_case, `id` numérique) vers la forme interne `AuthResponse`
   * consommée par les écrans. Vérifiée en conditions réelles le 07/09 —
   * voir `ApiAuthEnveloppe` (auth.model.ts) et POINTS-A-CONFIRMER-BACKEND.md.
   */
  private static normaliserEnveloppe(brut: ApiAuthEnveloppe): AuthResponse {
    return {
      token: brut.data.token,
      utilisateur: Auth.normaliserUtilisateur(brut.data.user),
    };
  }

  private static normaliserUtilisateur(u: ApiUtilisateurBrut): Utilisateur {
    return {
      id: String(u.id),
      role: u.role,
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      telephone: u.telephone,
      ville: u.ville,
      cabinetId: u.cabinet_id != null ? String(u.cabinet_id) : undefined,
      actif: u.is_active,
      dateCreation: u.created_at ? new Date(u.created_at) : new Date(),
    };
  }

  logout(): void {
    this.tokenSignal.set(null);
    this.utilisateurSignal.set(null);
    localStorage.removeItem(CLE_TOKEN);
    localStorage.removeItem(CLE_UTILISATEUR);
    sessionStorage.removeItem(CLE_TOKEN);
    sessionStorage.removeItem(CLE_UTILISATEUR);
  }

  /** Route de destination par défaut après connexion/inscription, selon le rôle. */
  routeParDefaut(role: RoleUtilisateur): string {
    return ROUTE_PAR_ROLE[role];
  }

  /**
   * OUTIL DE DEV UNIQUEMENT — simule une session pour un rôle donné, sans
   * appel API. Passe par `ouvrirSession()`, exactement comme un vrai
   * login/register : la session est donc réellement persistée
   * (sessionStorage) et rehydratée à chaque construction du service, pas
   * seulement posée en mémoire. C'est délibéré — une version antérieure de
   * cet outil qui ne faisait que positionner les signals en mémoire a déjà
   * causé un bug de navigation (un clic sur un lien interne redirigeait à
   * tort vers la connexion). Utilisée par /dev/connexion-simulee tant que
   * le back-end n'est pas branché. À retirer une fois l'authentification
   * réelle disponible.
   */
  simulerConnexion(role: RoleUtilisateur): void {
    // Rôles rattachés à un cabinet : cabinetId par défaut sur cab-004 (Vision
    // Plus) pour que gestion-employes/dashboard-comptable/historique-rdv/
    // agenda affichent des données factices dès la connexion, au lieu d'un
    // écran vide faute de cabinetId.
    const cabinetIdParDefaut = ['proprietaire', 'opticien', 'secretaire'].includes(role) ? 'cab-004' : undefined;

    const utilisateurSimule: Utilisateur = {
      id: `dev-${role}`,
      role,
      nom: 'Test',
      prenom: libelleRole(role),
      email: `${role}@dev.local`,
      telephone: '+237600000000',
      ville: 'Douala',
      cabinetId: cabinetIdParDefaut,
      actif: true,
      dateCreation: new Date(),
    };

    this.ouvrirSession({ token: `dev-fake-token-${role}`, utilisateur: utilisateurSimule }, false);
  }

  private ouvrirSession(reponse: AuthResponse, seSouvenir: boolean): void {
    this.tokenSignal.set(reponse.token);
    this.utilisateurSignal.set(reponse.utilisateur);

    // On s'assure qu'une session précédente dans l'autre stockage ne traîne pas.
    const stockage = seSouvenir ? localStorage : sessionStorage;
    const autreStockage = seSouvenir ? sessionStorage : localStorage;
    autreStockage.removeItem(CLE_TOKEN);
    autreStockage.removeItem(CLE_UTILISATEUR);

    stockage.setItem(CLE_TOKEN, reponse.token);
    stockage.setItem(CLE_UTILISATEUR, JSON.stringify(reponse.utilisateur));
  }

  private lire(cle: string): string | null {
    return localStorage.getItem(cle) ?? sessionStorage.getItem(cle);
  }

  private lireUtilisateur(): Utilisateur | null {
    const brut = this.lire(CLE_UTILISATEUR);
    return brut ? (JSON.parse(brut) as Utilisateur) : null;
  }
}
