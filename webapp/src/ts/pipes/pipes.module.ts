import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HeaderLogoPipe, PartnerImagePipe, ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';
import {
  AgePipe,
  AutoreplyPipe,
  DateOfDeathPipe,
  DayMonthPipe,
  FullDatePipe,
  RelativeDatePipe,
  RelativeDayPipe,
  SimpleDatePipe,
  SimpleDateTimePipe,
  StatePipe,
  TaskDueDatePipe,
  WeeksPregnantPipe
} from '@mm-pipes/date.pipe';
import {
  ClinicPipe, LineagePipe, SummaryPipe, TitlePipe
} from '@mm-pipes/message.pipe';
import { FormIconNamePipe } from '@mm-pipes/form-icon-name.pipe';
import { FormIconPipe } from '@mm-pipes/form-icon.pipe';
import { SafeHtmlPipe } from '@mm-pipes/safe-html.pipe';
import { PhonePipe } from '@mm-pipes/phone.pipe';
import { TranslateFromPipe } from '@mm-pipes/translate-from.pipe';
import { LocalizeNumberPipe } from '@mm-pipes/number.pipe';
import { BootstrapTranslatePipe } from '@mm-pipes/bootstrap-translate.pipe';

@NgModule({
  declarations: [
    ClinicPipe,
    HeaderLogoPipe,
    LineagePipe,
    PartnerImagePipe,
    ResourceIconPipe,
    AgePipe,
    AutoreplyPipe,
    DateOfDeathPipe,
    DayMonthPipe,
    FullDatePipe,
    RelativeDatePipe,
    RelativeDayPipe,
    SimpleDatePipe,
    SimpleDateTimePipe,
    StatePipe,
    SummaryPipe,
    TaskDueDatePipe,
    TitlePipe,
    WeeksPregnantPipe,
    FormIconNamePipe,
    FormIconPipe,
    SafeHtmlPipe,
    PhonePipe,
    TranslateFromPipe,
    LocalizeNumberPipe,
    BootstrapTranslatePipe,
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    ClinicPipe,
    HeaderLogoPipe,
    LineagePipe,
    PartnerImagePipe,
    ResourceIconPipe,
    AgePipe,
    AutoreplyPipe,
    DateOfDeathPipe,
    DayMonthPipe,
    FullDatePipe,
    RelativeDatePipe,
    RelativeDayPipe,
    SimpleDatePipe,
    SimpleDateTimePipe,
    StatePipe,
    SummaryPipe,
    TaskDueDatePipe,
    TitlePipe,
    WeeksPregnantPipe,
    FormIconNamePipe,
    FormIconPipe,
    SafeHtmlPipe,
    PhonePipe,
    TranslateFromPipe,
    LocalizeNumberPipe,
    BootstrapTranslatePipe,
  ]
})
export class PipesModule { }
