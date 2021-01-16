import { Routes, UrlSegment } from '@angular/router';

import { RouteGuardProvider } from '@mm-providers/route-guard.provider';
import { MessagesComponent } from './messages.component';
import { MessagesContentComponent } from './messages-content.component';

export const routes: Routes = [
  {
    path: 'messages',
    component: MessagesComponent,
    data: { permissions: ['can_view_messages'], tab: 'messages'},
    canActivate: [RouteGuardProvider],
    children: [
      {
        path: '',
        component: MessagesContentComponent
      },
      {
        matcher: (url: UrlSegment[]) => {
          if (url[0]?.path?.indexOf(':') === -1) {
            return {
              consumed: url,
              posParams: {
                type_id: new UrlSegment('contact:' + url[0].path, {})
              }
            };
          }
        },
        redirectTo: ':type_id'
      },
      {
        path: ':type_id',
        component: MessagesContentComponent
      }
    ]
  },
];
