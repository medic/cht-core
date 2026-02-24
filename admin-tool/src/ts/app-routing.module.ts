import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { routes as displayRoutes } from '@admin-tool-modules/display/display.routes';
import { routes as usersRoutes } from '@admin-tool-modules/users/users.routes';
import { routes as authorizationRoutes } from '@admin-tool-modules/authorization/authorization.routes';
import { routes as smsRoutes } from '@admin-tool-modules/sms/sms.routes';
import { routes as formsRoutes } from '@admin-tool-modules/forms/forms.routes';
import { routes as targetsRoutes } from '@admin-tool-modules/targets/targets.routes';
import { routes as imagesRoutes } from '@admin-tool-modules/images/images.routes';
import { routes as messageQueueRoutes } from '@admin-tool-modules/message-queue/message-queue.routes';
import { routes as upgradeRoutes } from '@admin-tool-modules/upgrade/upgrade.routes';
import { routes as exportRoutes } from '@admin-tool-modules/export/export.routes';
import { routes as backupRoutes } from '@admin-tool-modules/backup/backup.routes';

const routes: Routes = [
  ...displayRoutes,
  ...usersRoutes,
  ...authorizationRoutes,
  ...smsRoutes,
  ...formsRoutes,
  ...targetsRoutes,
  ...imagesRoutes,
  ...messageQueueRoutes,
  ...upgradeRoutes,
  ...exportRoutes,
  ...backupRoutes,
  { path: '', redirectTo: 'display', pathMatch: 'full' },
  { path: '**', redirectTo: 'display' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
