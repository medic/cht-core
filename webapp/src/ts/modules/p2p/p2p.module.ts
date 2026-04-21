import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { P2pStatusComponent } from './p2p-status.component';
import { routes } from './p2p.routes';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule.forChild(routes),
    P2pStatusComponent,
  ],
  exports: [
    P2pStatusComponent,
  ],
})
export class P2pModule {}
