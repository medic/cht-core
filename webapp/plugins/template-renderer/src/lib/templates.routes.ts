import { Routes } from '@angular/router';

import { TemplatesComponent } from './templates.component';
import { DynamicPermissionGuard } from './templates-route.guard';

const BASE_PATH = 'templates';
export const routes: Routes = [
  { 
    path: BASE_PATH + '/:pageId',
    component: TemplatesComponent,
    canActivate: [DynamicPermissionGuard]
  }
];
export { BASE_PATH };
