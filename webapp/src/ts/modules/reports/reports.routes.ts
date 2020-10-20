import { Routes } from '@angular/router';

import { RouteGuardProvider } from '@mm-providers/route-guard.provider';
import { ReportsComponent } from '@mm-modules/reports/reports.component';
import { ReportsContentComponent } from '@mm-modules/reports/reports-content.component';

export const routes:Routes = [
  {
    path: 'reports',
    component: ReportsComponent,
    data: { permissions: ['can_view_reports'], tab: 'reports' },
    canActivate: [RouteGuardProvider],
    children: [
      {
        path: '',
        component: ReportsContentComponent,
      },
      {
        path: ':id',
        component: ReportsContentComponent,
      }
    ]
  },
];
