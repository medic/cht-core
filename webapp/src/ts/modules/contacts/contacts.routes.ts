import { Routes } from '@angular/router';

import { RouteGuardProvider } from '../../providers/route-guard.provider';
import { ContactsComponent } from './contacts.component';
import { ContactsContentComponent } from './contacts-content.component';
import { ContactsDeceasedComponent } from './contacts-deceased.component';
import { ContactsEditComponent } from '@mm-modules/contacts/contacts-edit.component';
import { ContactAddRouteGuardProvider } from '@mm-modules/contacts/contact-route-guard.provider';

export const routes: Routes = [
  {
    path: 'contacts',
    component: ContactsComponent,
    data: {permissions: ['can_view_contacts'], tab: 'contacts'},
    canActivate: [RouteGuardProvider],
    children: [
      {
        path: '',
        component: ContactsContentComponent,
        data: { name: 'contacts.detail' },
      },
      {
        path: ':id',
        component: ContactsContentComponent,
        data: { name: 'contacts.detail' },
      },
      {
        path: ':id/deceased',
        component: ContactsDeceasedComponent,
      },

      {
        path: 'add',
        component: ContactsEditComponent,
        data: { name: 'contact.add' },
        canDeactivate: [ContactAddRouteGuardProvider],
      },
      {
        path: ':parent_id/add/:type',
        component: ContactsEditComponent,
        canDeactivate: [ContactAddRouteGuardProvider],
      },
      {
        path: ':id/edit',
        component: ContactsEditComponent,
        canDeactivate: [ContactAddRouteGuardProvider],
      }

    ],
  },
];
