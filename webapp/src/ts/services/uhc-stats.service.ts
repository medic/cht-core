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
  private readonly lastVisitedDatePermission = 'can_view_last_visited_date';
  private canViewUHCStats;
  private canViewLastVisitedDate;

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
    this.canViewUHCStats = this.sessionService.isAdmin() ? false : await this.authService.has(this.permission);

    return this.canViewUHCStats;
  }

  private async canUserViewLastVisitedDate() {
    if (this.canViewLastVisitedDate !== undefined) {
      return this.canViewLastVisitedDate;
    }

    // Disable UHC for DB admins.
    this.canViewLastVisitedDate = this.sessionService.isAdmin()
      ? false
      : await this.authService.has(this.lastVisitedDatePermission);

    return this.canViewLastVisitedDate;
  }

  private async getLastVisitedDates(contactIds) {
    const options: Record<string, unknown> = { reduce: true, group: true };
    if (this.sessionService.isOnlineOnly()) {
      options.keys = contactIds;
    }
    // querying with keys in PouchDB is very unoptimal, so offline users query the whole view
    const records = await this.dbService
      .get()
      .query('medic-client/contacts_by_last_visited', options);

    const lastVisitedDates = {};
    records?.rows?.forEach(row => {
      lastVisitedDates[row.key] = _isObject(row.value) ? (row.value as any).max : row.value;
    });

    return lastVisitedDates;
  }

  private async getVisitDatesInDateRange(dateRange: DateRange) {
    const records = await this.dbService
      .get()
      .query('medic-client/visits_by_date', { start_key: dateRange.start, end_key: dateRange.end });

    const visitDates = {};
    records?.rows?.forEach(row => {
      const day = moment(row.key).startOf('day').valueOf();
      visitDates[row.value] = visitDates[row.value] || [];
      visitDates[row.value].push(day);
    });

    return visitDates;
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

  /**
   * Batched version of getHomeVisitStats: returns visit stats for many contacts using two view queries,
   * instead of two queries per contact. Used to display UHC info in lists of contacts.
   */
  async getVisitStats(
    contactIds: string[],
    visitCountSettings: VisitCountSettings
  ): Promise<Record<string, VisitStats>> {
    const stats: Record<string, VisitStats> = {};

    if (!visitCountSettings || !contactIds?.length) {
      return stats;
    }

    const canView = await this.canUserViewLastVisitedDate();
    if (!canView) {
      return stats;
    }

    const dateRange = this.getUHCInterval(visitCountSettings)!;
    const [ lastVisitedDates, visitDates ] = await Promise.all([
      this.getLastVisitedDates(contactIds),
      this.getVisitDatesInDateRange(dateRange),
    ]);

    contactIds.forEach(contactId => {
      const lastVisitedDate = lastVisitedDates[contactId];
      if (!Number.isInteger(lastVisitedDate)) {
        return;
      }
      stats[contactId] = {
        lastVisitedDate: lastVisitedDate,
        count: _uniq(visitDates[contactId]).length,
        countGoal: visitCountSettings.visitCountGoal!
      };
    });

    return stats;
  }
}

type DateRange = {
  start: number; // Timestamp
  end: number;
};

interface VisitCountSettings {
  monthStartDate?: number; // Ex: 26
  visitCountGoal?: number;
}

interface VisitStats {
  lastVisitedDate: number; // Timestamp
  count: number;
  countGoal: number;
}
