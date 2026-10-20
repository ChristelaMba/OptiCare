import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { SuperAdminDemo } from './super-admin-demo';

/**
 * ⚠️ Service de démonstration (aucune route serveur pour le Dashboard, le
 * Journal d'audit et les Paramètres). Ces tests verrouillent surtout la
 * cohérence interne des jeux de données — notamment le décompte de comptes,
 * partagé avec l'écran de gestion (78).
 */
describe('SuperAdminDemo', () => {
  let service: SuperAdminDemo;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SuperAdminDemo);
  });

  it('expose 78 comptes au total', () => {
    expect(SuperAdminDemo.TOTAL_COMPTES).toBe(78);
  });

  it('dashboard : ventilation cabinets cohérente et somme des rôles = TOTAL_COMPTES', async () => {
    const d = await firstValueFrom(service.obtenirTableauDeBord());

    const totalCabinets = d.cabinets.reduce((s, c) => s + c.total, 0);
    expect(totalCabinets).toBe(d.cabinetsEnregistres);

    const totalRoles = d.repartitionRoles.reduce((s, r) => s + r.total, 0);
    expect(totalRoles).toBe(d.comptesTotal);
    expect(d.comptesTotal).toBe(SuperAdminDemo.TOTAL_COMPTES);

    expect(d.dernieresActivites.length).toBe(5);
    expect(d.inscriptions.length).toBeGreaterThan(0);
    expect(d.consultations.length).toBe(d.inscriptions.length);
  });

  it('journal d’audit : identifiants uniques et horodatages ordonnés (plus récent d’abord)', async () => {
    const evenements = await firstValueFrom(service.listerEvenementsAudit());

    expect(evenements.length).toBeGreaterThan(0);
    const ids = new Set(evenements.map((e) => e.id));
    expect(ids.size).toBe(evenements.length);

    for (let i = 1; i < evenements.length; i++) {
      expect(evenements[i - 1].horodatage.getTime()).toBeGreaterThanOrEqual(evenements[i].horodatage.getTime());
    }
  });

  it('paramètres : devise par défaut FCFA et valeurs non vides', async () => {
    const p = await firstValueFrom(service.obtenirParametres());

    expect(p.devise).toBe('FCFA');
    expect(p.nomPlateforme).not.toBe('');
    expect(p.emailSupport).toContain('@');
    expect(p.delaiSessionMinutes).toBeGreaterThan(0);
  });

  it('modèles de messages : clés uniques, objet et corps renseignés', async () => {
    const modeles = await firstValueFrom(service.listerModelesMessages());

    expect(modeles.length).toBeGreaterThan(0);
    const cles = new Set(modeles.map((m) => m.cle));
    expect(cles.size).toBe(modeles.length);
    for (const modele of modeles) {
      expect(modele.objet).not.toBe('');
      expect(modele.corps).not.toBe('');
    }
  });
});
