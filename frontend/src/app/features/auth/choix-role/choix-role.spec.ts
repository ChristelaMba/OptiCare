import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoixRole } from './choix-role';

describe('ChoixRole', () => {
  let component: ChoixRole;
  let fixture: ComponentFixture<ChoixRole>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChoixRole],
    }).compileComponents();

    fixture = TestBed.createComponent(ChoixRole);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
