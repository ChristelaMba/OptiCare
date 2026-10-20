import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ValidationCabinets } from './validation-cabinets';
import { Auth } from '../../../core/services/auth';

describe('ValidationCabinets', () => {
  let component: ValidationCabinets;
  let fixture: ComponentFixture<ValidationCabinets>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationCabinets],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ValidationCabinets);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sidebar : profil (initiales + nom) et déconnexion en pied de menu', async () => {
    TestBed.inject(Auth).simulerConnexion('super_admin');
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('nav') as HTMLElement;
    const profil = nav.querySelector('.rounded-full') as HTMLElement;
    expect(profil.textContent?.trim()).toBe('ST'); // prénom "Super Administrateur", nom "Test"
    expect(nav.textContent).toContain('Super Administrateur Test');
    expect(nav.textContent).toContain('Déconnexion');

    // Le profil précède la déconnexion (bloc profil + bouton en pied de sidebar).
    const bouton = [...nav.querySelectorAll('button')].find((b) => b.textContent?.includes('Déconnexion')) as Node;
    const position = profil.compareDocumentPosition(bouton);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    sessionStorage.clear();
    localStorage.clear();
  });
});
