import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VitrineCabinet } from './vitrine-cabinet';

describe('VitrineCabinet', () => {
  let component: VitrineCabinet;
  let fixture: ComponentFixture<VitrineCabinet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VitrineCabinet],
    }).compileComponents();

    fixture = TestBed.createComponent(VitrineCabinet);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
