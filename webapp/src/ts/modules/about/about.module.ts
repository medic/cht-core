import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatCardModule } from '@angular/material/card';

import { PipesModule } from '@mm-pipes/pipes.module';

import { AboutComponent } from './about.component';
import { AboutRoutingModule } from './about.routes';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  declarations: [
    AboutComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    PipesModule,
    MatCardModule,
    MatButtonModule,
    AboutRoutingModule,
  ],
  exports: [
    AboutComponent,
  ]
})
export class AboutModule { }
