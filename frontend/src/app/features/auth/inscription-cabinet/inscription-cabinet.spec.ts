import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { InscriptionCabinet } from './inscription-cabinet';

describe('InscriptionCabinet', () => {
  let component: InscriptionCabinet;
  let fixture: ComponentFixture<InscriptionCabinet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InscriptionCabinet],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(InscriptionCabinet);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
