import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { isObject as _isObject, uniq as _uniq } from 'lodash-es';
import * as CalendarInterval from '@medic/calendar-interval';

import { DbService } from '@mm-services/db.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { SessionService } from '@mm-services/session.service';
import { AuthService } from '@mm-services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UHCStatsService {
  private readonly permission = 'can_view_uhc_stats';
  private canViewUHCStats;

  constructor(
    private dbService: DbService,
    private contactTypesService: ContactTypesService,
    private sessionService: SessionService,
    private authService: AuthService
  ) { }

  private async getLastVisitedDate(contactId) {
    const records = await this.dbService
      .get()
      .query('medic-client/contacts_by_last_visited', { reduce: true, group: true, key: contactId });

    const lastVisitedDateRow = records?.rows?.length ? records.rows[0] : {};

    return _isObject(lastVisitedDateRow.value) ? lastVisitedDateRow.value.max : lastVisitedDateRow.value;
  }

  private async getVisitsInDateRange(dateRange: DateRange, contactId) {
    const records = await this.dbService
      .get()
      .query(
        'medic-client/visits_by_date',
        { start_key: [ contactId, dateRange.start ], end_key: [ contactId, dateRange.end ] }
      );

    const visits = records?.rows?.map(row => {
      return moment(row.key[1])
        .startOf('day')
        .valueOf();
    });

    return _uniq(visits);
  }

  private async canUserViewUHCStats() {
    if (this.canViewUHCStats !== undefined) {
      return this.canViewUHCStats;
    }

    // Disable UHC for DB admins.
    this.canViewUHCStats = this.sessionService.isDbAdmin() ? false : await this.authService.has(this.permission);

    return this.canViewUHCStats;
  }

  getUHCInterval(visitCountSettings: VisitCountSettings): DateRange | undefined {
    if (!visitCountSettings) {
      return;
    }

    return CalendarInterval.getCurrent(visitCountSettings.monthStartDate);
  }

  async getHomeVisitStats(contact, visitCountSettings: VisitCountSettings): Promise<VisitStats | undefined> {
    if (!visitCountSettings || !contact) {
      return;
    }

    const canView = await this.canUserViewUHCStats();

    if (!canView) {
      return;
    }

    const typeId = this.contactTypesService.getTypeId(contact);
    const type = await this.contactTypesService.get(typeId);

    if (!type?.count_visits) {
      return;
    }

    const lastVisitedDate = await this.getLastVisitedDate(contact._id);
    const dateRange = this.getUHCInterval(visitCountSettings)!;
    const visits = lastVisitedDate >= dateRange?.start ? await this.getVisitsInDateRange(dateRange, contact._id) : [];

    return {
      lastVisitedDate: lastVisitedDate,
      count: visits.length,
      countGoal: visitCountSettings.visitCountGoal!
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
