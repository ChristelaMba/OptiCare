import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DashboardComptable } from './dashboard-comptable';

describe('DashboardComptable', () => {
  let component: DashboardComptable;
  let fixture: ComponentFixture<DashboardComptable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComptable],
      providers: [provideRouter([]), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComptable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
