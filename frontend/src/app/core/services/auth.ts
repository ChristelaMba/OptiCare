import { Service, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { libelleRole, RoleUtilisateur, Utilisateur } from '../../models/utilisateur.model';
import {
  ApiAuthEnveloppe,
  ApiUtilisateurBrut,
  AuthResponse,
  ConnexionPayload,
  InscriptionCabinetPayload,
  InscriptionCabinetResultat,
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

  /**
   * `POST /auth/register/cabinet` — le serveur ne renvoie plus de token (ROUTES-API-LIONEL §1.2) : le cabinet
   * est `en_attente` jusqu'à validation par le super admin. **Aucune session n'est ouverte** ; l'écran affiche
   * un message d'attente et renvoie vers la connexion. Fonctionne que le token soit absent ou, par tolérance, présent.
   */
  registerCabinet(payload: InscriptionCabinetPayload): Observable<InscriptionCabinetResultat> {
    return this.http
      .post<ApiAuthEnveloppe>(`${BASE_URL}/auth/register/cabinet`, payload)
      .pipe(
        map((brut) => ({
          utilisateur: Auth.normaliserUtilisateur(brut.data.user),
          enAttenteDeValidation: brut.data.requires_verification ?? true,
        })),
      );
  }

  /**
   * Recharge l'utilisateur courant depuis `GET /user` (réponse non enveloppée, ROUTES-API-LIONEL §1.6, avec le
   * bloc `patient` pour un patient) et met la session à jour. Sert à retrouver `patientId` pour les sessions
   * ouvertes avant que l'inscription ne le renvoie, sans obliger à se reconnecter.
   */
  rafraichirUtilisateur(): Observable<Utilisateur> {
    return this.http.get<ApiUtilisateurBrut>(`${BASE_URL}/user`).pipe(
      map((brut) => Auth.normaliserUtilisateur(brut)),
      tap((utilisateur) => {
        this.utilisateurSignal.set(utilisateur);
        const stockage = localStorage.getItem(CLE_TOKEN) ? localStorage : sessionStorage;
        stockage.setItem(CLE_UTILISATEUR, JSON.stringify(utilisateur));
      }),
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
      token: brut.data.token as string,
      utilisateur: Auth.normaliserUtilisateur(brut.data.user),
    };
  }

  private static normaliserUtilisateur(u: ApiUtilisateurBrut): Utilisateur {
    return {
      id: String(u.id),
      role: u.role,
      nom: u.nom,
      prenom: u.prenom,
      email: u.email ?? '', // un patient peut n'avoir aucun email : jamais null dans la session
      telephone: u.telephone,
      ville: u.ville,
      cabinetId: u.cabinet_id != null ? String(u.cabinet_id) : undefined,
      patientId: u.patient?.id != null ? String(u.patient.id) : undefined,
      actif: u.is_active,
      dateCreation: u.created_at ? new Date(u.created_at) : new Date(),
    };
  }

  /**
   * Déconnexion : `POST /auth/logout` avec le token courant (révocation côté serveur, ROUTES-API-LIONEL §1.4),
   * puis effacement de la session locale **dans tous les cas** — immédiatement, sans attendre la réponse : un
   * échec réseau ou une erreur serveur ne bloque jamais la déconnexion. Pas d'appel s'il n'y a pas de token (ou
   * un faux token de l'outil de dev). L'en-tête est posé explicitement car la session locale est effacée juste
   * après ; sans token, l'éventuel 401 de l'appel ne relance donc pas `logout()` en boucle.
   */
  logout(): void {
    const token = this.tokenSignal();

    if (token && !token.startsWith('dev-fake-token')) {
      this.http
        .post(`${BASE_URL}/auth/logout`, {}, { headers: { Authorization: `Bearer ${token}` } })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }

    this.effacerSessionLocale();
  }

  private effacerSessionLocale(): void {
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
