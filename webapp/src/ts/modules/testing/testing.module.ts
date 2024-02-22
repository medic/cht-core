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

import { TestingComponent } from './testing.component';
import { TestingRoutingModule } from './testing.routes';

@NgModule({
  declarations: [
    TestingComponent,
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
    TestingRoutingModule,
  ],
  exports: [
    TestingComponent,
  ]
})
export class TestingModule { }
