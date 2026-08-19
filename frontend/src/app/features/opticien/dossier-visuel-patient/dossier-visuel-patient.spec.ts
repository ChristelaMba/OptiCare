import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DossierVisuelPatient } from './dossier-visuel-patient';

describe('DossierVisuelPatient', () => {
  let component: DossierVisuelPatient;
  let fixture: ComponentFixture<DossierVisuelPatient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DossierVisuelPatient],
    }).compileComponents();

    fixture = TestBed.createComponent(DossierVisuelPatient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
