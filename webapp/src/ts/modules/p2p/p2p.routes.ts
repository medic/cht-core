import { Routes } from '@angular/router';

import { P2pComponent } from '@mm-modules/p2p/p2p.component';
import { TrainingCardDeactivationGuardProvider } from 'src/ts/training-card.guard.provider';

export const routes: Routes = [
  {
    path: 'p2p',
    component: P2pComponent,
    data: { tab: 'p2p' },
    canDeactivate: [ TrainingCardDeactivationGuardProvider ],
  },
];
