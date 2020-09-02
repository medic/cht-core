import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import {AboutComponent} from './about/about.component';
import {ErrorComponent} from './error/error.component';
import {PipesModule} from '../pipes/pipes.module';

@NgModule({
  declarations: [
    AboutComponent,
    ErrorComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    PipesModule,
  ],
  exports: [
    AboutComponent,
    ErrorComponent,
  ]
})
export class ModulesModule { }
