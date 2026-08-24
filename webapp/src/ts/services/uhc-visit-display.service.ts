import { Injectable, NgZone } from '@angular/core';

import { TranslateService } from '@mm-services/translate.service';
import { RelativeDateService } from '@mm-services/relative-date.service';
import { SettingsService } from '@mm-services/settings.service';
import { UHCSettingsService } from '@mm-services/uhc-settings.service';
import { UHCStatsService } from '@mm-services/uhc-stats.service';

/**
 * Formats UHC visit stats for display on a contact row: last visited summary,
 * overdue state and visit count badge. Used by both the contact list and the
 * children lists in the contact detail page, so both render identical badges.
 */
@Injectable({
  providedIn: 'root'
})
export class UHCVisitDisplayService {
  // a contact is overdue when the last visit is older than this
  private readonly OVERDUE_PERIOD_DAYS = 30;
  private readonly MAX_DISPLAYED_VISIT_COUNT = 99;

  constructor(
    private translateService: TranslateService,
    private relativeDateService: RelativeDateService,
    private settingsService: SettingsService,
    private uhcSettingsService: UHCSettingsService,
    private uhcStatsService: UHCStatsService,
    private ngZone: NgZone,
  ) { }

  /**
   * Returns UHC visit stats display details for the given child model groups, keyed by contact id,
   * or undefined when there is nothing to display.
   * Kept separate from loading the children so they can render without waiting on the stats queries.
   */
  getChildrenVisitStats(children): Promise<Record<string, VisitDetails> | undefined> {
    return this.ngZone.runOutsideAngular(() => this._getChildrenVisitStats(children));
  }

  private async _getChildrenVisitStats(children) {
    const groups = children?.filter(group => group.type?.count_visits && group.contacts?.length);
    if (!groups?.length) {
      return;
    }

    const settings = await this.settingsService.get();
    const visitCountSettings = this.uhcSettingsService.getVisitCountSettings(settings);
    const contactIds = groups
      .map(group => group.contacts.map(child => child.doc?._id))
      .flat()
      .filter(id => !!id);
    const visitStats = await this.uhcStatsService.getVisitStats(contactIds, visitCountSettings);

    const visitDetails = {};
    Object.keys(visitStats).forEach(contactId => {
      const details = this.getVisitDetails(visitStats[contactId]);
      if (details) {
        visitDetails[contactId] = details;
      }
    });

    return Object.keys(visitDetails).length ? visitDetails : undefined;
  }

  /**
   * Returns the display details for the given visit stats, or undefined when there is nothing to
   * display. Pure: merging the result into a contact row is the caller's choice.
   */
  getVisitDetails(stats: { lastVisitedDate?: number; count: number; countGoal?: number }): VisitDetails | undefined {
    if (!stats || !Number.isInteger(stats.lastVisitedDate)) {
      return;
    }
    const details: VisitDetails = {
      lastVisitedDate: stats.lastVisitedDate!,
      ...this.getVisitOverdue(stats.lastVisitedDate),
    };
    if (Number.isInteger(stats.count)) {
      details.visits = this.getVisitCountDetails(stats.count, stats.countGoal);
    }
    return details;
  }

  private getVisitOverdue(lastVisitedDate) {
    if (lastVisitedDate === 0) {
      return {
        overdue: true,
        summary: this.translateService.instant('contact.last.visited.unknown'),
      };
    }
    const now = new Date().getTime();
    const overduePeriodAgo = now - (this.OVERDUE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    return {
      overdue: lastVisitedDate <= overduePeriodAgo,
      summary: this.translateService.instant(
        'contact.last.visited.date',
        { date: this.relativeDateService.getRelativeDate(lastVisitedDate, {}) }
      ),
    };
  }

  private getVisitCountDetails(count, countGoal) {
    const visitCount = Math.min(count, this.MAX_DISPLAYED_VISIT_COUNT) +
      (count > this.MAX_DISPLAYED_VISIT_COUNT ? '+' : '');
    const visits: VisitDetails['visits'] = {
      count: this.translateService.instant('contacts.visits.count', { count: visitCount }),
      summary: this.translateService.instant('contacts.visits.visits', { VISITS: count }),
    };
    if (countGoal) {
      visits.status = this.getVisitStatus(count, countGoal);
    }
    return visits;
  }

  private getVisitStatus(visitCount, visitCountGoal) {
    if (!visitCount) {
      return 'pending';
    }
    if (visitCount < visitCountGoal) {
      return 'started';
    }
    return 'done';
  }
}

export interface VisitDetails {
  lastVisitedDate: number;
  overdue: boolean;
  summary: string;
  visits?: {
    count: string;
    summary: string;
    status?: 'pending' | 'started' | 'done';
  };
}
