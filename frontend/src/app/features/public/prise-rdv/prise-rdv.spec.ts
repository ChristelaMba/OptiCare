import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { PriseRdv } from './prise-rdv';

describe('PriseRdv', () => {
  let component: PriseRdv;
  let fixture: ComponentFixture<PriseRdv>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriseRdv],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(PriseRdv);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
