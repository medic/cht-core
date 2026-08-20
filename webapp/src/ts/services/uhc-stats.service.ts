import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { isObject as _isObject, uniq as _uniq } from 'lodash-es';
import * as CalendarInterval from '@medic/calendar-interval';

import { DbService } from '@mm-services/db.service';
import { ChangesService } from '@mm-services/changes.service';
import { ContactChangeFilterService } from '@mm-services/contact-change-filter.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { SessionService } from '@mm-services/session.service';
import { AuthService } from '@mm-services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UHCStatsService {
  private readonly UHC_STATS_PERMISSION = 'can_view_uhc_stats';
  private readonly LAST_VISITED_DATE_PERMISSION = 'can_view_last_visited_date';
  private readonly canView: Record<string, Promise<boolean> | boolean> = {};
  private lastVisitedDates?: Promise<Record<string, number>>;
  private changesSubscription;

  constructor(
    private dbService: DbService,
    private changesService: ChangesService,
    private contactChangeFilterService: ContactChangeFilterService,
    private contactTypesService: ContactTypesService,
    private sessionService: SessionService,
    private authService: AuthService
  ) { }

  private getMaxVisitDate(rowValue) {
    return _isObject(rowValue) ? (rowValue as any).max : rowValue;
  }

  private async getLastVisitedDate(contactId) {
    const records = await this.dbService
      .get()
      .query('medic-client/contacts_by_last_visited', { reduce: true, group: true, key: contactId });

    const lastVisitedDateRow = records?.rows?.length ? records.rows[0] : {};

    return this.getMaxVisitDate(lastVisitedDateRow.value);
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

  private canUserView(permission) {
    if (this.canView[permission] === undefined) {
      // Disable UHC for DB admins.
      this.canView[permission] = this.sessionService.isAdmin() ? false : this.authService.has(permission);
    }

    return this.canView[permission];
  }

  private getLastVisitedDatesMap(records) {
    const lastVisitedDates = {};
    records?.rows?.forEach(row => {
      lastVisitedDates[row.key] = this.getMaxVisitDate(row.value);
    });
    return lastVisitedDates;
  }

  private isLastVisitedDateChange(change) {
    // deleted changes carry no doc content, so err on the side of invalidating
    return change.deleted ||
      this.contactChangeFilterService.isVisitReport(change.doc) ||
      this.contactTypesService.includes(change.doc);
  }

  private watchLastVisitedDateChanges() {
    if (this.changesSubscription) {
      return;
    }
    this.changesSubscription = this.changesService.subscribe({
      key: 'uhc-stats-service',
      filter: change => this.isLastVisitedDateChange(change),
      callback: () => this.lastVisitedDates = undefined,
    });
  }

  private getAllLastVisitedDates(): Promise<Record<string, number>> {
    if (this.lastVisitedDates) {
      return this.lastVisitedDates;
    }

    this.watchLastVisitedDateChanges();
    // querying with keys in PouchDB is very unoptimal, so offline users query the whole view.
    // The result is cached and invalidated through the changes feed, so the price is paid once per
    // relevant change instead of once per contact selection.
    const lastVisitedDates = Promise
      .resolve(this.dbService.get().query('medic-client/contacts_by_last_visited', { reduce: true, group: true }))
      .then(records => this.getLastVisitedDatesMap(records));
    // don't cache failures
    lastVisitedDates.catch(() => {
      if (this.lastVisitedDates === lastVisitedDates) {
        this.lastVisitedDates = undefined;
      }
    });
    this.lastVisitedDates = lastVisitedDates;

    return lastVisitedDates;
  }

  private async getLastVisitedDates(contactIds): Promise<Record<string, number>> {
    if (!this.sessionService.isOnlineOnly()) {
      return this.getAllLastVisitedDates();
    }

    const records = await this.dbService
      .get()
      .query('medic-client/contacts_by_last_visited', { reduce: true, group: true, keys: contactIds });

    return this.getLastVisitedDatesMap(records);
  }

  private async getVisitsByContactInDateRange(contactIds, dateRange: DateRange) {
    const visitsByContact = {};

    if (!contactIds.length) {
      return visitsByContact;
    }

    if (this.sessionService.isOnlineOnly()) {
      // scoped per-contact reads, to avoid downloading every visit report on the instance
      await Promise.all(contactIds.map(async contactId => {
        visitsByContact[contactId] = await this.getVisitsInDateRange(dateRange, contactId);
      }));
      return visitsByContact;
    }

    const records = await this.dbService
      .get()
      .query('medic-client/visits_by_date', { start_key: dateRange.start, end_key: dateRange.end });

    records?.rows?.forEach(row => {
      const day = moment(row.key).startOf('day').valueOf();
      visitsByContact[row.value] = visitsByContact[row.value] || [];
      visitsByContact[row.value].push(day);
    });
    Object.keys(visitsByContact).forEach(contactId => {
      visitsByContact[contactId] = _uniq(visitsByContact[contactId]);
    });

    return visitsByContact;
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

    const canView = await this.canUserView(this.UHC_STATS_PERMISSION);

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
      countGoal: visitCountSettings.visitCountGoal
    };
  }

  /**
   * Batched version of getHomeVisitStats: returns visit stats for many contacts at once.
   * Used to display UHC info in lists of contacts.
   */
  async getVisitStats(
    contactIds: string[],
    visitCountSettings: VisitCountSettings
  ): Promise<Record<string, VisitStats>> {
    const stats: Record<string, VisitStats> = {};

    if (!visitCountSettings || !contactIds?.length) {
      return stats;
    }

    const canView = await this.canUserView(this.LAST_VISITED_DATE_PERMISSION);
    if (!canView) {
      return stats;
    }

    const dateRange = this.getUHCInterval(visitCountSettings)!;
    const lastVisitedDates = await this.getLastVisitedDates(contactIds);
    // contacts whose last visit predates the interval cannot have visits within it
    const visitedContactIds = contactIds.filter(contactId => lastVisitedDates[contactId] >= dateRange.start);
    const visitsByContact = await this.getVisitsByContactInDateRange(visitedContactIds, dateRange);

    contactIds.forEach(contactId => {
      const lastVisitedDate = lastVisitedDates[contactId];
      if (!Number.isInteger(lastVisitedDate)) {
        return;
      }
      stats[contactId] = {
        lastVisitedDate: lastVisitedDate,
        count: visitsByContact[contactId]?.length || 0,
        countGoal: visitCountSettings.visitCountGoal
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
  countGoal?: number;
}
