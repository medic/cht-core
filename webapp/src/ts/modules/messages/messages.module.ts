import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';

import { PipesModule } from '@mm-pipes/pipes.module';
import { ComponentsModule } from '@mm-components/components.module';
import { DirectivesModule } from '@mm-directives/directives.module';

import { MessagesRoutingModule } from './messages.routes';
import { MessagesComponent } from './messages.component';
import { MessagesContentComponent } from './messages-content.component';
import { MessagesMoreMenuComponent } from './messages-more-menu.component';

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
    BsDropdownModule,
    FormsModule,
    DirectivesModule,
    MatIconModule,
    MatButtonModule,
    MatBottomSheetModule,
    MatCardModule,
    MatDialogModule,
    MatExpansionModule,
    MatMenuModule,
    MessagesRoutingModule,
  ],
  exports: [
    MessagesComponent,
  ]
})
export class MessagesModule { }
