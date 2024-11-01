import { Routes } from '@angular/router';

import { AppRouteGuardProvider } from '../../app-route.guard.provider';
import { TrainingsComponent } from '@mm-modules/trainings/trainings.component';
import { TrainingsContentComponent } from '@mm-modules/trainings/training-content.component';

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
      },
    ]
  },
];
