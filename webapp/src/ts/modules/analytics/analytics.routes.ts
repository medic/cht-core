import { Routes } from '@angular/router';

import { RouteGuardProvider } from '@mm-providers/route-guard.provider';
import { AnalyticsComponent } from '@mm-modules/analytics/analytics.component';
import { AnalyticsTargetsComponent } from '@mm-modules/analytics/analytics-targets.component';
import { AnalyticsModulesComponent } from '@mm-modules/analytics/analytics-modules.component';
import { AnalyticsTargetAggregatesComponent } from '@mm-modules/analytics/analytics-target-aggregates.component';
import { AnalyticsTargetAggregatesDetailComponent } from '@mm-modules/analytics/analytics-target-aggregates-detail.component';

export const routes:Routes = [
  {
    path: 'analytics',
    component: AnalyticsComponent,
    data: { permissions: [ 'can_view_analytics' ], tab: 'analytics' },
    canActivate: [ RouteGuardProvider ],
    children: [
      {
        path: '',
        component: AnalyticsModulesComponent,
      },
      {
        path: 'targets',
        component: AnalyticsTargetsComponent,
        data: { name: 'targets' }
      },
      {
        path: 'target-aggregates',
        component: AnalyticsTargetAggregatesComponent,
        children: [
          {
            path: '',
            component: AnalyticsTargetAggregatesDetailComponent
          },
          {
            path: ':id',
            component: AnalyticsTargetAggregatesDetailComponent
          }
        ]
      }
    ]
  },
];
