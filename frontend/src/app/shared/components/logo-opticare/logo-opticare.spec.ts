import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogoOpticare } from './logo-opticare';

describe('LogoOpticare', () => {
  let fixture: ComponentFixture<LogoOpticare>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LogoOpticare] }).compileComponents();
    fixture = TestBed.createComponent(LogoOpticare);
  });

  it('affiche le logo unique avec le texte alternatif « OptiCare » et sans texte en double', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const img = el.querySelector('img') as HTMLImageElement;

    expect(img.getAttribute('src')).toBe('/images/logo-opticare.png');
    expect(img.getAttribute('alt')).toBe('OptiCare');
    expect(el.textContent?.trim()).toBe('');
  });

  it('la hauteur par défaut est de 32 px et peut être réglée', () => {
    fixture.detectChanges();
    const img = (fixture.nativeElement as HTMLElement).querySelector('img') as HTMLImageElement;
    expect(img.style.height).toBe('32px');

    fixture.componentRef.setInput('hauteur', 40);
    fixture.detectChanges();
    expect(img.style.height).toBe('40px');
  });
});
