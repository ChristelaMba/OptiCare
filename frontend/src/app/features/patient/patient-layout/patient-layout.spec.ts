import { Component, signal } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-patient-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, RouterLinkActive],
  templateUrl: './patient-layout.html',
  styleUrl: './patient-layout.css'
})
export class PatientLayout {

  sidebarOuverte = signal(false);

  toggleSidebar(): void {
    this.sidebarOuverte.update(v => !v);
  }

  fermerSidebar(): void {
    this.sidebarOuverte.set(false);
  }
}