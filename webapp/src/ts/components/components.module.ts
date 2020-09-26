import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { RouterModule } from '@angular/router';

import { PipesModule } from '@mm-pipes/pipes.module';
import { DirectivesModule } from '@mm-directives/directives.module';
import { HeaderComponent } from './header/header.component';
import { SnackbarComponent } from './snackbar/snackbar.component';
import { ContentRowListItemComponent } from './content-row-list-item/content-row-list-item.component';
import { ReportVerifyValidIconComponent, ReportVerifyInvalidIconComponent } from './status-icons/status-icons.template';
import { SenderComponent } from './sender/sender.component';

@NgModule({
  declarations: [
    HeaderComponent,
    SnackbarComponent,
    ContentRowListItemComponent,
    ReportVerifyValidIconComponent,
    ReportVerifyInvalidIconComponent,
    SenderComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    PipesModule,
    DirectivesModule,
    BsDropdownModule,
  ],
  exports: [
    HeaderComponent,
    SnackbarComponent,
    ContentRowListItemComponent,
    ReportVerifyValidIconComponent,
    ReportVerifyInvalidIconComponent,
    SenderComponent,
  ]
})
export class ComponentsModule { }
