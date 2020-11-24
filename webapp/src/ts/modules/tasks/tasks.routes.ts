import { Routes } from '@angular/router';

import { RouteGuardProvider } from '@mm-providers/route-guard.provider';
import { TasksComponent } from './tasks.component';
//import { ReportsAddDeactivationGuardProvider } from '@mm-modules/reports/report-route-guard.provider';

export const routes:Routes = [
  {
    path: 'tasks',
    component: TasksComponent,
    data: { permissions: ['can_view_tasks'], tab: 'tasks' },
    canActivate: [RouteGuardProvider],
    /* children: [
      {
        path: '',
        component: ReportsContentComponent,
        data: { name: 'reports.detail' },
      },
      {
        path: ':id',
        component: ReportsContentComponent,
        data: { name: 'tasks.detail' },
        canDeactivate: [ReportsAddDeactivationGuardProvider],
      },

    ]*/
  },
];
