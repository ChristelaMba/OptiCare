import { Service, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiCabinetBrut,
  ApiCabinetEnveloppe,
  ApiCabinetsEnveloppe,
  ApiCabinetValidationBrut,
  ApiCabinetValidationEnveloppe,
  Cabinet as CabinetModel,
  CabinetValidationResultat,
  ProfilCabinetPayload,
} from '../../models/cabinet.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

// Champs nécessaires à la création d'un cabinet — hors périmètre du 11/09
// (la création réelle passe par POST /auth/register/cabinet, déjà branché ;
// cette méthode `creer()` cible POST /cabinets, route jamais confirmée et
// non appelée nulle part dans l'app — conservée telle quelle, inchangée).
export type CreerCabinetPayload = Pick<
  CabinetModel,
  'nom' | 'slogan' | 'description' | 'adresse' | 'quartier' | 'ville' | 'telephone' | 'whatsappNumero' | 'email'
>;

/** Filtres optionnels de `GET /cabinets` — confirmés le 11/09, tous deux facultatifs. */
export interface FiltresListePublique {
  search?: string;
  premium?: boolean;
}

/**
 * Un service par ressource, réutilisé par les écrans Cabinets (liste/détail/
 * profil) et par la supervision Super Admin. Même pattern que auth.ts :
 * @Service(), Observable en retour, aucune logique de state ici — chaque
 * composant gère son propre signal de liste. Normalisation snake_case →
 * camelCase à la réception, comme `Auth.normaliserEnveloppe()` — voir les
 * méthodes statiques privées en bas de fichier.
 */
@Service()
export class Cabinet {
  private readonly http = inject(HttpClient);

  /**
   * GET /cabinets — liste publique, sans auth (confirmé 11/09).
   * `search`/`premium` supportés côté back mais non utilisés par
   * `recherche-cabinets.ts` pour l'instant : cet écran a besoin de la liste
   * complète pour construire son facette « Quartier » et filtre/trie déjà
   * tout côté client — un filtrage serveur partiel n'y apporterait rien
   * aujourd'hui. Les paramètres restent disponibles pour un futur écran
   * (ex. une recherche serveur allégée) sans changer la signature.
   */
  listerPublics(filtres?: FiltresListePublique): Observable<CabinetModel[]> {
    let params = new HttpParams();
    if (filtres?.search) params = params.set('search', filtres.search);
    if (filtres?.premium !== undefined) params = params.set('premium', String(filtres.premium));

    return this.http
      .get<ApiCabinetsEnveloppe>(`${BASE_URL}/cabinets`, { params })
      .pipe(map((enveloppe) => enveloppe.data.cabinets.map(Cabinet.normaliserCabinet)));
  }

  /** GET /cabinets/{id} — détail public, sans auth (confirmé 11/09). */
  obtenirDetail(id: string): Observable<CabinetModel> {
    return this.http
      .get<ApiCabinetEnveloppe>(`${BASE_URL}/cabinets/${id}`)
      .pipe(map((enveloppe) => Cabinet.normaliserCabinet(enveloppe.data.cabinet)));
  }

  /** POST /cabinets — hors périmètre du 11/09, voir `CreerCabinetPayload` ci-dessus. */
  creer(payload: CreerCabinetPayload): Observable<CabinetModel> {
    return this.http.post<CabinetModel>(`${BASE_URL}/cabinets`, payload);
  }

  /**
   * PATCH /cabinets/{id}/profile — auth requise, rôles `proprietaire` ou
   * `super_admin` (confirmé 11/09). Remplace les anciens `completerProfil()`
   * et `mettreAJour()` : une seule route de mise à jour de profil, utilisée
   * à la fois par `completer-profil-cabinet` (première saisie) et
   * `vitrine-edition` (édition continue) — voir `ProfilCabinetPayload`.
   */
  mettreAJourProfil(id: string, payload: ProfilCabinetPayload): Observable<CabinetModel> {
    return this.http
      .patch<ApiCabinetEnveloppe>(`${BASE_URL}/cabinets/${id}/profile`, Cabinet.construireCorpsProfil(payload))
      .pipe(map((enveloppe) => Cabinet.normaliserCabinet(enveloppe.data.cabinet)));
  }

  /** GET /admin/cabinets — TOUS les cabinets, y compris non validés (Super Admin, confirmé). Le filtre sur status === 'en_attente' se fait côté composant. */
  listerAdmin(): Observable<CabinetModel[]> {
    return this.http
      .get<ApiCabinetsEnveloppe>(`${BASE_URL}/admin/cabinets`)
      .pipe(map((enveloppe) => enveloppe.data.cabinets.map(Cabinet.normaliserCabinet)));
  }

  /** PUT /admin/cabinets/{id}/verify — confirmé 11/09. Réponse partielle, voir `CabinetValidationResultat`. */
  valider(id: string): Observable<CabinetValidationResultat> {
    return this.http
      .put<ApiCabinetValidationEnveloppe>(`${BASE_URL}/admin/cabinets/${id}/verify`, {})
      .pipe(map((enveloppe) => Cabinet.normaliserValidation(enveloppe.data.cabinet)));
  }

  /** PUT /admin/cabinets/{id}/reject — confirmé 11/09. `motifRefus` requis côté back (`motif_refus`). */
  refuser(id: string, motifRefus: string): Observable<CabinetValidationResultat> {
    return this.http
      .put<ApiCabinetValidationEnveloppe>(`${BASE_URL}/admin/cabinets/${id}/reject`, { motif_refus: motifRefus })
      .pipe(map((enveloppe) => Cabinet.normaliserValidation(enveloppe.data.cabinet)));
  }

  /** camelCase (front) → snake_case (payload réel), et aplati les 4 liens externes. */
  private static construireCorpsProfil(payload: ProfilCabinetPayload): Record<string, unknown> {
    const corps: Record<string, unknown> = {};
    if (payload.nom !== undefined) corps['nom'] = payload.nom;
    if (payload.adresse !== undefined) corps['adresse'] = payload.adresse;
    if (payload.ville !== undefined) corps['ville'] = payload.ville;
    if (payload.quartier !== undefined) corps['quartier'] = payload.quartier;
    if (payload.telephone !== undefined) corps['telephone'] = payload.telephone;
    if (payload.email !== undefined) corps['email'] = payload.email;
    if (payload.whatsappNumero !== undefined) corps['whatsapp_numero'] = payload.whatsappNumero;
    if (payload.slogan !== undefined) corps['slogan'] = payload.slogan;
    if (payload.description !== undefined) corps['description'] = payload.description;
    if (payload.logoUrl !== undefined) corps['logo_url'] = payload.logoUrl;
    if (payload.photos !== undefined) corps['photos'] = payload.photos;
    if (payload.siteWeb !== undefined) corps['site_web'] = payload.siteWeb;
    if (payload.facebook !== undefined) corps['facebook'] = payload.facebook;
    if (payload.instagram !== undefined) corps['instagram'] = payload.instagram;
    if (payload.tiktok !== undefined) corps['tiktok'] = payload.tiktok;
    if (payload.abonnementPremium !== undefined) corps['abonnement_premium'] = payload.abonnementPremium;
    return corps;
  }

  /** snake_case (API réelle) → camelCase (front). Voir commentaire sur `Cabinet.horaires` : toujours `[]` ici, jamais fourni par l'API. */
  private static normaliserCabinet(brut: ApiCabinetBrut): CabinetModel {
    return {
      id: String(brut.id),
      nom: brut.nom,
      slogan: brut.slogan ?? '',
      description: brut.description ?? '',
      adresse: brut.adresse,
      quartier: brut.quartier,
      ville: brut.ville,
      telephone: brut.telephone,
      whatsappNumero: brut.whatsapp_numero ?? '',
      email: brut.email,
      logoUrl: brut.logo_url ?? '',
      photos: brut.photos ?? [],
      liensExternes: {
        siteWeb: brut.site_web ?? undefined,
        facebook: brut.facebook ?? undefined,
        instagram: brut.instagram ?? undefined,
        tiktok: brut.tiktok ?? undefined,
      },
      abonnementPremium: !!brut.abonnement_premium,
      noteMoyenne: brut.note_moyenne ?? 0,
      nombreAvis: brut.nb_avis ?? 0,
      status: brut.status,
      proprietaire: brut.proprietaire ? { nom: brut.proprietaire.nom, prenom: brut.proprietaire.prenom } : undefined,
      dateInscription: brut.created_at ? new Date(brut.created_at) : new Date(),
      horaires: [],
    };
  }

  private static normaliserValidation(brut: ApiCabinetValidationBrut): CabinetValidationResultat {
    return {
      id: String(brut.id),
      status: brut.status,
      estVerifie: brut.is_verified,
      valideLe: brut.valide_le ? new Date(brut.valide_le) : undefined,
      validePar: brut.valide_par != null ? String(brut.valide_par) : undefined,
      motifRefus: brut.motif_refus ?? undefined,
    };
  }
}
