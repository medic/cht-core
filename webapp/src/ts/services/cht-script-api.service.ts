import { Injectable } from '@angular/core';
import * as chtScriptApiFactory from '@medic/cht-script-api';

import { SettingsService } from '@mm-services/settings.service';
import { ChangesService } from '@mm-services/changes.service';
import { SessionService } from '@mm-services/session.service';

@Injectable({
  providedIn: 'root'
})
export class CHTScriptApiService {
  private userCtx;
  private settings;
  private initialized;

  constructor(
    private sessionService: SessionService,
    private settingsService: SettingsService,
    private changesService: ChangesService
  ) { }

  isInitialized() {
    if (!this.initialized) {
      this.initialized = this.init();
    }

    return this.initialized;
  }

  private init() {
    this.watchChanges();
    this.userCtx = this.sessionService.userCtx();
    return this.getSettings();
  }

  private getSettings() {
    return this.settingsService
      .get()
      .then(settings => this.settings = settings);
  }

  private watchChanges() {
    this.changesService.subscribe({
      key: 'cht-script-api-settings-changes',
      filter: change => change.id === 'settings',
      callback: () => this.getSettings()
    });
  }

  private getChtPermissionsFromSettings(chtSettings) {
    return chtSettings?.permissions || this.settings?.permissions;
  }

  private getRolesFromUser(user) {
    return user?.roles || this.userCtx?.roles;
  }

  getApi() {
    return this
      .isInitialized()
      .then(() => {
        return {
          v1: {
            hasPermissions: (permissions, user?, chtSettings?) => {
              const userRoles = this.getRolesFromUser(user);
              const chtPermissionsSettings = this.getChtPermissionsFromSettings(chtSettings);
              return chtScriptApiFactory.v1.hasPermissions(permissions, userRoles, chtPermissionsSettings);
            },
            hasAnyPermission: (permissionsGroupList, user?, chtSettings?) => {
              const userRoles = this.getRolesFromUser(user);
              const chtPermissionsSettings = this.getChtPermissionsFromSettings(chtSettings);
              return chtScriptApiFactory.v1.hasAnyPermission(permissionsGroupList, userRoles, chtPermissionsSettings);
            },
            getLibrary: (id) => {
              return (window as any).__api[id];
            }
          }
        };
      });
  }
}
