import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { NouvelleFicheConsultation } from './nouvelle-fiche-consultation';

describe('NouvelleFicheConsultation', () => {
  let component: NouvelleFicheConsultation;
  let fixture: ComponentFixture<NouvelleFicheConsultation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NouvelleFicheConsultation],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(NouvelleFicheConsultation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
