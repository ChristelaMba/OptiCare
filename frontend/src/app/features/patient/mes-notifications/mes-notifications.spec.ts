import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import { provideRouter } from '@angular/router';
import localeFr from '@angular/common/locales/fr';

import { MesNotifications } from './mes-notifications';

// Le template utilise `| date:…:'fr'` : locale à enregistrer avant le rendu (NG0701).
registerLocaleData(localeFr);

describe('MesNotifications', () => {
  let component: MesNotifications;
  let fixture: ComponentFixture<MesNotifications>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([])],
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
