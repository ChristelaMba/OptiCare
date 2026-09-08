import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { MesRendezVous } from './mes-rendez-vous';

describe('MesRendezVous', () => {
  let component: MesRendezVous;
  let fixture: ComponentFixture<MesRendezVous>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesRendezVous],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(MesRendezVous);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
