import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from "@ngx-translate/core";
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';

import { HeaderComponent } from './header/header.component';
import { RouterModule } from '@angular/router';
import { PipesModule } from "../pipes/pipes.module";
import { DirectivesModule } from "../directives/directives.module";


@NgModule({
  declarations: [
    HeaderComponent,
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
  ]
})
export class ComponentsModule { }
