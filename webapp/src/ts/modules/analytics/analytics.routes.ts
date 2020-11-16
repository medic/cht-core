import { Routes } from '@angular/router';

import { RouteGuardProvider } from '@mm-providers/route-guard.provider';
import { AnalyticsComponent } from '@mm-modules/analytics/analytics.component';
import { AnalyticsTargetsComponent } from '@mm-modules/analytics/analytics-targets.component';
import { AnalyticsModulesComponent } from '@mm-modules/analytics/analytics-modules.component';
import { AnalyticsTargetAggregatesComponent } from '@mm-modules/analytics/analytics-target-aggregates.component';

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
      },
      {
        path: 'target-aggregates',
        pathMatch: 'full',
        component: AnalyticsTargetAggregatesComponent,
        children: [
          /*{
            path: '', // Todo: finish when implementing content
          },*/
          {
            path: 'detail',
            pathMatch: 'full',
            redirectTo: 'target-aggregates' // Todo: finish when implementing content
          }
        ]
      }
    ]
  },
];
