import { Injectable } from '@angular/core';
import * as CalendarInterval from '@medic/calendar-interval';
import moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class CalendarIntervalService {

  constructor() { }

  getCurrent(intervalStartDate) {
    return CalendarInterval.getCurrent(intervalStartDate);
  }

  getPrevious(intervalStartDate) {
    const current = this.getCurrent(intervalStartDate);
    const dateInPreviousInterval = moment(current.start).subtract(1, 'days').valueOf();
    return CalendarInterval.getInterval(intervalStartDate, dateInPreviousInterval);
  }
}
