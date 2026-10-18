import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { OpticienLayout } from './opticien-layout';

describe('OpticienLayout', () => {
  let component: OpticienLayout;
  let fixture: ComponentFixture<OpticienLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([])],
      imports: [OpticienLayout],
    }).compileComponents();

    fixture = TestBed.createComponent(OpticienLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
