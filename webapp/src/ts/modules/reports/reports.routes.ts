import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AppRouteGuardProvider } from '../../app-route.guard.provider';
import { ReportsComponent } from '@mm-modules/reports/reports.component';
import { ReportsContentComponent } from '@mm-modules/reports/reports-content.component';
import { ReportsAddComponent } from '@mm-modules/reports/reports-add.component';
import {
  ReportsAddDeactivationGuardProvider,
  ReportsSelectModelDeactivationGuardProvider
} from '@mm-modules/reports/report-route.guard.provider';

export const routes:Routes = [
  {
    path: '',
    component: ReportsComponent,
    data: { permissions: ['can_view_reports'], tab: 'reports' },
    canActivate: [AppRouteGuardProvider],
    children: [
      {
        path: '',
        component: ReportsContentComponent,
        data: { name: 'reports.detail' },
        canDeactivate: [ReportsSelectModelDeactivationGuardProvider],
      },
      {
        path: ':id',
        component: ReportsContentComponent,
        data: { name: 'reports.detail' },
      },
      {
        path: 'add/:formId',
        component: ReportsAddComponent,
        canDeactivate: [ReportsAddDeactivationGuardProvider],
      },
      {
        path: 'edit/:reportId',
        component: ReportsAddComponent,
        canDeactivate: [ReportsAddDeactivationGuardProvider],
      }
    ]
  },
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportsRoutingModule { }
