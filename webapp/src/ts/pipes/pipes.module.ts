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

@NgModule({
  declarations: [
    HeaderLogoPipe,
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
    TaskDueDatePipe,
    WeeksPregnantPipe,
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    HeaderLogoPipe,
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
    TaskDueDatePipe,
    WeeksPregnantPipe,
  ]
})
export class PipesModule { }
