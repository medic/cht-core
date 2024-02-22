import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

import { PrivacyPolicyComponent } from './privacy-policy.component';
import { PrivacyPolicyRoutingModule } from './privacy-policy.routes';

@NgModule({
  declarations: [
    PrivacyPolicyComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    PrivacyPolicyRoutingModule,
  ],
  exports: [
    PrivacyPolicyComponent,
  ]
})
export class PrivacyPolicyModule { }
