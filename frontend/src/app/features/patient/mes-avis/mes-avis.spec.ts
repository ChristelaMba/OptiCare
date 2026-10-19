import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MesAvis } from './mes-avis';

describe('MesAvis', () => {
  let component: MesAvis;
  let fixture: ComponentFixture<MesAvis>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesAvis],
    }).compileComponents();

    fixture = TestBed.createComponent(MesAvis);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
