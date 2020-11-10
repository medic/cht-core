import { Routes } from '@angular/router';

import { RouteGuardProvider } from '@mm-providers/route-guard.provider';
import { AnalyticsComponent } from '@mm-modules/analytics/analytics.component';
import { AnalyticsTargetsComponent } from '@mm-modules/analytics/analytics-targets.component';
import { AnalyticsModulesComponent } from '@mm-modules/analytics/analytics-modules.component';

export const routes:Routes = [
  {
    path: 'analytics',
    component: AnalyticsComponent,
    data: { permissions: [ 'can_view_analytics' ], tab: 'analytics' },
    canActivate: [ RouteGuardProvider ],
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: AnalyticsModulesComponent,
      },
      {
        path: 'targets',
        pathMatch: 'full',
        component: AnalyticsTargetsComponent,
      }
    ]
  },
];
