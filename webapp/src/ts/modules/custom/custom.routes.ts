import { Routes } from '@angular/router';

import { CustomComponent } from '@mm-modules/custom/custom.component';
import { AppRouteGuardProvider } from '../../app-route.guard.provider';

export const routes: Routes = [
  { 
    path: 'custom/:pageId',
    component: CustomComponent,
    canActivate: [ AppRouteGuardProvider ],
  }
];
