import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { PatientLayout } from './patient-layout';
import { Auth } from '../../../core/services/auth';

describe('PatientLayout', () => {
  let component: PatientLayout;
  let fixture: ComponentFixture<PatientLayout>;

  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [PatientLayout],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(Auth).simulerConnexion('patient');

    fixture = TestBed.createComponent(PatientLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('affiche le nom et les initiales de la session, jamais un nom codé en dur', () => {
    const html: string = fixture.nativeElement.textContent;

    expect(component.nomComplet()).toBe('Patient Test');
    expect(component.initiales()).toBe('PT');
    expect(html).toContain('Patient Test');
    expect(html).not.toContain('Jean Dupont');
  });

  it('n\'affiche aucun faux compteur de notifications', () => {
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.notification-badge')).toBeNull();
    expect(el.querySelector('.sidebar-notification-badge')).toBeNull();
    expect(el.querySelector('.mobile-notification span')).toBeNull();
  });
});
