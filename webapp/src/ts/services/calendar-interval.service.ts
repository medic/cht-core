import { Injectable } from '@angular/core';
import * as CalendarInterval from '@medic/calendar-interval';

@Injectable({
  providedIn: 'root'
})
export class CalendarIntervalService {
  
  constructor() { }
  
  getCurrent(startDate: number) {
    return CalendarInterval.getCurrent(startDate);
  }

  /**
   * Returns the calendaristic interval that starts on the startDate day of month
   * and contains date represented by timestamp.
   * EG: getInterval(3, new Date('2023-08-21').valueOf()) will return
   * the calendar interval of 2023-08-03 -> 2023-09-02
   * @param startDate {number} interval start day - 1-31
   * @param timestamp {number} date that should be included by the interval
   */
  getInterval(startDate:number, timestamp:number) {
    return CalendarInterval.getInterval(startDate, timestamp);
  }
}
