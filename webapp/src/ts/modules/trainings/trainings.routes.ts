import { Routes } from '@angular/router';

import { AppRouteGuardProvider } from '../../app-route.guard.provider';
import { TrainingsComponent } from '@mm-modules/trainings/trainings.component';

export const routes: Routes = [
  {
    path: 'trainings',
    component: TrainingsComponent,
    data: { permissions: [ 'can_edit' ], tab: 'trainings' },
    canActivate: [ AppRouteGuardProvider ],
    children: [
      /*{ TODO - add content component
        path: '',
        component: TrainingsContentComponent,
        data: { },
      },
      {
        path: ':id',
        component: TrainingsContentComponent,
        data: { hideTraining: true },
      },*/
    ]
  },
];
