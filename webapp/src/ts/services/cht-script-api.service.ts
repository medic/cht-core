import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import * as chtScriptApiFactory from '@medic/cht-script-api';

import { UserSettingsService } from '@mm-services/user-settings.service';
import { SettingsService } from '@mm-services/settings.service';
import { ChangesService } from '@mm-services/changes.service';

@Injectable({
  providedIn: 'root'
})
export class CHTScriptApiService implements OnDestroy {
  subscriptions: Subscription = new Subscription();

  constructor(
    private userSettingsService: UserSettingsService,
    private settingsService: SettingsService,
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
        chtScriptApiFactory.setUserSettingsDoc(userSettingsDoc);
      });
  }

  private getSettings() {
    return this.settingsService
      .get()
      .then(settings => {
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

  getApi() {
    return chtScriptApiFactory.getApi();
  }
}
