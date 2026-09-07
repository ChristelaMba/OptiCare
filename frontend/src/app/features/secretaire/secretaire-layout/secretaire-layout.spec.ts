import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SecretaireLayout } from './secretaire-layout';

describe('SecretaireLayout', () => {
  let component: SecretaireLayout;
  let fixture: ComponentFixture<SecretaireLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecretaireLayout],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SecretaireLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
