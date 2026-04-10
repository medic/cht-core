import { Routes } from '@angular/router';
import { AuthorizationHeaderComponent } from './authorization-header/authorization-header.component';
import { AuthorizationRolesComponent } from './authorization-roles/authorization-roles.component';
import { AuthorizationPermissionsComponent } from './authorization-permissions/authorization-permissions.component';

/**
 * Routes for the Authorization module.
 *
 * Defaults to the permissions tab on load.
 * Child routes:
 *   - /authorization/permissions - manage role permissions
 *   - /authorization/roles - manage system roles
 */
export const routes: Routes = [
  {
    path: 'authorization',
    component: AuthorizationHeaderComponent,
    children: [
      {
        path: '',
        redirectTo: 'permissions',
        pathMatch: 'full',
      },
      {
        path: 'permissions',
        component: AuthorizationPermissionsComponent,
      },
      {
        path: 'roles',
        component: AuthorizationRolesComponent,
      },
    ],
  },
];
