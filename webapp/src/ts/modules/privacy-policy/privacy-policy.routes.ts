import { Routes } from '@angular/router';

import { PrivacyPolicyComponent } from './privacy-policy.component';
import { TrainingCardDeactivationGuardProvider } from 'src/ts/training-card.guard.provider';

export const routes: Routes = [
  {
    path: 'privacy-policy',
    component: PrivacyPolicyComponent,
    data: { tab: 'privacy-policy' },
    canDeactivate: [ TrainingCardDeactivationGuardProvider ],
  }
];
