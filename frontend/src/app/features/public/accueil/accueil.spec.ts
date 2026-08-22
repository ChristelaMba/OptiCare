import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Accueil } from './accueil';

describe('Accueil', () => {
  let component: Accueil;
  let fixture: ComponentFixture<Accueil>;

  beforeEach(async () => {
    // jsdom (environnement de test) ne fournit pas IntersectionObserver, utilisé
    // par Accueil.ngAfterViewInit pour suivre la section visible au scroll.
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };

    await TestBed.configureTestingModule({
      imports: [Accueil],
      providers: [provideRouter([]), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Accueil);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
