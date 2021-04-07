import { Injectable, NgZone } from '@angular/core';

import { SettingsService } from '@mm-services/settings.service';
import { PipesService } from '@mm-services/pipes.service';
import { FeedbackService } from '@mm-services/feedback.service';
import { UHCSettingsService } from '@mm-services/uhc-settings.service';
import { ContactStatsService } from '@mm-services/contact-stats.service';

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
    private uhcSettingsService:UHCSettingsService,
    private contactStatsService:ContactStatsService
  ) { }

  private async getGeneratorFunction(settings = {}) {
    if (!this.generatorFunction) {
      const script = settings[this.SETTING_NAME];

      if (!script) {
        this.generatorFunction = function() {};
      } else {
        this.generatorFunction = new Function('contact', 'reports', 'lineage', 'stats', 'targetDoc', script);
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

  get(contact, reports, lineage, targetDoc?) {
    return this.ngZone.runOutsideAngular(() => {
      return this
        ._get(contact, reports, lineage, targetDoc)
        .catch(error => {
          console.error('Error when getting contact summary:', error);
        });
    });
  }

  private async _get(contact, reports, lineage, targetDoc?) {
    if (!this.settings) {
      this.settings = await this.settingsService.get();
    }

    const generatorFunction = await this.getGeneratorFunction(this.settings);
    const visitCountSettings = this.uhcSettingsService.getVisitCountSettings(this.settings);
    const stats = {
      visit: await this.contactStatsService.getVisitStats(contact._id, visitCountSettings)
    };

    try {
      const summary = generatorFunction(contact, reports || [], lineage || [], stats, targetDoc);
      return this.applyFilters(summary);
    } catch (error) {
      console.error('Configuration error in contact-summary function: ' + error);
      this.feedbackService.submit('Configuration error in contact-summary function: ' + error.message, false);
      throw new Error('Configuration error');
    }
  }
}
