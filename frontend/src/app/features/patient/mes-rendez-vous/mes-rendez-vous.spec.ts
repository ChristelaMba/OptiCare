import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MesRendezVous } from './mes-rendez-vous';

describe('MesRendezVous', () => {
  let component: MesRendezVous;
  let fixture: ComponentFixture<MesRendezVous>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesRendezVous],
    }).compileComponents();

    fixture = TestBed.createComponent(MesRendezVous);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
