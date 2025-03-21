import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import { CacheService } from '@mm-services/cache.service';
import { Selectors } from '@mm-selectors/index';
import { ContactChangeFilterService } from '@mm-services/contact-change-filter.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { ContactViewModelGeneratorService } from '@mm-services/contact-view-model-generator.service';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { ContactSummaryService } from '@mm-services/contact-summary.service';

@Injectable({
  providedIn: 'root'
})
export class UserContactSummaryService {
  private readonly cache;
  private contact;
  private forms;

  constructor(
    private cacheService:CacheService,
    private contactChangeFilterService: ContactChangeFilterService,
    private userSettingsService: UserSettingsService,
    private store:Store,
    private contactViewModelGeneratorService: ContactViewModelGeneratorService,
    private targetAggregatesService: TargetAggregatesService,
    private contactSummaryService:ContactSummaryService,
  ) {
    this.store.select(Selectors.getForms).subscribe(forms => this.forms = forms);

    this.cache = this.cacheService.register({
      get: async (callback:Function) => {
        try {
          const summary = await this.loadSummary();
          callback(null, summary);
        } catch (error) {
          callback(error);
        }
      },
      invalidate: (change) => this.contactChangeFilterService.isRelevantChange(change, this.contact)
    });
  }

  get():Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      this.cache((err, userContactSummary:Record<string, any>) => err ? reject(err) : resolve(userContactSummary));
    });
  }

  async getContext() {
    const summary = await this.get();
    return summary?.context;
  }

  private async loadSummary() {
    const userSettings = await this.userSettingsService.get();
    if (!userSettings?.contact_id) {
      return;
    }

    this.contact = await this.contactViewModelGeneratorService.getContact(userSettings.contact_id);
    const reports = await this.contactViewModelGeneratorService.loadReports(this.contact, this.forms);
    const targetDocs = await this.targetAggregatesService.getTargetDocs(
      this.contact, userSettings.facility_id, userSettings.contact_id
    );

    return this.contactSummaryService.get(this.contact.doc, reports, this.contact.lineage, targetDocs);
  }
}
