import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendrierCrenaux } from './calendrier-crenaux';

describe('CalendrierCrenaux', () => {
  let component: CalendrierCrenaux;
  let fixture: ComponentFixture<CalendrierCrenaux>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendrierCrenaux],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendrierCrenaux);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
