import { Routes } from '@angular/router';

import { AboutComponent } from '@mm-modules/about/about.component';
import { TrainingCardDeactivationGuardProvider } from 'src/ts/training-card.guard.provider';

export const routes:Routes = [
  {
    path: 'about',
    component: AboutComponent,
    data: { tab: 'about' },
    canDeactivate: [ TrainingCardDeactivationGuardProvider ],
  },
];
