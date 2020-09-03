import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { RouterModule } from '@angular/router';

import { HeaderComponent } from './header/header.component';
import { PipesModule } from '../pipes/pipes.module';
import { DirectivesModule } from '../directives/directives.module';
import { SnackbarComponent } from './snackbar/snackbar.component';


@NgModule({
  declarations: [
    HeaderComponent,
    SnackbarComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    PipesModule,
    DirectivesModule,
    BsDropdownModule,
  ],
  exports: [
    HeaderComponent,
    SnackbarComponent,
  ]
})
export class ComponentsModule { }
