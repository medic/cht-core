import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

import { ConfigurationUserComponent } from './configuration-user.component';
import { ConfigurationUserRoutingModule } from './configuration-user.routes';

@NgModule({
  declarations: [
    ConfigurationUserComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    ConfigurationUserRoutingModule,
  ],
  exports: [
    ConfigurationUserComponent,
  ]
})
export class ConfigurationUserModule { }
