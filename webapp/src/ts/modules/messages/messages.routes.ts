import { Routes, UrlSegment } from '@angular/router';

import { AppRouteGuardProvider } from '../../app-route.guard.provider';
import { MessagesComponent } from './messages.component';
import { MessagesContentComponent } from './messages-content.component';

export const routes: Routes = [
  {
    path: 'messages',
    component: MessagesComponent,
    data: { permissions: ['can_view_messages'], tab: 'messages'},
    canActivate: [AppRouteGuardProvider],
    children: [
      {
        path: '',
        component: MessagesContentComponent
      },
      /** This child route with matcher will redirect from /messages/[uuid] to /messages/contacts:[uuid]
       * Ignoring any extra URL parameters because messages-content component is
       * currently using only one "type_id" ( format: [type]:[uuid] )
       * Original ticket: https://github.com/medic/cht-core/issues/4024
       * Original commit: https://github.com/medic/cht-core/commit/4c6ffce10b61f8dafdbb9d48e6bf9d7d5f36d200
       */
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
          return null;
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
