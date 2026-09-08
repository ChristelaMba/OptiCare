import { Service } from '@angular/core';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { PatientDossier } from '../../models/dossier-visuel.model';

@Injectable({
  providedIn: 'root'
})
export class DossierVisuelService {

  private apiUrl = 'http://localhost:8000/api/patient/dossier-visuel';

  constructor(private http: HttpClient) {}

  getMonDossier(): Observable<PatientDossier> {
    // Une fois l'API Laravel prête, décommenter :
    // return this.http.get<PatientDossier>(this.apiUrl);

    const mock: PatientDossier = {
      prenom: 'Jean',
      nom: 'Dupont',
      age: 45,
      sexe: 'Homme',
      fiches: [
        {
          id: '1',
          date: '2024-01-14',
          motif: 'Examen de la vue standard',
          cabinet: 'OptiCare Centre Paris',
          plaintes: 'Baisse d\'acuité visuelle de près, léger inconfort en fin de journée.',
          observations: 'Presbytie débutante confirmée. Prescription ajustée pour verres progressifs.',
          prescription: {
            oeilDroit: { sphere: '-2.50', cylindre: '-1.00', axe: '90°', add: '+1.50', avl: '10/10', avp: 'P2' },
            oeilGauche: { sphere: '-2.25', cylindre: '-0.75', axe: '85°', add: '+1.50', avl: '10/10', avp: 'P2' }
          },
          documents: [
            { id: 'd1', nom: 'Ordonnance verres progressifs', date: '2024-01-14', taille: '182 Ko' },
            { id: 'd2', nom: 'Facture consultation', date: '2024-01-14', taille: '96 Ko' }
          ],
          dossierPdf: { id: 'pdf1', nom: 'Dossier complet', date: '2024-01-14' }
        },
        {
          id: '2',
          date: '2022-11-05',
          motif: 'Adaptation lentilles',
          cabinet: 'OptiCare Centre Paris',
          observations: 'Essai de lentilles mensuelles souples. Manipulation acquise.',
          prescription: {
            oeilDroit: { sphere: '-2.25', cylindre: '-0.75', axe: '88°' },
            oeilGauche: { sphere: '-2.00', cylindre: '-0.50', axe: '82°' }
          },
          documents: []
        }
      ]
    };

    return of(mock);
  }

  telechargerDocument(documentId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documents/${documentId}`, { responseType: 'blob' });
  }
  
}
