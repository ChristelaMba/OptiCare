import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoOpticare } from '../../../shared/components/logo-opticare/logo-opticare';

@Component({
  selector: 'app-choix-role',
  imports: [LogoOpticare, RouterLink],
  templateUrl: './choix-role.html',
  styleUrl: './choix-role.css',
})
export class ChoixRole {}
