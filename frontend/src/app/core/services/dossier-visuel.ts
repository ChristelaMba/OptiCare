import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Auth } from './auth';
import {
  DocumentMedical,
  FicheConsultationResume,
  PatientDossier,
  PrescriptionOeilAffichage,
} from '../../models/dossier-visuel.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

/** Premier champ non vide parmi plusieurs noms possibles (l'API n'est documentée qu'en partie). */
function pick(source: any, ...cles: string[]): any {
  for (const cle of cles) {
    const valeur = source?.[cle];
    if (valeur !== undefined && valeur !== null && valeur !== '') return valeur;
  }
  return undefined;
}

@Injectable({ providedIn: 'root' })
export class DossierVisuelService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);

  /** GET /patients/{id}/consultations — id = utilisateur connecté. */
  getMonDossier(): Observable<PatientDossier> {
    const utilisateur = this.auth.utilisateur();
    if (!utilisateur) {
      return throwError(() => new Error('Aucun utilisateur connecté'));
    }

    return this.http
      .get<{ data: { consultations: any[] } }>(`${BASE_URL}/patients/${utilisateur.id}/consultations`)
      .pipe(
        map((reponse) => {
          const brutes = reponse.data?.consultations ?? [];
          console.log('[dossier-visuel] réponse brute :', brutes); // à retirer une fois le mapping validé

          return {
            prenom: utilisateur.prenom,
            nom: utilisateur.nom,
            fiches: brutes
              .map(DossierVisuelService.normaliserFiche)
              .sort((a, b) => b.date.localeCompare(a.date)),
          } as PatientDossier;
        }),
      );
  }

  /** Aucune route de téléchargement de document n'existe dans l'API pour l'instant. */
  telechargerDocument(documentId: string): Observable<Blob> {
    return throwError(() => new Error(`Téléchargement indisponible (${documentId})`));
  }

  private static normaliserFiche(c: any): FicheConsultationResume {
    const p = c.plaintes ?? {};
    const libellesPlaintes: string[] = [];
    if (pick(p, 'vision_flou_loin', 'visionFlouLoin', 'plainte_vision_flou_loin'))
      libellesPlaintes.push("Baisse d'acuité visuelle de loin");
    if (pick(p, 'vision_flou_pres', 'visionFlouPres', 'plainte_vision_flou_pres'))
      libellesPlaintes.push("Baisse d'acuité visuelle de près");
    if (pick(p, 'vision_double', 'visionDouble', 'plainte_vision_double'))
      libellesPlaintes.push('Vision double');
    if (pick(p, 'demangeaisons', 'plainte_demangeaisons')) libellesPlaintes.push('Démangeaisons');
    if (pick(p, 'larmoiement', 'plainte_larmoiement')) libellesPlaintes.push('Larmoiement');

    const autres = pick(p, 'autres', 'plainte_autres') ?? c.plainte_autres;
    if (autres) libellesPlaintes.push(String(autres));

    const od = c.prescription?.od;
    const og = c.prescription?.og;

    const dateBrute = String(c.date_consultation ?? c.created_at ?? '').replace(' ', 'T');

    return {
      id: String(c.id),
      date: dateBrute.slice(0, 10),
      motif: c.motif ?? 'Consultation',
      cabinet: c.cabinet?.nom ?? 'Cabinet',
      plaintes: libellesPlaintes.length ? libellesPlaintes.join(', ') : undefined,
      observations: c.observations ?? undefined,
      prescription: od || og
        ? {
            oeilDroit: DossierVisuelService.normaliserOeil(od),
            oeilGauche: DossierVisuelService.normaliserOeil(og),
          }
        : undefined,
      documents: [] as DocumentMedical[],
    };
  }

  private static normaliserOeil(o: any): PrescriptionOeilAffichage {
    const texte = (v: unknown) => (v === undefined || v === null ? '' : String(v));
    return {
      sphere: texte(pick(o, 'sphere')),
      cylindre: texte(pick(o, 'cylindre')),
      axe: texte(pick(o, 'axe')),
      add: texte(pick(o, 'addition', 'add')),
      avl: texte(pick(o, 'acuite_loin', 'avl')),
      avp: texte(pick(o, 'acuite_pres', 'avp')),
    };
  }
}