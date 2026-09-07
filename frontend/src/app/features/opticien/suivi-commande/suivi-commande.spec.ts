import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { SuiviCommande } from './suivi-commande';

describe('SuiviCommande', () => {
  let component: SuiviCommande;
  let fixture: ComponentFixture<SuiviCommande>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuiviCommande],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(SuiviCommande);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
