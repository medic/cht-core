import {Routes} from '@angular/router';
import {RouteGuardProvider} from '../../providers/route-guard.provider';
import {ReportsComponent} from './reports.component';
import {ReportsContentComponent} from './reports-content.component';

export const routes:Routes = [
  {
    path: 'reports',
    component: ReportsComponent,
    data: { permissions: ['can_view_reports'] },
    canActivate: [RouteGuardProvider],
    children: [
      {
        path: ':id',
        component: ReportsContentComponent,
      }
    ]
  },
];
