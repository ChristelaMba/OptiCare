import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CompleterProfilCabinet } from './completer-profil-cabinet';

describe('CompleterProfilCabinet', () => {
  let component: CompleterProfilCabinet;
  let fixture: ComponentFixture<CompleterProfilCabinet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompleterProfilCabinet],
      providers: [provideRouter([]), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(CompleterProfilCabinet);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
