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
  private readonly REMOTE_QUERY_BATCH_SIZE = 10;
  private readonly canView: Record<string, Promise<boolean>> = {};
  private lastVisitedDates?: Promise<Record<string, number>>;
  private cachedLastVisitedDates?: Record<string, number>;
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

  private canUserView(permission): Promise<boolean> {
    if (!this.canView[permission]) {
      const canView = this.checkPermission(permission).catch(error => {
        // don't cache failures (e.g. api briefly unavailable), so the check is retried on the next call
        if (this.canView[permission] === canView) {
          delete this.canView[permission];
        }
        throw error;
      });
      this.canView[permission] = canView;
    }

    return this.canView[permission];
  }

  private async checkPermission(permission): Promise<boolean> {
    // Disable UHC for DB admins.
    return this.sessionService.isAdmin() ? false : this.authService.has(permission);
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
    if (change.deleted || this.contactChangeFilterService.isVisitReport(change.doc)) {
      return true;
    }
    // contacts_by_last_visited emits a constant value for contact docs, so contact edits cannot
    // change its output: only contacts the cache hasn't seen yet are relevant
    return this.contactTypesService.includes(change.doc) &&
      this.cachedLastVisitedDates?.[change.doc._id] === undefined;
  }

  private watchLastVisitedDateChanges() {
    if (this.changesSubscription) {
      return;
    }
    this.changesSubscription = this.changesService.subscribe({
      key: 'uhc-stats-service',
      filter: change => this.isLastVisitedDateChange(change),
      callback: change => this.updateLastVisitedDates(change),
    });
  }

  private updateLastVisitedDates(change) {
    const isNewContact = !change?.deleted && this.contactTypesService.includes(change?.doc);
    if (isNewContact && this.cachedLastVisitedDates) {
      // a contact the view hasn't seen appears in it with a constant 0 ("never visited"): patch the
      // cache instead of re-querying the whole view. The contact's visit reports, if it has any,
      // arrive as separate changes and invalidate the cache below.
      this.cachedLastVisitedDates[change.doc._id] = 0;
      return;
    }
    this.lastVisitedDates = undefined;
    this.cachedLastVisitedDates = undefined;
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
      .then(records => {
        const dates = this.getLastVisitedDatesMap(records);
        if (this.lastVisitedDates === lastVisitedDates) {
          this.cachedLastVisitedDates = dates;
        }
        return dates;
      });
    // don't cache failures
    lastVisitedDates.catch(() => {
      if (this.lastVisitedDates === lastVisitedDates) {
        this.lastVisitedDates = undefined;
      }
    });
    this.lastVisitedDates = lastVisitedDates;

    return lastVisitedDates;
  }

  private async getVisitData(contactIds, dateRange: DateRange): Promise<[
    Record<string, number>,
    Record<string, number[] | null>
  ]> {
    if (!this.sessionService.isOnlineOnly()) {
      // both queries hit the local db and don't depend on each other, so run them concurrently
      return await Promise.all([
        this.getAllLastVisitedDates(),
        this.getLocalVisitsInDateRange(contactIds, dateRange),
      ]);
    }

    const records = await this.dbService
      .get()
      .query('medic-client/contacts_by_last_visited', { reduce: true, group: true, keys: contactIds });
    const lastVisitedDates = this.getLastVisitedDatesMap(records);
    // contacts whose last visit predates the interval cannot have visits within it
    const visitedContactIds = contactIds.filter(contactId => lastVisitedDates[contactId] >= dateRange.start);
    const visitsByContact = await this.getRemoteVisitsInDateRange(visitedContactIds, dateRange);

    return [ lastVisitedDates, visitsByContact ];
  }

  private async getRemoteVisitsInDateRange(contactIds, dateRange: DateRange) {
    const visitsByContact = {};

    // scoped per-contact reads, to avoid downloading every visit report on the instance, batched so a
    // long children list doesn't monopolise the browser's connection pool
    for (let i = 0; i < contactIds.length; i += this.REMOTE_QUERY_BATCH_SIZE) {
      const batch = contactIds.slice(i, i + this.REMOTE_QUERY_BATCH_SIZE);
      await Promise.all(batch.map(async contactId => {
        try {
          visitsByContact[contactId] = await this.getVisitsInDateRange(dateRange, contactId);
        } catch (error) {
          console.error(`Error fetching visits within the UHC interval for contact "${contactId}"`, error);
          // marks the failure, so the contact is skipped instead of getting a false zero count
          visitsByContact[contactId] = null;
        }
      }));
    }

    return visitsByContact;
  }

  private async getLocalVisitsInDateRange(contactIds, dateRange: DateRange) {
    const visitsByContact = {};
    const requestedContactIds = new Set(contactIds);

    const records = await this.dbService
      .get()
      .query('medic-client/visits_by_date', { start_key: dateRange.start, end_key: dateRange.end });

    records?.rows?.forEach(row => {
      if (!requestedContactIds.has(row.value)) {
        return;
      }
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
    const [ lastVisitedDates, visitsByContact ] = await this.getVisitData(contactIds, dateRange);

    contactIds.forEach(contactId => {
      const lastVisitedDate = lastVisitedDates[contactId];
      const visits = visitsByContact[contactId];
      // a null marks a failed per-contact visits query: skip the row rather than display a false zero
      if (!Number.isInteger(lastVisitedDate) || visits === null) {
        return;
      }
      stats[contactId] = {
        lastVisitedDate: lastVisitedDate,
        count: visits?.length || 0,
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
