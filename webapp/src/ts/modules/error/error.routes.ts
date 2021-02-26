import { Routes } from '@angular/router';
import { ErrorComponent } from './error.component';

export const routes:Routes = [
  { path: 'error/:code', component: ErrorComponent, data: { name: 'error', tab: 'error' }},
  { path: '**', redirectTo: 'error/404' },
];
