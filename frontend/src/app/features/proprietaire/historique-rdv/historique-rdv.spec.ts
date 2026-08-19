import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoriqueRdv } from './historique-rdv';

describe('HistoriqueRdv', () => {
  let component: HistoriqueRdv;
  let fixture: ComponentFixture<HistoriqueRdv>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoriqueRdv],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoriqueRdv);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
