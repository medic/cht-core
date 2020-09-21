import {Routes} from '@angular/router';
import {RouteGuardProvider} from '../../providers/route-guard.provider';
import {TasksComponent} from './tasks.component';
//import {TasksContentComponent} from './tasks-content.component';

export const routes:Routes = [
  {
    path: 'tasks',
    component: TasksComponent,
    data: { permissions: ['can_view_tasks'] },
    canActivate: [RouteGuardProvider],
    children: [
      // {
      //   path: ':id',
      //   component: TasksContentComponent,
      // }
    ]
  },
];
