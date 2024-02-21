import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AppRouteGuardProvider } from '../../app-route.guard.provider';
import { TasksComponent } from './tasks.component';
import { TasksContentComponent } from './tasks-content.component';
import {
  TasksContentRouteGuardProvider,
  TasksGroupRouteGuardProvider
} from './tasks-route.guard.provider';
import { TasksGroupComponent } from './tasks-group.component';

const routes:Routes = [
  {
    path: '',
    component: TasksComponent,
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

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TasksRoutingModule { }
