import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { routes as homeRoutes } from '@mm-modules/home/home.routes';
import { routes as aboutRoutes } from '@mm-modules/about/about.routes';
import { routes as confUserRoutes } from '@mm-modules/configuration-user/configuration-user.routes';
import { routes as analyticsRoutes } from '@mm-modules/analytics/analytics.routes';
import { routes as errorRoutes } from '@mm-modules/error/error.routes';
import { routes as reportRoutes } from '@mm-modules/reports/reports.routes';
import { routes as messagesRoutes } from '@mm-modules/messages/messages.routes';
import { routes as contactsRoutes } from '@mm-modules/contacts/contacts.routes';
import { routes as privacyPolicyRoutes } from '@mm-modules/privacy-policy/privacy-policy.routes';
import { routes as tasksRoutes } from '@mm-modules/tasks/tasks.routes';
import { routes as testingRoutes } from '@mm-modules/testing/testing.routes';

const routes: Routes = [
  ...homeRoutes,
  ...aboutRoutes,
  ...confUserRoutes,
  ...analyticsRoutes,
  ...reportRoutes,
  ...messagesRoutes,
  ...contactsRoutes,
  ...privacyPolicyRoutes,
  ...tasksRoutes,
  ...testingRoutes,
  ...errorRoutes,
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
