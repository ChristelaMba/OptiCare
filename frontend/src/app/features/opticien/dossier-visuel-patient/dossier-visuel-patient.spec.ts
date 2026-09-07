import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DossierVisuelPatient } from './dossier-visuel-patient';

describe('DossierVisuelPatient', () => {
  let component: DossierVisuelPatient;
  let fixture: ComponentFixture<DossierVisuelPatient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DossierVisuelPatient],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(DossierVisuelPatient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
