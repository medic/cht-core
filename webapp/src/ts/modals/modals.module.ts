import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { AccordionModule } from 'ngx-bootstrap/accordion';

import { MmModal } from './mm-modal/mm-modal';
import { ReloadingComponent } from './reloading/reloading.component';
import { LogoutConfirmComponent } from './logout/logout-confirm.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { GuidedSetupComponent } from './guided-setup/guided-setup.component';


@NgModule({
  declarations: [
    MmModal,
    ReloadingComponent,
    LogoutConfirmComponent,
    FeedbackComponent,
    GuidedSetupComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    AccordionModule,
  ],
  exports: [
    ReloadingComponent,
    LogoutConfirmComponent,
    FeedbackComponent,
  ]
})
export class ModalsModule { }
