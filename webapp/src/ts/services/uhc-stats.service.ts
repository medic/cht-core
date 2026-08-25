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
  // getHomeVisitStats feeds the UHC card on a contact's profile, gated by its own permission.
  // getVisitStats feeds the visit badges on contact rows, gated by the same permission as the
  // badges the contact list computes through Search extras, so both lists show or hide together.
  private readonly UHC_STATS_PERMISSION = 'can_view_uhc_stats';
  private readonly LAST_VISITED_DATE_PERMISSION = 'can_view_last_visited_date';
  private readonly VISIT_QUERY_BATCH_SIZE = 10;
  private readonly canView: Record<string, Promise<boolean>> = {};

  constructor(
    private dbService: DbService,
    private contactTypesService: ContactTypesService,
    private sessionService: SessionService,
    private authService: AuthService
  ) { }

  private getMaxVisitDate(rowValue: { max?: number } | number | undefined): number | undefined {
    return _isObject(rowValue) ? (rowValue as { max?: number }).max : rowValue;
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
        // AuthService.has rethrows 503s (api unavailable, e.g. during startup): don't cache the
        // failure, so the check is retried on the next call
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

  private async getLastVisitedDates(contactIds): Promise<Record<string, number>> {
    // keyed queries against this reduced view are cheap in PouchDB and CouchDB alike (measured
    // ~6ms for 50 keys over a 30k doc device db, vs ~300ms for the whole view the contact list's
    // Search extras query — see #8248), so the stats are re-queried whenever they need to refresh
    const records = await this.dbService
      .get()
      .query('medic-client/contacts_by_last_visited', { reduce: true, group: true, keys: contactIds });
    return this.getLastVisitedDatesMap(records);
  }

  private async getVisitsInDateRangeBatched(contactIds, dateRange: DateRange) {
    const visitsByContact = {};
    const failedContactIds: string[] = [];
    let lastError;

    // per-contact reads — the shape getHomeVisitStats already uses — so online users don't download
    // every visit report on the instance, batched so a long children list doesn't monopolise the
    // browser's connection pool
    for (let i = 0; i < contactIds.length; i += this.VISIT_QUERY_BATCH_SIZE) {
      const batch = contactIds.slice(i, i + this.VISIT_QUERY_BATCH_SIZE);
      await Promise.all(batch.map(async contactId => {
        try {
          visitsByContact[contactId] = await this.getVisitsInDateRange(dateRange, contactId);
        } catch (error) {
          // a null marks the failure, so the contact is skipped instead of getting a false zero count
          visitsByContact[contactId] = null;
          failedContactIds.push(contactId);
          lastError = error;
        }
      }));
    }

    if (failedContactIds.length) {
      // one log line for the whole call: console.error generates feedback docs, and one distinct
      // message per contact would flood the feedback db whenever the connection is bad
      console.error(
        `Error fetching visits within the UHC interval for ${failedContactIds.length} contact(s): ` +
        `${failedContactIds.join(', ')}`,
        lastError
      );
    }

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
    const visits = lastVisitedDate !== undefined && lastVisitedDate >= dateRange?.start
      ? await this.getVisitsInDateRange(dateRange, contact._id)
      : [];

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

    const dateRange = this.getUHCInterval(visitCountSettings);
    if (!dateRange) {
      return stats;
    }

    const lastVisitedDates = await this.getLastVisitedDates(contactIds);
    // contacts whose last visit predates the interval cannot have visits within it
    const visitedContactIds = contactIds.filter(contactId => lastVisitedDates[contactId] >= dateRange.start);
    const visitsByContact = await this.getVisitsInDateRangeBatched(visitedContactIds, dateRange);

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
  // a contact with no row in the view (e.g. free-form type not indexed by it) has no date at all,
  // as opposed to the view's 0 for "never visited"
  lastVisitedDate?: number; // Timestamp
  count: number;
  countGoal?: number;
}
