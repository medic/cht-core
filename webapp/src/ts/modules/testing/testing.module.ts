import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

import { TestingComponent } from './testing.component';
import { TestingRoutingModule } from './testing.routes';

@NgModule({
  declarations: [
    TestingComponent,
  ],
  imports: [
    TranslateModule,
    FormsModule,
    TestingRoutingModule,
  ],
  exports: [
    TestingComponent,
  ]
})
export class TestingModule { }
