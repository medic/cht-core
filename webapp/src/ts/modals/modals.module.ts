import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { AccordionModule } from 'ngx-bootstrap/accordion';

import { MmModal } from '@mm-modals/mm-modal/mm-modal';
import { PipesModule } from '@mm-pipes/pipes.module';
import { ComponentsModule } from '@mm-components/components.module';
import { ReloadingComponent } from '@mm-modals/reloading/reloading.component';
import { LogoutConfirmComponent } from '@mm-modals/logout/logout-confirm.component';
import { FeedbackComponent } from '@mm-modals/feedback/feedback.component';
import { SendMessageComponent } from '@mm-modals/send-message/send-message.component';
import { DeleteDocConfirmComponent } from '@mm-modals/delete-doc-confirm/delete-doc-confirm.component';
import { UpdatePasswordComponent } from '@mm-modals/edit-user/update-password.component';
import { EditUserSettingsComponent } from '@mm-modals/edit-user/edit-user-settings.component';
import { NavigationConfirmComponent } from '@mm-modals/navigation-confirm/navigation-confirm.component';
import { TrainingCardsComponent } from '@mm-modals/training-cards/training-cards.component';
import { BulkDeleteConfirmComponent } from '@mm-modals/bulk-delete-confirm/bulk-delete-confirm.component';
import { EditReportComponent } from '@mm-modals/edit-report/edit-report.component';
import { VerifyReportComponent } from '@mm-modals/verify-report/verify-report.component';
import { CheckDateComponent } from '@mm-modals/check-date/check-date.component';
import { EditMessageGroupComponent } from '@mm-modals/edit-message-group/edit-message-group.component';
import { SessionExpiredComponent } from '@mm-modals/session-expired/session-expired.component';
import { DatabaseClosedComponent } from '@mm-modals/database-closed/database-closed.component';
import { ContactsMutedComponent } from '@mm-modals/contacts-muted/contacts-muted.component';


@NgModule({
  declarations: [
    MmModal,
    ReloadingComponent,
    LogoutConfirmComponent,
    FeedbackComponent,
    SendMessageComponent,
    DeleteDocConfirmComponent,
    UpdatePasswordComponent,
    EditUserSettingsComponent,
    NavigationConfirmComponent,
    TrainingCardsComponent,
    BulkDeleteConfirmComponent,
    EditReportComponent,
    VerifyReportComponent,
    CheckDateComponent,
    EditMessageGroupComponent,
    SessionExpiredComponent,
    DatabaseClosedComponent,
    ContactsMutedComponent,
  ],
  imports: [
    CommonModule,
    ComponentsModule,
    TranslateModule,
    FormsModule,
    AccordionModule,
    PipesModule,
  ],
  exports: [
    ReloadingComponent,
    LogoutConfirmComponent,
    FeedbackComponent,
    UpdatePasswordComponent,
    EditUserSettingsComponent,
    NavigationConfirmComponent,
    TrainingCardsComponent,
    BulkDeleteConfirmComponent,
    EditReportComponent,
    VerifyReportComponent,
    CheckDateComponent,
    EditMessageGroupComponent,
    SessionExpiredComponent,
  ]
})
export class ModalsModule { }
