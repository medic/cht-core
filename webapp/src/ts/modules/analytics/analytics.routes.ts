import { Routes } from '@angular/router';

import { RouteGuardProvider } from '@mm-providers/route-guard.provider';
import { AnalyticsComponent } from '@mm-modules/analytics/analytics.component';
import { AnalyticsTargetsComponent } from '@mm-modules/analytics/analytics-targets.component';

export const routes:Routes = [
  {
    path: 'analytics',
    component: AnalyticsComponent,
    data: { permissions: [ 'can_view_analytics' ], tab: 'analytics' },
    canActivate: [ RouteGuardProvider ],
    children: [

    ]
  },
  {
    path: 'analytics/targets',
    component: AnalyticsTargetsComponent,
  }
];
