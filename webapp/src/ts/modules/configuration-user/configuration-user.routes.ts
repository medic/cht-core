import { Routes } from '@angular/router';

import { ConfigurationUserComponent } from '@mm-modules/configuration-user/configuration-user.component';
import { TrainingCardDeactivationGuardProvider } from 'src/ts/training-card.guard.provider';

export const routes:Routes = [
  {
    path: 'user',
    component: ConfigurationUserComponent,
    data: { tab: 'user'},
    canDeactivate: [ TrainingCardDeactivationGuardProvider ],
  }
];
