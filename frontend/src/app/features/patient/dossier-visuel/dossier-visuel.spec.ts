import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import localeFr from '@angular/common/locales/fr';

import { DossierVisuel } from './dossier-visuel';

// Le template affiche des dates via `| date:…:'fr'` : les données du locale
// français doivent être enregistrées avant le rendu, sinon `DatePipe` lève
// NG0701 (Missing locale data for the locale "fr").
registerLocaleData(localeFr);

describe('DossierVisuel', () => {
  let component: DossierVisuel;
  let fixture: ComponentFixture<DossierVisuel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DossierVisuel],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(DossierVisuel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
