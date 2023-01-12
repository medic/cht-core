import { Routes } from '@angular/router';

import { AppRouteGuardProvider } from '../../app-route.guard.provider';
import { ContactsComponent } from '@mm-modules/contacts/contacts.component';
import { ContactsContentComponent } from '@mm-modules/contacts/contacts-content.component';
import { ContactsDeceasedComponent } from '@mm-modules/contacts/contacts-deceased.component';
import { ContactsEditComponent } from '@mm-modules/contacts/contacts-edit.component';
import { ContactRouteGuardProvider } from '@mm-modules/contacts/contact-route.guard.provider';
import { ContactsReportComponent } from '@mm-modules/contacts/contacts-report.component';

export const routes: Routes = [
  {
    path: 'contacts',
    component: ContactsComponent,
    data: {permissions: ['can_view_contacts'], tab: 'contacts'},
    canActivate: [AppRouteGuardProvider],
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
        data: { permissions: ['can_edit'] },
        canActivate: [AppRouteGuardProvider],
        canDeactivate: [ContactRouteGuardProvider],
        data: { hideTraining: true },
      },
      {
        path: ':parent_id/add/:type',
        component: ContactsEditComponent,
        data: { permissions: ['can_edit'] },
        canActivate: [AppRouteGuardProvider],
        canDeactivate: [ContactRouteGuardProvider],
        data: { hideTraining: true },
      },
      {
        path: ':id/edit',
        component: ContactsEditComponent,
        data: { permissions: ['can_edit'] },
        canActivate: [AppRouteGuardProvider],
        canDeactivate: [ContactRouteGuardProvider],
        data: { hideTraining: true },
      },
      {
        path: ':id/report/:formId',
        component: ContactsReportComponent,
        data: { permissions: ['can_edit'] },
        canActivate: [AppRouteGuardProvider],
        canDeactivate: [ContactRouteGuardProvider],
        data: { hideTraining: true },
      }
    ],
  },
];
