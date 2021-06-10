import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import * as chtScriptApiFactory from '@medic/cht-script-api';

import { UserSettingsService } from '@mm-services/user-settings.service';
import { SettingsService } from '@mm-services/settings.service';
import { ChangesService } from '@mm-services/changes.service';
import { SessionService } from '@mm-services/session.service';

@Injectable({
  providedIn: 'root'
})
export class CHTScriptApiService implements OnDestroy {
  private userSettingsDoc;
  private settings;
  subscriptions: Subscription = new Subscription();

  constructor(
    private userSettingsService: UserSettingsService,
    private settingsService: SettingsService,
    private sessionService : SessionService,
    private changesService: ChangesService
  ) { }

  init() {
    this.watchChanges();

    return this
      .getSettings()
      .then(() => this.getUserSettingsDoc());
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private getUserSettingsDoc() {
    return this.userSettingsService
      .get()
      .then(userSettingsDoc => {
        this.userSettingsDoc = userSettingsDoc;
        chtScriptApiFactory.setUserSettingsDoc(userSettingsDoc);
      });
  }

  private getSettings() {
    return this.settingsService
      .get()
      .then(settings => {
        this.settings = settings;
        chtScriptApiFactory.setChtCoreSettingsDoc(settings);
      });
  }

  private watchChanges() {
    const userDocId = this.userSettingsService.getUserDocId();

    const userSettingsSubscription = this.changesService.subscribe({
      key: 'cht-script-api-user-settings-changes',
      filter: change => change.id === userDocId,
      callback: () => this.getUserSettingsDoc()
    });
    this.subscriptions.add(userSettingsSubscription);

    const settingsSubscription = this.changesService.subscribe({
      key: 'cht-script-api-settings-changes',
      filter: change => change.id === 'settings',
      callback: () => this.getSettings()
    });
    this.subscriptions.add(settingsSubscription);
  }

  private hasRole(role: string): boolean {
    if (!this.userSettingsDoc?.roles?.length) {
      return false;
    }

    return this.userSettingsDoc.roles.includes(role);
  }

  private hasPermission(permission: string): boolean {
    if (!this.userSettingsDoc?.roles?.length) {
      return false;
    }

    if (this.sessionService.isAdmin()) {
      // Admin has the permissions automatically.
      return true;
    }

    const roles = this.settings.permissions[permission];

    if (!roles) {
      return false;
    }

    return this.userSettingsDoc.roles.some(role => roles.includes(role));
  }

  getV1Api(): ChtApi {
    /*return {
      v1: {
        hasRole: (role) => this.hasRole(role),
        hasPermission: (permission) => this.hasPermission(permission)
      }
    };*/
    return chtScriptApiFactory.getApi();
  }
}

interface ChtV1Api {
  hasRole(string): boolean;
  hasPermission(string): boolean;
}

interface ChtApi {
  v1: ChtV1Api;
}
