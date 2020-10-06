import { Routes } from '@angular/router';

import { RouteGuardProvider } from '@mm-providers/route-guard.provider';
import { MessagesComponent } from './messages.component';

export const routes: Routes = [
  {
    path: 'messages',
    component: MessagesComponent,
    data: { permissions: ['can_view_messages'], tab: 'messages'},
    canActivate: [RouteGuardProvider],
  },
];
