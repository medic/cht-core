import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { RouterOutlet } from '@angular/router';

/**
 * Layout component for the Display section of the admin tool.
 * Renders the navigation tabs (Date & time, Languages, Translations,
 * Privacy policies) and the router-outlet where child routes are loaded.
 */
@Component({
  selector: 'display-header',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './display-header.component.html',
  styleUrl: './display-header.component.less',
})
export class DisplayHeaderComponent {}
