import { Routes } from '@angular/router';

import { UiExtensionsTabComponent } from '@mm-modules/ui-extensions/ui-extensions-tab.component';
import { UiExtensionsTabRouteGuardProvider } from '@mm-modules/ui-extensions/ui-extensions-route.guard.provider';

export const routes: Routes = [
  {
    path: 'ui-extensions/:id',
    component: UiExtensionsTabComponent,
    data: { tab: 'ui-extensions' },
    canActivate: [UiExtensionsTabRouteGuardProvider],
  },
];
