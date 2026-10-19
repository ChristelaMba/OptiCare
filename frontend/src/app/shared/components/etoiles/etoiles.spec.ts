import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Etoiles } from './etoiles';

describe('Etoiles', () => {
  let component: Etoiles;
  let fixture: ComponentFixture<Etoiles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Etoiles],
    }).compileComponents();

    fixture = TestBed.createComponent(Etoiles);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
