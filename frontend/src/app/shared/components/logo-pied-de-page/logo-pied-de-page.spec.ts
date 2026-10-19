import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { LogoPiedDePage } from './logo-pied-de-page';
import { RechercheCabinets } from '../../../features/public/recherche-cabinets/recherche-cabinets';

describe('LogoPiedDePage', () => {
  it('logo posé sur une pastille blanche, proportions d\'origine déclarées', () => {
    const fixture = TestBed.createComponent(LogoPiedDePage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const img = el.querySelector('img')!;

    expect(el.querySelector('span')?.className).toContain('bg-white');
    expect(img.getAttribute('width')).toBe('840');
    expect(img.getAttribute('height')).toBe('210');
  });

  it('utilisé dans le pied de page de la recherche (composant partagé, pas un <img> nu)', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(RechercheCabinets);
    fixture.detectChanges();
    const footer = (fixture.nativeElement as HTMLElement).querySelector('footer')!;

    expect(footer.querySelector('app-logo-pied-de-page')).not.toBeNull();
    expect(footer.querySelector(':scope > div img:not(app-logo-pied-de-page img)')).toBeNull();
  });
});
