import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';

import {PipesModule} from '../pipes/pipes.module';

import {AboutComponent} from './about/about.component';
import {ErrorComponent} from './error/error.component';
import {AnalyticsComponent} from './analytics/analytics.component';

@NgModule({
  declarations: [
    AboutComponent,
    ErrorComponent,
    AnalyticsComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    PipesModule,
    RouterModule,
  ],
  exports: [
    AboutComponent,
    ErrorComponent,
    AnalyticsComponent,
  ]
})
export class ModulesModule { }
