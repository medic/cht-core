import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { PipesModule } from '@mm-pipes/pipes.module';
import { ComponentsModule } from '@mm-components/components.module';

import { MessagesComponent } from './messages.component';
import { MessagesRoutingModule } from './messages.routes';
import { MessagesContentComponent } from './messages-content.component';
import { MessagesMoreMenuComponent } from './messages-more-menu.component';
import { DirectivesModule } from '@mm-directives/directives.module';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  declarations: [
    MessagesComponent,
    MessagesContentComponent,
    MessagesMoreMenuComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    PipesModule,
    RouterModule,
    ComponentsModule,
    FormsModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    DirectivesModule,
    MessagesRoutingModule,
  ],
  exports: [
    MessagesComponent,
  ]
})
export class MessagesModule { }
