import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatDialogModule } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';

import { HeaderComponent } from '@mm-components/header/header.component';
import { PipesModule } from '@mm-pipes/pipes.module';
import { DirectivesModule } from '@mm-directives/directives.module';
import { SnackbarComponent } from '@mm-components/snackbar/snackbar.component';
import { ContentRowListItemComponent } from '@mm-components/content-row-list-item/content-row-list-item.component';
import {
  ReportVerifyValidIconComponent,
  ReportVerifyInvalidIconComponent
} from '@mm-components/status-icons/status-icons.template';
import {
  MultiDropdownFilterComponent
} from '@mm-components/filters/multi-dropdown-filter/multi-dropdown-filter.component';
import { DateFilterComponent } from '@mm-components/filters/date-filter/date-filter.component';
import { FacilityFilterComponent } from '@mm-components/filters/facility-filter/facility-filter.component';
import { FormTypeFilterComponent } from '@mm-components/filters/form-type-filter/form-type-filter.component';
import { FastActionButtonComponent } from '@mm-components/fast-action-button/fast-action-button.component';
import { StatusFilterComponent } from '@mm-components/filters/status-filter/status-filter.component';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { ResetFiltersComponent } from '@mm-components/filters/reset-filters/reset-filters.component';
import { SortFilterComponent } from '@mm-components/filters/sort-filter/sort-filter.component';
import { SenderComponent } from '@mm-components/sender/sender.component';
import { ReportImageComponent } from '@mm-components/report-image/report-image.component';
import { NavigationComponent } from '@mm-components/navigation/navigation.component';
import { ActionbarComponent } from '@mm-components/actionbar/actionbar.component';
import { EnketoComponent } from '@mm-components/enketo/enketo.component';
import { SearchBarComponent } from '@mm-components/search-bar/search-bar.component';
import { MultiselectBarComponent } from '@mm-components/multiselect-bar/multiselect-bar.component';
import {
  AnalyticsTargetsProgressComponent
} from '@mm-components/analytics-targets-progress/analytics-targets-progress.component';
import { AnalyticsFilterComponent } from '@mm-components/filters/analytics-filter/analytics-filter.component';
import {
  AnalyticsTargetsDetailsComponent
} from '@mm-components/analytics-targets-details/analytics-targets-details.component';
import { MobileDetectionComponent } from '@mm-components/mobile-detection/mobile-detection.component';
import { ErrorLogComponent } from '@mm-components/error-log/error-log.component';
import { PanelHeaderComponent } from '@mm-components/panel-header/panel-header.component';

@NgModule({
  declarations: [
    HeaderComponent,
    SnackbarComponent,
    ContentRowListItemComponent,
    ReportVerifyValidIconComponent,
    ReportVerifyInvalidIconComponent,
    MultiDropdownFilterComponent,
    DateFilterComponent,
    FacilityFilterComponent,
    FormTypeFilterComponent,
    StatusFilterComponent,
    FreetextFilterComponent,
    FastActionButtonComponent,
    SearchBarComponent,
    MultiselectBarComponent,
    ResetFiltersComponent,
    SortFilterComponent,
    SenderComponent,
    ReportImageComponent,
    NavigationComponent,
    ActionbarComponent,
    EnketoComponent,
    AnalyticsTargetsProgressComponent,
    AnalyticsFilterComponent,
    AnalyticsTargetsDetailsComponent,
    MobileDetectionComponent,
    ErrorLogComponent,
    PanelHeaderComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    FormsModule,
    PipesModule,
    DirectivesModule,
    MatIconModule,
    MatButtonModule,
    MatBottomSheetModule,
    MatDialogModule,
    MatListModule,
    BsDropdownModule,
  ],
  exports: [
    HeaderComponent,
    SnackbarComponent,
    ContentRowListItemComponent,
    ReportVerifyValidIconComponent,
    ReportVerifyInvalidIconComponent,
    DateFilterComponent,
    FacilityFilterComponent,
    FormTypeFilterComponent,
    FastActionButtonComponent,
    StatusFilterComponent,
    SearchBarComponent,
    MultiselectBarComponent,
    FreetextFilterComponent,
    ResetFiltersComponent,
    SortFilterComponent,
    SenderComponent,
    ReportImageComponent,
    NavigationComponent,
    ActionbarComponent,
    EnketoComponent,
    AnalyticsTargetsProgressComponent,
    ErrorLogComponent,
    AnalyticsFilterComponent,
    AnalyticsTargetsDetailsComponent,
    PanelHeaderComponent,
  ]
})
export class ComponentsModule { }
