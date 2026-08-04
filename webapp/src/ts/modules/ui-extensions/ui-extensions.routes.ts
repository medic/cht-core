import { ActivatedRouteSnapshot, Routes } from '@angular/router';

import { UiExtensionsTabComponent } from '@mm-modules/ui-extensions/ui-extensions-tab.component';
import { UiExtensionsTabRouteGuardProvider } from '@mm-modules/ui-extensions/ui-extensions-route.guard.provider';

export const routes: Routes = [
  {
    path: 'ui-extensions/:id',
    component: UiExtensionsTabComponent,
    resolve: {
      tab: (route: ActivatedRouteSnapshot) => `ui-extension-${route.params['id']}`,
    },
    canActivate: [UiExtensionsTabRouteGuardProvider],
  },
];
