import { Routes } from '@angular/router';

import { PrivacyPoliciesComponent } from './privacy-policies.component';

export const routes: Routes = [
  {
    path: 'privacy-policy',
    component: PrivacyPoliciesComponent,
    data: { tab: 'privacy-policy' },
  }
];
