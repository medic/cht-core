import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AppRouteGuardProvider } from './app-route.guard.provider';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    loadChildren: () => import('@mm-modules/home/home.module').then(m => m.HomeModule)
  },
  {
    path: 'about',
    data: { tab: 'about' },
    loadChildren: () => import('@mm-modules/about/about.module').then(m => m.AboutModule)
  },
  {
    path: 'user',
    data: { tab: 'user' },
    loadChildren: () => import('@mm-modules/configuration-user/configuration-user.module')
      .then(m => m.ConfigurationUserModule)
  },
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
  {
    path: 'privacy-policy',
    data: { tab: 'privacy-policy' },
    loadChildren: () => import('@mm-modules/privacy-policy/privacy-policy.module').then(m => m.PrivacyPolicyModule)
  },
  {
    path: 'tasks',
    data: { permissions: ['can_edit', 'can_view_tasks'], tab: 'tasks' },
    canActivate: [ AppRouteGuardProvider ],
    loadChildren: () => import('@mm-modules/tasks/tasks.module').then(m => m.TasksModule)
  },
  {
    path: 'testing',
    data: { tab: 'testing' },
    loadChildren: () => import('@mm-modules/testing/testing.module').then(m => m.TestingModule)
  },
  {
    path: 'error/:code',
    data: { name: 'error', tab: 'error' },
    loadChildren: () => import('@mm-modules/error/error.module').then(m => m.ErrorModule)
  },
  { path: '**', redirectTo: 'error/404' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
