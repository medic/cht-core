import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HeaderLogoPipe, PartnerImagePipe, ResourceIconPipe } from './resource-icon.pipe';
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
} from './date.pipe';
import {
  ClinicPipe, LineagePipe, SummaryPipe, TitlePipe
} from './message.pipe'
import { FormIconNamePipe } from '@mm-pipes/form-icon-name.pipe';
import { FormIconPipe } from '@mm-pipes/form-icon.pipe';
import { SafeHtmlPipe } from '@mm-pipes/safe-html.pipe';

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
  ]
})
export class PipesModule { }
