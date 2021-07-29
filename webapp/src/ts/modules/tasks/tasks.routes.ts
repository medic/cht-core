import { Routes } from '@angular/router';

import { AppRouteGuardProvider } from '../../app-route.guard.provider';
import { TasksComponent } from '@mm-modules/tasks/tasks.component';
import { TasksContentComponent } from '@mm-modules/tasks/tasks-content.component';
import {
  TasksContentRouteGuardProvider,
  TasksGroupRouteGuardProvider
} from '@mm-modules/tasks/tasks-route-guard.provider';
import { TasksGroupComponent } from '@mm-modules/tasks/tasks-group.component';

export const routes:Routes = [
  {
    path: 'tasks',
    component: TasksComponent,
    data: { permissions: ['can_view_tasks'], tab: 'tasks' },
    canActivate: [AppRouteGuardProvider],
    children: [
      {
        path: '',
        component: TasksContentComponent,
        data: { name: 'tasks.detail' },
      },
      {
        path: ':id',
        component: TasksContentComponent,
        data: { name: 'tasks.detail' },
        canDeactivate: [TasksContentRouteGuardProvider],
      },
      {
        path: 'group/:id',
        component: TasksGroupComponent,
        data: { name: 'tasks.group' },
        canDeactivate: [TasksGroupRouteGuardProvider],
      },
    ]
  },
];
