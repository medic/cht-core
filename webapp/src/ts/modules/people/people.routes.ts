import { Routes } from '@angular/router';

import { RouteGuardProvider } from '../../providers/route-guard.provider';
import { PeopleComponent } from './people.component';

export const routes: Routes = [
  {
    path: 'contacts',
    component: PeopleComponent,
    data: {permissions: ['can_view_contacts']},
    canActivate: [RouteGuardProvider],
  },
];
