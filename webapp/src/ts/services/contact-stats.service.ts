import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { isObject as _isObject, uniq as _uniq } from 'lodash-es';
import * as CalendarInterval from '@medic/calendar-interval';

import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';

@Injectable({
  providedIn: 'root'
})
export class ContactStatsService {

  constructor(
    private dbService: DbService,
    private sessionService: SessionService,
  ) { }

  private async getLastVisitedDate(contactId) {
    const queryParams: any = { reduce: true, group: true };

    if (this.sessionService.isOnlineOnly()) {
      // Querying with keys in PouchDB is not optimal, so adding key for online users only.
      queryParams.key = contactId;
    }

    const records = await this.dbService
      .get()
      .query('medic-client/contacts_by_last_visited', queryParams);

    return records.rows.find(row => contactId === row.key);
  }

  private async getVisitsInDateRange(dateRange: DateRange, contactId) {
    const visits = [];
    const records = await this.dbService
      .get()
      .query(
        'medic-client/visits_by_date',
        { start_key: dateRange.start, end_key: dateRange.end }
      );

    records.rows.forEach(row => {
      if (contactId === row.value) {
        visits.push(moment(row.key).startOf('day').valueOf());
      }
    });

    return visits;
  }

  async getVisitStats(contactId, visitCountSettings: VisitCountSettings): VisitStats {
    if (!visitCountSettings || !contactId) {
      return;
    }

    let lastVisitedDate = null;
    const lastVisitedDateRow = await this.getLastVisitedDate(contactId);

    if (lastVisitedDateRow) {
      lastVisitedDate = _isObject(lastVisitedDateRow.value) ? lastVisitedDateRow.value.max : lastVisitedDateRow.value;
    }

    const dateRange = CalendarInterval.getCurrent(visitCountSettings.monthStartDate);
    const visits = await this.getVisitsInDateRange(dateRange, contactId);

    return {
      lastVisitedDate: lastVisitedDate,
      count: _uniq(visits).length,
      countGoal: visitCountSettings.visitCountGoal
    };
  }
}

type DateRange = {
  start: number; // Timestamp
  end: number;
}

interface VisitCountSettings {
  monthStartDate?: number; // Ex: 26
  visitCountGoal?: number;
}

interface VisitStats {
  lastVisitedDate: number; // Timestamp
  count: number;
  countGoal: number;
}
