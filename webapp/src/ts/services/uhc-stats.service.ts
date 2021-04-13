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
  hasHomeVisitPermission;

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

    return records?.rows?.map(row => {
      return moment(row.key[1])
        .startOf('day')
        .valueOf();
    });
  }

  private async canViewHomeVisitStats() {
    if (this.hasHomeVisitPermission !== undefined) {
      return this.hasHomeVisitPermission;
    }

    const permission = 'can_view_uhc_stats';
    // Disable UHC for DB admins.
    this.hasHomeVisitPermission = this.sessionService.isDbAdmin() ? false : await this.authService.has(permission);

    return this.hasHomeVisitPermission;
  }

  async getHomeVisitStats(contact, visitCountSettings: VisitCountSettings): Promise<VisitStats> {
    if (!visitCountSettings || !contact) {
      return;
    }

    const canView = await this.canViewHomeVisitStats();

    if (!canView) {
      return;
    }

    const typeId = this.contactTypesService.getTypeId(contact);
    const type = await this.contactTypesService.get(typeId);

    if (!type?.count_visits) {
      return;
    }

    const lastVisitedDate = await this.getLastVisitedDate(contact._id);
    const dateRange = CalendarInterval.getCurrent(visitCountSettings.monthStartDate);
    const visits = lastVisitedDate >= dateRange?.start ? await this.getVisitsInDateRange(dateRange, contact._id) : [];

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
