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
  ]
})
export class PipesModule { }
