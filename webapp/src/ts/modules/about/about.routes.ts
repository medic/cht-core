import { Routes } from '@angular/router';

import { AboutComponent } from '@mm-modules/about/about.component';

export const routes:Routes = [
  { path: 'about', component: AboutComponent, data: { tab: 'about' } },
];
