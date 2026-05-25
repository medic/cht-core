import { Routes } from '@angular/router';
import { UsersComponent } from './users.component';
import { AppRouteGuardProvider } from '@admin-tool-providers/app-route.guard.provider';

export const routes: Routes = [
  {
    path: 'users',
    component: UsersComponent,
    canActivate: [AppRouteGuardProvider],
    data: { permissions: 'can_configure' },
  },
];
