import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompleterDossierVisuel } from './completer-dossier-visuel';

describe('CompleterDossierVisuel', () => {
  let component: CompleterDossierVisuel;
  let fixture: ComponentFixture<CompleterDossierVisuel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompleterDossierVisuel],
    }).compileComponents();

    fixture = TestBed.createComponent(CompleterDossierVisuel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
