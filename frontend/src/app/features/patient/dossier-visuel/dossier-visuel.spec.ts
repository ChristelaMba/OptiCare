import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DossierVisuel } from './dossier-visuel';

describe('DossierVisuel', () => {
  let component: DossierVisuel;
  let fixture: ComponentFixture<DossierVisuel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DossierVisuel],
    }).compileComponents();

    fixture = TestBed.createComponent(DossierVisuel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
