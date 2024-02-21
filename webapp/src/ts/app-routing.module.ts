import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AppRouteGuardProvider } from './app-route.guard.provider';

import { routes as homeRoutes } from '@mm-modules/home/home.routes';
import { routes as aboutRoutes } from '@mm-modules/about/about.routes';
import { routes as confUserRoutes } from '@mm-modules/configuration-user/configuration-user.routes';
import { routes as errorRoutes } from '@mm-modules/error/error.routes';
import { routes as privacyPolicyRoutes } from '@mm-modules/privacy-policy/privacy-policy.routes';
import { routes as testingRoutes } from '@mm-modules/testing/testing.routes';

const routes: Routes = [
  ...homeRoutes,
  ...aboutRoutes,
  ...confUserRoutes,
  {
    path: 'analytics',
    data: { permissions: [ 'can_view_analytics' ], tab: 'analytics' },
    canActivate: [ AppRouteGuardProvider ],
    loadChildren: () => import('@mm-modules/analytics/analytics.module').then(m => m.AnalyticsModule)
  },
  {
    path: 'reports',
    data: { permissions: ['can_view_reports'], tab: 'reports' },
    canActivate: [ AppRouteGuardProvider ],
    loadChildren: () => import('@mm-modules/reports/reports.module').then(m => m.ReportsModule)
  },
  {
    path: 'messages',
    data: { permissions: ['can_view_messages'], tab: 'messages'},
    canActivate: [AppRouteGuardProvider],
    loadChildren: () => import('@mm-modules/messages/messages.module').then(m => m.MessagesModule)
  },
  {
    path: 'contacts',
    data: { permissions: ['can_view_contacts'], tab: 'contacts' },
    canActivate: [ AppRouteGuardProvider ],
    loadChildren: () => import('@mm-modules/contacts/contacts.module').then(m => m.ContactsModule)
  },
  ...privacyPolicyRoutes,
  {
    path: 'tasks',
    data: { permissions: ['can_edit', 'can_view_tasks'], tab: 'tasks' },
    canActivate: [ AppRouteGuardProvider ],
    loadChildren: () => import('@mm-modules/tasks/tasks.module').then(m => m.TasksModule)
  },
  ...testingRoutes,
  ...errorRoutes,
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
