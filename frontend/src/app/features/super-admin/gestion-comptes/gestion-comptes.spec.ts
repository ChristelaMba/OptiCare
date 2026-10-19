import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { GestionComptes } from './gestion-comptes';

describe('GestionComptes', () => {
  let component: GestionComptes;
  let fixture: ComponentFixture<GestionComptes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionComptes],
      providers: [provideRouter([]), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionComptes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
