import { Routes } from '@angular/router';
import { DisplayHeaderComponent } from './display-header/display-header.component';
import { DisplayDateTimeComponent } from './display-date-time/display-date-time.component';
import { DisplayLanguagesComponent } from './display-languages/display-languages.component';

/**
 * Routes for the Display module.
 * Child routes:
 *   - /display/date-time - configure date and datetime display formats
 *   - /display/languages - manage display languages
 *   - /display/translations - manage translations
 *   - /display/privacy-policies - manage privacy policies
 */
export const routes: Routes = [
  {
    path: 'display',
    component: DisplayHeaderComponent,
    children: [
      {
        path: '',
        redirectTo: 'date-time',
        pathMatch: 'full',
      },
      {
        path: 'date-time',
        component: DisplayDateTimeComponent,
      },
      {
        path: 'languages',
        component: DisplayLanguagesComponent,
      },
    ],
  },
];
