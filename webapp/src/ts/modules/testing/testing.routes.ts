import { Routes } from '@angular/router';

import { TestingComponent } from './testing.component';

export const routes:Routes = [
  {
    path: 'testing',
    component: TestingComponent,
    data: { tab: 'testing' },
  },
];
