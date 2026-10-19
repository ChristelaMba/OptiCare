import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MesNotifications } from './mes-notifications';

describe('MesNotifications', () => {
  let component: MesNotifications;
  let fixture: ComponentFixture<MesNotifications>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesNotifications],
    }).compileComponents();

    fixture = TestBed.createComponent(MesNotifications);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
