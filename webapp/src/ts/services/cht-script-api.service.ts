import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import * as chtScriptApiFactory from '@medic/cht-script-api';

import { SettingsService } from '@mm-services/settings.service';
import { ChangesService } from '@mm-services/changes.service';
import { SessionService } from '@mm-services/session.service';

@Injectable({
  providedIn: 'root'
})
export class CHTScriptApiService implements OnDestroy {
  subscriptions: Subscription = new Subscription();

  constructor(
    private sessionService: SessionService,
    private settingsService: SettingsService,
    private changesService: ChangesService
  ) { }

  init() {
    this.watchChanges();
    this.getUserCtx();
    return this.getSettings();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private getUserCtx() {
    chtScriptApiFactory.setUserSettingsDoc(this.sessionService.userCtx());
  }

  private getSettings() {
    return this.settingsService
      .get()
      .then(settings => {
        chtScriptApiFactory.setChtCoreSettingsDoc(settings);
      });
  }

  private watchChanges() {
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
