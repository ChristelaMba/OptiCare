import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FactureOrdonnance } from './facture-ordonnance';

describe('FactureOrdonnance', () => {
  let component: FactureOrdonnance;
  let fixture: ComponentFixture<FactureOrdonnance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FactureOrdonnance],
    }).compileComponents();

    fixture = TestBed.createComponent(FactureOrdonnance);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
