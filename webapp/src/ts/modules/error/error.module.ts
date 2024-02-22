import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ErrorComponent } from './error.component';
import { ErrorRoutingModule } from './error.routes';

@NgModule({
  declarations: [
    ErrorComponent,
  ],
  imports: [
    TranslateModule,
    ErrorRoutingModule
  ],
  exports: [
    ErrorComponent,
  ]
})
export class ErrorModule { }
