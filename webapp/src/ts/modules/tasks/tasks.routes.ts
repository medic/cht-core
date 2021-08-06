import { Routes } from '@angular/router';

import { AppRouteGuardProvider } from '../../app-route.guard.provider';
import { TasksComponent } from '@mm-modules/tasks/tasks.component';
import { TasksContentComponent } from '@mm-modules/tasks/tasks-content.component';
import { TasksRouteGuardProvider } from '@mm-modules/tasks/tasks-route.guard.provider';

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
        canDeactivate: [TasksRouteGuardProvider],
      },

    ]
  },
];
