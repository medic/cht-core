import { Routes } from '@angular/router';

import { AppRouteGuardProvider } from '../../app-route.guard.provider';
import { TasksComponent } from '@mm-modules/tasks/tasks.component';
import { TasksContentComponent } from '@mm-modules/tasks/tasks-content.component';
import {
  TasksContentRouteGuardProvider,
  TasksGroupRouteGuardProvider
} from '@mm-modules/tasks/tasks-route.guard.provider';
import { TasksGroupComponent } from '@mm-modules/tasks/tasks-group.component';

export const routes:Routes = [
  {
    path: 'tasks',
    component: TasksComponent,
    data: { permissions: ['can_edit', 'can_view_tasks'], tab: 'tasks' },
    canActivate: [AppRouteGuardProvider],
    children: [
      {
        path: '',
        component: TasksContentComponent,
        data: { name: 'tasks.detail' },
      },
      {
        path: 'group',
        component: TasksGroupComponent,
        data: { name: 'tasks.group', permissions: ['can_view_tasks_group'], redirect: ['/tasks'] },
        canActivate: [AppRouteGuardProvider],
        canDeactivate: [TasksGroupRouteGuardProvider],
      },
      {
        path: ':id',
        component: TasksContentComponent,
        data: { name: 'tasks.detail', hideTraining: true },
        canDeactivate: [TasksContentRouteGuardProvider],
      },
    ]
  },
];
