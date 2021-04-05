import { Injectable, NgZone } from '@angular/core';
import * as moment from 'moment';
import { isObject as _isObject, uniq as _uniq } from 'lodash-es';
import * as CalendarInterval from '@medic/calendar-interval';

import { SettingsService } from '@mm-services/settings.service';
import { PipesService } from '@mm-services/pipes.service';
import { FeedbackService } from '@mm-services/feedback.service';
import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { UHCSettingsService } from '@mm-services/uhc-settings.service';

/**
 * Service for generating summary information based on a given
 * contact and reports about them.
 * Documentation: https://github.com/medic/medic-docs/blob/master/configuration/contact-summary.md
 */
@Injectable({
  providedIn: 'root'
})
export class ContactSummaryService {
  private readonly SETTING_NAME = 'contact_summary';
  private generatorFunction;
  private settings;

  constructor(
    private settingsService:SettingsService,
    private pipesService:PipesService,
    private feedbackService:FeedbackService,
    private ngZone:NgZone,
    private dbService:DbService,
    private sessionService:SessionService,
    private uhcSettingsService:UHCSettingsService
  ) { }

  private async getGeneratorFunction() {
    if (!this.settings) {
      this.settings = await this.settingsService.get();
    }

    if (!this.generatorFunction) {
      const script = this.settings[this.SETTING_NAME];

      if (!script) {
        this.generatorFunction = function() {};
      } else {
        this.generatorFunction = new Function('contact', 'reports', 'lineage', 'targetDoc', 'stats', script);
      }
    }

    return this.generatorFunction;
  }

  private applyFilter(field) {
    if (field && field.filter) {
      try {
        field.value = this.pipesService.transform(field.filter, field.value);
      } catch(e) {
        console.error(e);
        throw new Error('Unknown filter: ' + field.filter + '. Check your configuration.');
      }
    }
  }

  private applyFilters(summary) {
    console.debug('contact summary eval result', summary);

    summary = summary || {};
    summary.fields = (summary.fields && Array.isArray(summary.fields)) ? summary.fields : [];
    summary.cards = (summary.cards && Array.isArray(summary.cards)) ? summary.cards : [];

    summary.fields.forEach(field => this.applyFilter(field));
    summary.cards.forEach((card) => {
      if (card && card.fields && Array.isArray(card.fields)) {
        card.fields.forEach(field => this.applyFilter(field));
      }
    });
    return summary;
  }

  private getContactsByLastVisited(contactId) {
    if (this.sessionService.isOnlineOnly()) {
      return this.dbService
        .get()
        .query(
          'medic-client/contacts_by_last_visited',
          { reduce: true, group: true, keys: [contactId] }
        );
    }
    // querying with keys in PouchDB is very unoptimal
    return this.dbService
      .get()
      .query(
        'medic-client/contacts_by_last_visited',
        { reduce: true, group: true }
      );
  }

  private async getVisitStats(contactId, settings) {
    const interval = CalendarInterval.getCurrent(settings.monthStartDate);
    const visitStats = { lastVisitedDate: -1, visitDates: [] };

    const visitsInInterval = await this.dbService
      .get()
      .query('medic-client/visits_by_date', { start_key: interval.start, end_key: interval.end });

    visitsInInterval.rows.forEach(row => {
      if (contactId === row.value) {
        visitStats.visitDates.push(moment(row.key).startOf('day').valueOf());
      }
    });

    const contactsByLastVisited = await this.getContactsByLastVisited(contactId);
    contactsByLastVisited.rows.forEach(row => {
      if (contactId === row.key) {
        visitStats.lastVisitedDate = _isObject(row.value) ? row.value.max : row.value;
      }
    });

    return {
      visit: {
        lastVisitedDate: visitStats.lastVisitedDate,
        count: _uniq(visitStats.visitDates).length,
        countGoal: settings.visitCountGoal
      }
    };
  }

  get(contact, reports, lineage, targetDoc?) {
    return this.ngZone.runOutsideAngular(() => this._get(contact, reports, lineage, targetDoc));
  }

  private async _get(contact, reports, lineage, targetDoc?) {
    const generatorFunction = await this.getGeneratorFunction();
    const stats = await this.getVisitStats(contact._id, this.uhcSettingsService.getVisitCountSettings(this.settings));

    try {
      const summary = generatorFunction(contact, reports || [], lineage || [], targetDoc, stats);
      return Promise.resolve(this.applyFilters(summary));
    } catch (error) {
      console.error('Configuration error in contact-summary function: ' + error);
      this.feedbackService.submit('Configuration error in contact-summary function: ' + error.message, false);
      throw new Error('Configuration error');
    }
  }
}
