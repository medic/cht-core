import { Routes } from '@angular/router';

import { AppRouteGuardProvider } from '../../app-route.guard.provider';
import { TrainingsComponent } from '@mm-modules/trainings/trainings.component';
import { TrainingsContentComponent } from '@mm-modules/trainings/trainings-content.component';
import { TrainingsRouteGuardProvider } from '@mm-modules/trainings/trainings-route.guard.provider';

export const routes: Routes = [
  {
    path: 'trainings',
    component: TrainingsComponent,
    data: { permissions: [ 'can_edit' ], tab: 'trainings', hideTraining: true },
    canActivate: [ AppRouteGuardProvider ],
    children: [
      {
        path: '',
        component: TrainingsContentComponent,
        data: { hideTraining: true },
      },
      {
        path: ':id',
        component: TrainingsContentComponent,
        data: { hideTraining: true },
        canDeactivate: [ TrainingsRouteGuardProvider ],
      },
    ]
  },
];
