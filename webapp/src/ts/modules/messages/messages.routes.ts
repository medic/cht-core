import { NgModule } from '@angular/core';
import { RouterModule, Routes, UrlSegment } from '@angular/router';

import { MessagesComponent } from './messages.component';
import { MessagesContentComponent } from './messages-content.component';

const routes: Routes = [
  {
    path: 'messages',
    component: MessagesComponent,
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

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MessagesRoutingModule { }
