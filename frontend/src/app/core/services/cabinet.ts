import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Cabinet as CabinetModel, CompleterProfilCabinetPayload, ModifierCabinetPayload } from '../../models/cabinet.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

// Champs nécessaires à la création d'un cabinet — le reste (statutValidation,
// noteMoyenne, qrCodeUrl, proprietaireId, dateInscription...) est généré côté
// back ou complété plus tard via completerProfil (§6.4 du cahier des charges).
export type CreerCabinetPayload = Pick<
  CabinetModel,
  'nom' | 'slogan' | 'description' | 'adresse' | 'quartier' | 'ville' | 'telephone' | 'whatsappNumero' | 'email'
>;

/**
 * Un service par ressource, réutilisé par les écrans Cabinets (liste/détail/
 * création, hors périmètre de ce sprint) et par la supervision Super Admin.
 * Même pattern que auth.ts : @Service(), Observable en retour, aucune
 * logique de state ici — chaque composant gère son propre signal de liste.
 */
@Service()
export class Cabinet {
  private readonly http = inject(HttpClient);

  /** GET /cabinets — cabinets validés, pour la vitrine publique. */
  listerPublics(): Observable<CabinetModel[]> {
    return this.http.get<CabinetModel[]>(`${BASE_URL}/cabinets`);
  }

  /** GET /cabinets/{id} */
  obtenirDetail(id: string): Observable<CabinetModel> {
    return this.http.get<CabinetModel>(`${BASE_URL}/cabinets/${id}`);
  }

  /** POST /cabinets — création par le Propriétaire, statut initial « en attente de validation ». */
  creer(payload: CreerCabinetPayload): Observable<CabinetModel> {
    return this.http.post<CabinetModel>(`${BASE_URL}/cabinets`, payload);
  }

  /**
   * Complète le profil d'un cabinet (§6.4 du cahier des charges) avant que
   * son statut ne passe de profilIncomplet à enAttente.
   *
   * TODO : route NON confirmée avec le back-end (voir §6.4 et §8 du cahier
   * des charges — signalé explicitement comme non couvert par le contrat).
   * `PATCH /cabinets/{id}/completer-profil` est une hypothèse provisoire,
   * à valider avant toute utilisation réelle.
   */
  completerProfil(id: string, payload: CompleterProfilCabinetPayload): Observable<CabinetModel> {
    return this.http.patch<CabinetModel>(`${BASE_URL}/cabinets/${id}/completer-profil`, payload);
  }

  /**
   * TODO : route NON confirmée avec le back-end. `PATCH /cabinets/{id}`
   * figurait dans une version antérieure du contrat d'API (§8) — « Informations
   * du cabinet mises à jour » — mais a disparu de la version actuelle : seules
   * `/cabinets/{id}/valider` et `/admin/cabinets` y figurent encore pour {id}.
   * Utilisée par vitrine-edition pour l'édition continue (nom, coordonnées,
   * profil, horaires...). Volontairement DISTINCTE de completerProfil() —
   * ne pas fusionner les deux : completerProfil() fait passer le statut de
   * profilIncomplet à enAttente côté back, ce qui resoumettrait à tort un
   * cabinet déjà validé à chaque modification mineure depuis vitrine-edition.
   * Hypothèse provisoire par symétrie avec l'ancienne version du contrat,
   * à confirmer avant utilisation réelle.
   */
  mettreAJour(id: string, payload: ModifierCabinetPayload): Observable<CabinetModel> {
    return this.http.patch<CabinetModel>(`${BASE_URL}/cabinets/${id}`, payload);
  }

  /** GET /admin/cabinets — TOUS les cabinets, y compris non validés (Super Admin). Le filtre sur statutValidation === 'enAttente' se fait côté composant. */
  listerEnAttente(): Observable<CabinetModel[]> {
    return this.http.get<CabinetModel[]>(`${BASE_URL}/admin/cabinets`);
  }

  /** PATCH /cabinets/{id}/valider */
  valider(id: string): Observable<CabinetModel> {
    return this.http.patch<CabinetModel>(`${BASE_URL}/cabinets/${id}/valider`, {});
  }

  /**
   * TODO : route NON confirmée avec le back-end — n'apparaît pas dans le
   * contrat d'API §8 (seule `/valider` y figure), alors que la maquette et
   * le §9.7 du cahier des charges exigent un bouton « Rejeter ».
   * `PATCH /cabinets/{id}/rejeter` est une hypothèse provisoire par symétrie
   * avec `/valider`, à confirmer avant utilisation réelle.
   */
  rejeter(id: string): Observable<CabinetModel> {
    return this.http.patch<CabinetModel>(`${BASE_URL}/cabinets/${id}/rejeter`, {});
  }
}
