import { Routes } from '@angular/router';
import { ConfigurationUserComponent } from './configuration-user.component';

export const routes:Routes = [
  {
    path: 'user',
    component: ConfigurationUserComponent,
    data: { tab: 'user'},
  }
];
