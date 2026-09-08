import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChampRecherche } from './champ-recherche';

describe('ChampRecherche', () => {
  let component: ChampRecherche;
  let fixture: ComponentFixture<ChampRecherche>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChampRecherche],
    }).compileComponents();

    fixture = TestBed.createComponent(ChampRecherche);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
