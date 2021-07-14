import { Routes } from '@angular/router';

import { AppRouteGuardProvider } from '../../app-route.guard.provider';
import { AnalyticsComponent } from '@mm-modules/analytics/analytics.component';
import { AnalyticsTargetsComponent } from '@mm-modules/analytics/analytics-targets.component';
import { AnalyticsModulesComponent } from '@mm-modules/analytics/analytics-modules.component';
import { AnalyticsTargetAggregatesComponent } from '@mm-modules/analytics/analytics-target-aggregates.component';
import {
  AnalyticsTargetAggregatesDetailComponent
} from '@mm-modules/analytics/analytics-target-aggregates-detail.component';
import { AnalyticsRouteGuardProvider } from '@mm-modules/analytics/analytics-route.guard.provider';

export const routes:Routes = [
  {
    path: 'analytics',
    component: AnalyticsComponent,
    data: { permissions: [ 'can_view_analytics' ], tab: 'analytics' },
    canActivate: [ AppRouteGuardProvider ],
    canActivateChild: [ AnalyticsRouteGuardProvider ],
    children: [
      {
        path: '',
        component: AnalyticsModulesComponent,
      },
      {
        path: 'targets',
        component: AnalyticsTargetsComponent,
        data: { moduleId: 'targets' }
      },
      {
        path: 'target-aggregates',
        component: AnalyticsTargetAggregatesComponent,
        data: { moduleId: 'target-aggregates' },
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
