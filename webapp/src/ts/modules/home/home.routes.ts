import { Routes } from '@angular/router';

import { HomeComponent } from '@mm-modules/home/home.component';

export const routes:Routes = [
  { path: 'home', component: HomeComponent },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
];
