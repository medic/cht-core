import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

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
        data: { permissions: ['can_edit'], hideTraining: true },
        canActivate: [AppRouteGuardProvider],
        canDeactivate: [ReportsAddDeactivationGuardProvider],
      },
      {
        path: 'edit/:reportId',
        component: ReportsAddComponent,
        data: { permissions: ['can_edit'], hideTraining: true },
        canActivate: [AppRouteGuardProvider],
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
