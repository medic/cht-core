import { Routes } from '@angular/router';

import { RouteGuardProvider } from '@mm-providers/route-guard.provider';
import { ContactsComponent } from '@mm-modules/contacts/contacts.component';
import { ContactsContentComponent } from '@mm-modules/contacts/contacts-content.component';
import { ContactsDeceasedComponent } from '@mm-modules/contacts/contacts-deceased.component';
import { ContactsEditComponent } from '@mm-modules/contacts/contacts-edit.component';
import { ContactAddRouteGuardProvider } from '@mm-modules/contacts/contact-route-guard.provider';
import { ContactsReportComponent } from '@mm-modules/contacts/contacts-report.component';

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
        data: { name: 'contacts.deceased' },
      },
      {
        path: 'add/:type',
        component: ContactsEditComponent,
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
      },
      {
        path: '/:id/report/:formId',
        component: ContactsReportComponent,
      }
    ],
  },
];
