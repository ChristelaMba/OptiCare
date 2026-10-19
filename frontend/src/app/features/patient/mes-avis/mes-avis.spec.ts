import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MesAvis } from './mes-avis';

describe('MesAvis', () => {
  let component: MesAvis;
  let fixture: ComponentFixture<MesAvis>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesAvis],
    }).compileComponents();

    fixture = TestBed.createComponent(MesAvis);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('aucun établissement inventé : pas d\'« OptiCare Centre », pas de bouton « Laisser un avis »', () => {
    const el = fixture.nativeElement as HTMLElement;

    expect(component.cabinetsEligibles()).toEqual([]);
    expect(el.textContent).not.toContain('OptiCare Centre');
    expect(el.textContent).not.toContain('Laisser un avis');
    expect(el.querySelector('.cabinet-card')).toBeNull();
  });

  it('état vide honnête : un avis est possible après une consultation terminée', () => {
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Vous pourrez laisser un avis après une consultation terminée.');
  });
});
