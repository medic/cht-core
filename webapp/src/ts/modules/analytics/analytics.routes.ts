import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AnalyticsComponent } from './analytics.component';
import { AnalyticsTargetsComponent } from './analytics-targets.component';
import { AnalyticsModulesComponent } from './analytics-modules.component';
import { AnalyticsTargetAggregatesComponent } from './analytics-target-aggregates.component';
import { AnalyticsTargetAggregatesDetailComponent } from './analytics-target-aggregates-detail.component';
import { AnalyticsRouteGuardProvider } from './analytics-route.guard.provider';

const routes:Routes = [
  {
    path: '',
    component: AnalyticsComponent,
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

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AnalyticsRoutingModule { }
