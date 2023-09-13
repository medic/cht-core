import { Injectable, NgZone } from '@angular/core';

import { SettingsService } from '@mm-services/settings.service';
import { PipesService } from '@mm-services/pipes.service';
import { FeedbackService } from '@mm-services/feedback.service';
import { UHCSettingsService } from '@mm-services/uhc-settings.service';
import { UHCStatsService } from '@mm-services/uhc-stats.service';
import { CHTScriptApiService } from '@mm-services/cht-script-api.service';

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
  private visitCountSettings;

  constructor(
    private settingsService:SettingsService,
    private pipesService:PipesService,
    private feedbackService:FeedbackService,
    private ngZone:NgZone,
    private uhcSettingsService:UHCSettingsService,
    private uhcStatsService:UHCStatsService,
    private chtScriptApiService:CHTScriptApiService
  ) { }

  private getGeneratorFunction() {
    if (!this.generatorFunction) {
      const script = this.settings[this.SETTING_NAME];

      if (!script) {
        this.generatorFunction = function() {};
      } else {
        this.generatorFunction = new Function(
          'contact',
          'reports',
          'lineage',
          'uhcStats',
          'cht',
          'targetDoc',
          script
        );
      }
    }

    return this.generatorFunction;
  }

  private applyFilter(field) {
    if (field && field.filter) {
      try {
        field.value = this.pipesService.transform(field.filter, field.value);
      } catch (e) {
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
    return this.ngZone.runOutsideAngular(() => this._get(contact, reports, lineage, targetDoc));
  }

  private async _get(contact, reports, lineage, targetDoc?) {
    if (!this.settings) {
      this.settings = await this.settingsService.get();
    }

    if (!this.visitCountSettings) {
      this.visitCountSettings = this.uhcSettingsService.getVisitCountSettings(this.settings);
    }

    const generatorFunction = this.getGeneratorFunction();
    const uhcStats = {
      homeVisits: await this.uhcStatsService.getHomeVisitStats(contact, this.visitCountSettings),
      uhcInterval: this.uhcStatsService.getUHCInterval(this.visitCountSettings)
    };

    const chtScriptApi = await this.chtScriptApiService.getApi();

    try {
      const summary = generatorFunction(contact, reports || [], lineage || [], uhcStats, chtScriptApi, targetDoc);
      return this.applyFilters(summary);
    } catch (error) {
      console.error('Configuration error in contact-summary function: ' + error);
      this.feedbackService.submit('Configuration error in contact-summary function: ' + error.message, false);
      return { errorStack: error.stack };
    }
  }
}
