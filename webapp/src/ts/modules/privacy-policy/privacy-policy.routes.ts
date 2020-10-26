import { Routes } from '@angular/router';

import { PrivacyPolicyComponent } from './privacy-policy.component';

export const routes: Routes = [
  {
    path: 'privacy-policy',
    component: PrivacyPolicyComponent,
    data: { tab: 'privacy-policy' },
  }
];
