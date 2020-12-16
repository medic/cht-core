import { Routes } from '@angular/router';

import { ThemeComponent } from './theme.component';

export const routes:Routes = [
  {
    path: 'theme',
    component: ThemeComponent,
    data: { tab: 'theme' },
  },
];
