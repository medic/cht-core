import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { PrivacyPolicyComponent } from './privacy-policy.component';
import { PrivacyPolicyRoutingModule } from './privacy-policy.routes';

@NgModule({
  declarations: [
    PrivacyPolicyComponent,
  ],
  imports: [
    TranslateModule,
    PrivacyPolicyRoutingModule,
  ],
  exports: [
    PrivacyPolicyComponent,
  ]
})
export class PrivacyPolicyModule { }
