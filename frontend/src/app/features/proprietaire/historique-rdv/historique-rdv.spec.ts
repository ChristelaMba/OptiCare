import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { HistoriqueRdv } from './historique-rdv';

describe('HistoriqueRdv', () => {
  let component: HistoriqueRdv;
  let fixture: ComponentFixture<HistoriqueRdv>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoriqueRdv],
      providers: [provideRouter([]), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoriqueRdv);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
