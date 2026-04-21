import { Routes } from '@angular/router';

import { P2pStatusComponent } from '@mm-modules/p2p/p2p-status.component';
import { TrainingCardDeactivationGuardProvider } from 'src/ts/training-card.guard.provider';

export const routes: Routes = [
  {
    path: 'p2p',
    component: P2pStatusComponent,
    data: { tab: 'p2p' },
    canDeactivate: [TrainingCardDeactivationGuardProvider],
  },
];
