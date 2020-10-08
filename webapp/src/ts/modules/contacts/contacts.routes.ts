import { Routes } from '@angular/router';

import { RouteGuardProvider } from '../../providers/route-guard.provider';
import { ContactsComponent } from './contacts.component';
import { ContactsContentComponent } from './contacts-content.component';

export const routes: Routes = [
  {
    path: 'contacts',
    component: ContactsComponent,
    data: {permissions: ['can_view_contacts'], tab: 'contacts'},
    canActivate: [RouteGuardProvider],
    children: [
      {
        path: ':id',
        component: ContactsContentComponent,
      }
    ],
  },
];
