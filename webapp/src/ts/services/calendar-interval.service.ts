import { Injectable } from '@angular/core';
import * as CalendarInterval from '@medic/calendar-interval';

@Injectable({
  providedIn: 'root'
})
export class CalendarIntervalService {

  constructor() { }

  getCurrent(startDate) {
    return CalendarInterval.getCurrent(startDate);
  }

  getPrevious(startDate: number, referenceDate?: Date) {
    return CalendarInterval.getPrevious(startDate, referenceDate);
  }
}
