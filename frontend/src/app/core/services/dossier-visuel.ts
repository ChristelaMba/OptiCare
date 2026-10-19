import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiConsultationBrute,
  ApiPrescriptionOeilBrute,
  FicheConsultationResume,
  PatientDossier,
  Prescription,
  PrescriptionOeilAffichage,
} from '../../models/dossier-visuel.model';
import { Auth } from './auth';
import { Cabinet } from './cabinet';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

const LIBELLES_PLAINTES: Record<string, string> = {
  vision_flou_loin: 'Vision floue de loin',
  vision_flou_pres: 'Vision floue de près',
  vision_double: 'Vision double',
  demangeaisons: 'Démangeaisons',
  larmoiement: 'Larmoiement',
};

/**
 * Dossier visuel du patient connecté (19/10/2026) :
 * - `GET /patients/{patientId}/consultations` (ROUTES-API-LIONEL §8.5, `data.consultations[]`) ; le patient est
 *   identifié par `user.patient.id` (≠ id utilisateur), récupéré par `GET /user` si la session ne le porte pas ;
 * - `GET /patients/{patientId}/dossier-pdf?cabinet_id=` (§16.1), fichier binaire.
 * L'API ne renvoie pas d'objet `cabinet` dans les consultations (seulement `cabinet_id`) : le nom vient de la liste
 * publique des cabinets.
 */
@Injectable({
  providedIn: 'root',
})
export class DossierVisuelService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);
  private readonly cabinetService = inject(Cabinet);

  getMonDossier(): Observable<PatientDossier> {
    const utilisateur = this.auth.utilisateur();
    if (!utilisateur) {
      return throwError(() => new Error('Aucun utilisateur connecté'));
    }

    const patientId$ = utilisateur.patientId
      ? of(utilisateur.patientId)
      : this.auth.rafraichirUtilisateur().pipe(
          switchMap((u) => (u.patientId ? of(u.patientId) : throwError(() => new Error('Identifiant patient introuvable')))),
        );

    return patientId$.pipe(
      switchMap((patientId) =>
        forkJoin({
          consultations: this.http.get<{ data: { consultations: ApiConsultationBrute[] } }>(
            `${BASE_URL}/patients/${patientId}/consultations`,
          ),
          // Un échec de la liste des cabinets ne bloque pas le dossier : les noms restent vides.
          cabinets: this.cabinetService.listerPublics().pipe(catchError(() => of([]))),
        }).pipe(
          map(({ consultations, cabinets }) => {
            const noms = new Map(cabinets.map((c) => [String(c.id), c.nom]));
            return {
              patientId,
              prenom: utilisateur.prenom,
              nom: utilisateur.nom,
              fiches: consultations.data.consultations
                .map((c) => DossierVisuelService.normaliser(c, noms))
                .sort((a, b) => b.date.localeCompare(a.date)),
            };
          }),
        ),
      ),
    );
  }

  /** GET /patients/{patientId}/dossier-pdf?cabinet_id= — blob + nom de fichier (Content-Disposition, sinon `dossier-{nom}-{prenom}.pdf`). */
  telechargerDossierPdf(patientId: string, cabinetId: string): Observable<{ blob: Blob; nomFichier: string }> {
    return this.http
      .get(`${BASE_URL}/patients/${patientId}/dossier-pdf`, {
        params: { cabinet_id: cabinetId },
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((reponse: HttpResponse<Blob>) => ({
          blob: reponse.body as Blob,
          nomFichier: DossierVisuelService.nomFichier(reponse.headers.get('Content-Disposition'), this.auth.utilisateur()),
        })),
      );
  }

  /** Extrait `filename*=UTF-8''…` ou `filename="…"` ; sinon nom de repli. */
  static nomFichier(contentDisposition: string | null, utilisateur: { nom: string; prenom: string } | null): string {
    const etendu = contentDisposition?.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (etendu) {
      try {
        return decodeURIComponent(etendu[1].trim());
      } catch {
        /* nom mal encodé : on essaie la forme simple */
      }
    }
    const simple = contentDisposition?.match(/filename\s*=\s*"?([^";]+)"?/i);
    if (simple?.[1].trim()) {
      return simple[1].trim();
    }
    const nettoyer = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return `dossier-${nettoyer(utilisateur?.nom ?? '') || 'patient'}-${nettoyer(utilisateur?.prenom ?? '') || 'dossier'}.pdf`;
  }

  private static normaliser(brute: ApiConsultationBrute, nomsCabinets: Map<string, string>): FicheConsultationResume {
    const cabinetId = String(brute.cabinet_id);
    const opticien = [brute.opticien?.prenom, brute.opticien?.nom].filter(Boolean).join(' ').trim();
    return {
      id: String(brute.id),
      date: brute.date_consultation.slice(0, 10),
      motif: brute.motif ?? '',
      cabinetId,
      cabinet: brute.cabinet?.nom ?? nomsCabinets.get(cabinetId) ?? null,
      opticien: opticien || null,
      statut: brute.statut,
      plaintes: DossierVisuelService.plaintes(brute.plaintes),
      observations: brute.observations || undefined,
      prescription: DossierVisuelService.prescription(brute.prescription),
    };
  }

  private static plaintes(brutes: ApiConsultationBrute['plaintes']): string | undefined {
    if (!brutes) return undefined;
    const liste = Object.entries(brutes)
      .filter(([cle, valeur]) => valeur === true && LIBELLES_PLAINTES[cle])
      .map(([cle]) => LIBELLES_PLAINTES[cle]);
    const autres = typeof brutes['autres'] === 'string' ? brutes['autres'].trim() : '';
    if (autres) liste.push(autres);
    return liste.length ? liste.join(', ') : undefined;
  }

  /** Ne renvoie une prescription que si l'API fournit au moins une valeur. */
  private static prescription(brute: ApiConsultationBrute['prescription']): Prescription | undefined {
    const oeil = (o?: ApiPrescriptionOeilBrute | null): PrescriptionOeilAffichage | null => {
      if (!o || Object.values(o).every((v) => v === null || v === undefined || v === '')) return null;
      return {
        sphere: o.sphere ?? '',
        cylindre: o.cylindre ?? '',
        axe: o.axe ?? '',
        add: o.addition ?? undefined,
        avl: o.acuite_loin ?? undefined,
        avp: o.acuite_pres ?? undefined,
      };
    };
    const od = oeil(brute?.od);
    const og = oeil(brute?.og);
    if (!od && !og) return undefined;
    const vide: PrescriptionOeilAffichage = { sphere: '', cylindre: '', axe: '' };
    return { oeilDroit: od ?? vide, oeilGauche: og ?? vide };
  }
}
