import {Routes} from '@angular/router';
import {ErrorComponent} from './error.component';

export const routes:Routes = [
  { path: 'error/:code', component: ErrorComponent, data: { name: 'error' }},
  { path: '', redirectTo: 'error/403', pathMatch: 'full' },
  { path: '**', redirectTo: 'error/404' },
];
