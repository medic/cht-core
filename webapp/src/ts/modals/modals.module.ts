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
import { SendMessageComponent } from './send-message/send-message.component';
import { DeleteDocConfirmComponent } from './delete-doc-confirm/delete-doc-confirm.component';
import { UpdatePasswordComponent } from './edit-user/update-password.component';
import { EditUserSettingsComponent } from './edit-user/edit-user-settings.component';
import { NavigationConfirmComponent } from '@mm-modals/navigation-confirm/navigation-confirm.component';
import { TourSelectComponent } from './tour/tour-select.component';
import { WelcomeComponent } from './welcome/welcome.component';
import { BulkDeleteConfirmComponent } from '@mm-modals/bulk-delete-confirm/bulk-delete-confirm.component';
import { EditReportComponent } from '@mm-modals/edit-report/edit-report.component';
import { VerifyReportComponent } from '@mm-modals/verify-report/verify-report.component';


@NgModule({
  declarations: [
    MmModal,
    ReloadingComponent,
    LogoutConfirmComponent,
    FeedbackComponent,
    GuidedSetupComponent,
    SendMessageComponent,
    DeleteDocConfirmComponent,
    UpdatePasswordComponent,
    EditUserSettingsComponent,
    NavigationConfirmComponent,
    TourSelectComponent,
    WelcomeComponent,
    BulkDeleteConfirmComponent,
    EditReportComponent,
    VerifyReportComponent,
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
    UpdatePasswordComponent,
    EditUserSettingsComponent,
    NavigationConfirmComponent,
    TourSelectComponent,
    WelcomeComponent,
    BulkDeleteConfirmComponent,
    EditReportComponent,
    VerifyReportComponent,
  ]
})
export class ModalsModule { }
