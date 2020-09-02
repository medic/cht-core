import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import {AboutComponent} from './about/about.component';
import {PipesModule} from '../pipes/pipes.module';

@NgModule({
  declarations: [
    AboutComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    PipesModule,
  ],
  exports: [
    AboutComponent,
  ]
})
export class ModulesModule { }
