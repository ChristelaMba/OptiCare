import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { GestionEmployes } from './gestion-employes';

describe('GestionEmployes', () => {
  let component: GestionEmployes;
  let fixture: ComponentFixture<GestionEmployes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionEmployes],
      providers: [provideRouter([]), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionEmployes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
