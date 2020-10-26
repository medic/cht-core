import { Injectable } from '@angular/core';

import { SettingsService } from '@mm-services/settings.service';
import { PipesService } from '@mm-services/pipes.service';

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

  constructor(
    private settingsService:SettingsService,
    private pipesService:PipesService,
  ) {
  }

  private getGeneratorFunction() {
    if (!this.generatorFunction) {
      this.generatorFunction = this.settingsService
        .get()
        .then((settings) => {
          return settings[this.SETTING_NAME];
        })
        .then((script) => {
          if (!script) {
            return function() {};
          }
          return new Function('contact', 'reports', 'lineage', 'targetDoc', script);
        });
    }
    return this.generatorFunction;
  }

  private applyFilter(field) {
    if (field && field.filter) {
      try {
        field.value = this.pipesService.transform(field.filter, field.value);
      } catch(e) {
        console.log(e);
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
    return this
      .getGeneratorFunction()
      .then((fn) => {
        try {
          return fn(contact, reports || [], lineage || [], targetDoc);
        } catch (e) {
          console.error('Configuration error in contact-summary function: ' + e.message);
          throw new Error('Configuration error');
        }
      })
      .then(summary => this.applyFilters(summary));
  };
}
