import { Routes } from '@angular/router';

import { RouteGuardProvider } from '@mm-providers/route-guard.provider';
import { MessagesComponent } from './messages.component';
import { MessagesContentComponent } from './messages-content.component';

export const routes: Routes = [
  {
    path: 'messages',
    component: MessagesComponent,
    data: { permissions: ['can_view_messages'] },
    canActivate: [RouteGuardProvider],
    children: [
      {
        path: ':type_id',
        component: MessagesContentComponent
      }
    ]
  },
];
