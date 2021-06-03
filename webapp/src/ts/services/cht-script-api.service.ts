import { Injectable } from '@angular/core';

import { UserContactService } from './user-contact.service';
import { UserSettingsService } from './user-settings.service';

@Injectable({
  providedIn: 'root'
})
export class CHTScriptApiService {
  private userContactDoc;
  private userSettingsDoc;

  constructor(
    private userContactService: UserContactService,
    private userSettingsService: UserSettingsService
  ) { }

  init() {
    return this.getUserDocs();
  }

  updateApiDataSet() {
    return this.getUserDocs();
  }

  private getUserDocs() {
    return Promise
      .all([
        this.userContactService.get(),
        this.userSettingsService.get()
      ])
      .then(([userContactDoc, userSettingsDoc]) => {
        this.userContactDoc = userContactDoc;
        this.userSettingsDoc = userSettingsDoc;
      });
  }

  private getUserContactDoc() {
    return this.userContactDoc;
  }

  private getUserSettingsDoc() {
    return this.userSettingsDoc;
  }

  getV1Api() {
    return {
      v1: {
        getUserContactDoc: () => this.getUserContactDoc(),
        getUserSettingsDoc: () => this.getUserSettingsDoc()
      }
    };
  }
}
