import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiCreationRdvCorps,
  ApiCreneauxEnveloppe,
  ApiPlageBrute,
  ApiPlagesEnveloppe,
  PlageHoraire,
  ApiRdvBrut,
  ApiRdvEnveloppe,
  ApiRdvsEnveloppe,
  CreneauReel,
  NouveauRendezVousPayload,
  RendezVous,
} from '../../models/rendez-vous.model';
import { Auth } from './auth';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

/**
 * 19/10/2026 : `creer()` branchée sur POST /rdv (réel), `getMesRendezVous()` mappe la forme réelle.
 *
 * 2026-09-11 : connectivité testée route par route sur les vrais noms
 * transmis par Lionel (voir POINTS-A-CONFIRMER-BACKEND.md §12). Résultat
 * MIXTE — seules `listerCreneaux()` et `getMesRendezVous()` tapent l'API
 * réelle. Le reste de ce service (`creer`, `listerParCabinet`,
 * `mettreAJourStatut`, `annulerRendezVous`) continue d'appeler les
 * anciennes routes `/rendezvous`, `/cabinets/{id}/rendezvous`,
 * `/rendez-vous/mes-rendez-vous` — volontairement inchangées, toujours
 * servies par `mock-rendezvous-interceptor.ts` (encore actif dans
 * `app.config.ts`) — parce que leurs équivalents réels sont soit cassés
 * côté back (`PUT /rdv/{id}/confirmer|terminer|non-honore` → 500,
 * `GET /cabinets/{id}/rdv` → 500, même bug de middleware que Cabinets),
 * soit non testés en écriture réelle sur consigne explicite
 * (`POST /rdv` : sondé en validation seulement, 422 propre sur corps
 * vide — jamais testé avec un vrai payload).
 */
@Injectable({
  providedIn: 'root'
})
export class RendezVousService {

  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);

  /**
   * POST /rdv — ✅ RÉEL, testé le 18/10/2026 (201). Patient connecté : RDV
   * `confirme` immédiatement, le serveur déduit le patient du token, on
   * n'envoie donc aucun `visiteur_*`. Visiteur (ou compte non patient) :
   * RDV `reserve`, en attente de confirmation par le cabinet.
   * `nomComplet` est scindé : premier mot → `visiteur_prenom`, reste →
   * `visiteur_nom`. Le serveur exige `visiteur_telephone` pour un visiteur
   * (sinon 500 SQL, ticket back n°4) : le formulaire le rend obligatoire.
   */
  creer(payload: NouveauRendezVousPayload): Observable<RendezVous> {
    const corps: ApiCreationRdvCorps = {
      cabinet_id: Number(payload.cabinetId),
      date: payload.date,
      heure_debut: payload.heure,
    };
    if (payload.motif) corps.motif = payload.motif;

    if (this.auth.role() !== 'patient') {
      const mots = payload.nomComplet.trim().split(/\s+/);
      const prenom = mots.length > 1 ? mots[0] : '';
      const nom = mots.length > 1 ? mots.slice(1).join(' ') : mots[0];
      corps.visiteur_nom = nom;
      if (prenom) corps.visiteur_prenom = prenom;
      corps.visiteur_telephone = payload.telephone;
      if (payload.email) corps.visiteur_email = payload.email;
    }

    return this.http
      .post<ApiRdvEnveloppe>(`${BASE_URL}/rdv`, corps)
      .pipe(map((enveloppe) => RendezVousService.normaliserRdv(enveloppe.data.rdv)));
  }

  /**
   * GET /cabinets/{id}/rendezvous — mock, voir commentaire de tête. Le
   * vrai équivalent (`GET /cabinets/{id}/rdv`, utilisé par `agenda` et
   * `historique-rdv`) renvoie `500` (bug de middleware `CheckRole`),
   * confirmé le 11/09 avec un token valide — pas de route de repli.
   */
  listerParCabinet(cabinetId: string): Observable<RendezVous[]> {
    return this.http.get<RendezVous[]>(`${BASE_URL}/cabinets/${cabinetId}/rendezvous`);
  }

  /** PATCH /rendezvous/{id} — mock, voir commentaire de tête. Les vraies routes d'action (`PUT /rdv/{id}/confirmer|terminer|non-honore`) renvoient 500 pour tout le monde. */
  mettreAJourStatut(id: string, statut: RendezVous['statut']): Observable<RendezVous> {
    return this.http.patch<RendezVous>(`${BASE_URL}/rendezvous/${id}`, { statut });
  }

  /**
   * PUT /rdv/{id}/annuler — ✅ RÉEL, testé le 19/10/2026 (200, `data.rdv.statut = "annule"`).
   * Remplace l'ancien `PATCH /rendezvous/{id}` (route de mock, inexistante en prod → 404).
   * Annuler un RDV déjà annulé renvoie 500 côté serveur (ticket back n°7) : l'écran
   * n'appelle pas la route pour un RDV déjà annulé.
   */
  annulerRendezVous(id: string): Observable<RendezVous> {
    return this.http
      .put<ApiRdvEnveloppe>(`${BASE_URL}/rdv/${id}/annuler`, {})
      .pipe(map((enveloppe) => RendezVousService.normaliserRdv(enveloppe.data.rdv)));
  }

  /**
   * GET /cabinets/{id}/slots?date=YYYY-MM-DD — ✅ RÉEL, confirmé le 11/09
   * (200, enveloppe `{ data: { date, slots } }`). `slots` toujours vide
   * dans tous les tests (aucun cabinet n'a de disponibilités configurées)
   * — la forme d'un créneau individuel reste une hypothèse, voir
   * `ApiCreneauxEnveloppe` (rendez-vous.model.ts). Pas encore consommée
   * par un écran (voir `prise-rdv.ts`, laissé inchangé pour cette raison).
   */
  listerCreneaux(cabinetId: string, date: string): Observable<CreneauReel[]> {
    const params = new HttpParams().set('date', date);
    return this.http
      .get<ApiCreneauxEnveloppe>(`${BASE_URL}/cabinets/${cabinetId}/slots`, { params })
      .pipe(
        map((enveloppe) =>
          enveloppe.data.slots.map((slot) => ({
            heure: slot.heure_debut,
            disponible: slot.disponible && !slot.est_reserve && !slot.est_dans_pause,
            estReserve: slot.est_reserve,
            estDansPause: slot.est_dans_pause,
          })),
        ),
      );
  }

  /**
   * GET /cabinets/{id}/creneaux — plages horaires hebdomadaires du cabinet (public, ROUTES-API-LIONEL §4.2).
   * Sert à griser les jours fermés et à distinguer « le cabinet n'a aucune plage » de « aucun créneau ce jour-là ».
   */
  listerPlages(cabinetId: string): Observable<PlageHoraire[]> {
    return this.http
      .get<ApiPlagesEnveloppe>(`${BASE_URL}/cabinets/${cabinetId}/creneaux`)
      .pipe(map((enveloppe) => enveloppe.data.creneaux.map(RendezVousService.normaliserPlage)));
  }

  private static normaliserPlage(brute: ApiPlageBrute): PlageHoraire {
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    return {
      jourSemaine: jours.indexOf(brute.jour_semaine.toLowerCase()),
      heureDebut: brute.heure_debut,
      heureFin: brute.heure_fin,
      estActif: !!brute.est_actif,
    };
  }

  /**
   * GET /patients/{patientId}/rdv — ✅ RÉEL, confirmé le 11/09 (200,
   * enveloppe `{ data: { rdvs: [...] } }`). `rdvs` toujours vide dans tous
   * les tests, y compris avec un id manifestement inexistant — forte
   * présomption que `{patientId}` n'est pas utilisé pour filtrer (le back
   * déduirait le patient du token), mais non prouvé faute de données
   * réelles. `patientId` fourni par l'appelant (`this.auth.utilisateur()?.id`
   * dans `mes-rendez-vous.ts`, même convention que les autres écrans qui
   * résolvent l'identité côté composant).
   *
   * 18/10/2026 : `{patientId}` EST utilisé pour filtrer, et c'est l'id de la
   * table `patients` (`Utilisateur.patientId`), pas l'id utilisateur
   * (user 21 → `[]`, patient 13 → ses RDV). Forme réelle mappée par
   * `normaliserRdv()`.
   */
  getMesRendezVous(patientId: string): Observable<RendezVous[]> {
    return this.http
      .get<ApiRdvsEnveloppe>(`${BASE_URL}/patients/${patientId}/rdv`)
      .pipe(map((enveloppe) => enveloppe.data.rdvs.map(RendezVousService.normaliserRdv)));
  }

  /** snake_case (API réelle) → camelCase (front). `date` ramenée à `YYYY-MM-DD`. */
  private static normaliserRdv(brut: ApiRdvBrut): RendezVous {
    return {
      id: String(brut.id),
      cabinetId: String(brut.cabinet_id),
      cabinetNom: brut.cabinet?.nom ?? '',
      cabinetAdresse: brut.cabinet
        ? [brut.cabinet.adresse, brut.cabinet.ville].filter(Boolean).join(', ') || undefined
        : undefined,
      motif: brut.motif ?? '',
      date: brut.date.slice(0, 10),
      heureDebut: brut.heure_debut,
      heureFin: brut.heure_fin,
      statut: brut.statut,
    };
  }
}
