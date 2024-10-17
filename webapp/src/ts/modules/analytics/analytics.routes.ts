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
import { TrainingCardDeactivationGuardProvider } from 'src/ts/training-card.guard.provider';
import { AGGREGATE_TARGETS_ID } from '@mm-services/analytics-modules.service';

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
        canDeactivate: [ TrainingCardDeactivationGuardProvider ],
      },
      {
        path: 'targets',
        component: AnalyticsTargetsComponent,
        data: { moduleId: 'targets' },
        canDeactivate: [ TrainingCardDeactivationGuardProvider ],
      },
      {
        path: 'target-aggregates',
        component: AnalyticsTargetAggregatesComponent,
        data: { moduleId: AGGREGATE_TARGETS_ID },
        canDeactivate: [ TrainingCardDeactivationGuardProvider ],
        children: [
          {
            path: '',
            component: AnalyticsTargetAggregatesDetailComponent,
            canDeactivate: [ TrainingCardDeactivationGuardProvider ],
          },
          {
            path: ':id',
            component: AnalyticsTargetAggregatesDetailComponent,
            canDeactivate: [ TrainingCardDeactivationGuardProvider ],
          }
        ]
      }
    ]
  },
];
