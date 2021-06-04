import { Injectable } from '@angular/core';

import { UserSettingsService } from './user-settings.service';

@Injectable({
  providedIn: 'root'
})
export class CHTScriptApiService {
  private userSettingsDoc;

  constructor(
    private userSettingsService: UserSettingsService
  ) { }

  init() {
    return this.getUserDocs();
  }

  private getUserDocs() {
    return this.userSettingsService
      .get()
      .then(userSettingsDoc => {
        this.userSettingsDoc = userSettingsDoc;
      });
  }

  private hasRole(role) {
    if (!this.userSettingsDoc?.roles?.length) {
      return false;
    }

    return this.userSettingsDoc.roles.includes(role);
  }

  getV1Api() {
    return {
      v1: {
        hasRole: (role) => this.hasRole(role)
      }
    };
  }
}
