import { Routes } from '@angular/router';

import { OfflineSyncComponent } from '@mm-modules/offline-sync/offline-sync.component';
import { TrainingCardDeactivationGuardProvider } from 'src/ts/training-card.guard.provider';

export const routes: Routes = [
  {
    path: 'offline-sync',
    component: OfflineSyncComponent,
    data: { tab: 'offline-sync' },
    canDeactivate: [ TrainingCardDeactivationGuardProvider ],
  },
];
