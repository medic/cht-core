import { Injectable } from '@angular/core';

import { TranslateService } from '@mm-services/translate.service';
import { RelativeDateService } from '@mm-services/relative-date.service';

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
  ) { }

  setVisitDetails(contact, stats: { lastVisitedDate?: number; count?: number; countGoal?: number }) {
    if (!stats || !Number.isInteger(stats.lastVisitedDate)) {
      return;
    }
    contact.lastVisitedDate = stats.lastVisitedDate;
    this.setVisitOverdue(contact, stats.lastVisitedDate);
    this.setVisitCountDetails(contact, stats.count, stats.countGoal);
  }

  private setVisitOverdue(contact, lastVisitedDate) {
    if (lastVisitedDate === 0) {
      contact.overdue = true;
      contact.summary = this.translateService.instant('contact.last.visit.unknown');
      return;
    }
    const now = new Date().getTime();
    const overduePeriodAgo = now - (this.OVERDUE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    contact.overdue = lastVisitedDate <= overduePeriodAgo;
    contact.summary = this.translateService.instant(
      'contact.last.visited.date',
      { date: this.relativeDateService.getRelativeDate(lastVisitedDate, {}) }
    );
  }

  private setVisitCountDetails(contact, count, countGoal) {
    const visitCount = Math.min(count, this.MAX_DISPLAYED_VISIT_COUNT) +
      (count > this.MAX_DISPLAYED_VISIT_COUNT ? '+' : '');
    contact.visits = {
      count: this.translateService.instant('contacts.visits.count', { count: visitCount }),
      summary: this.translateService.instant('contacts.visits.visits', { VISITS: count }),
    };
    if (countGoal) {
      contact.visits.status = this.getVisitStatus(count, countGoal);
    }
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
