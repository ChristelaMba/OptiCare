import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VitrineEdition } from './vitrine-edition';

describe('VitrineEdition', () => {
  let component: VitrineEdition;
  let fixture: ComponentFixture<VitrineEdition>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VitrineEdition],
    }).compileComponents();

    fixture = TestBed.createComponent(VitrineEdition);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
