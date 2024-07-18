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
}
