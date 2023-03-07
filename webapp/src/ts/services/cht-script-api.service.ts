import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as chtScriptApiFactory from '@medic/cht-script-api';

import { SettingsService } from '@mm-services/settings.service';
import { ChangesService } from '@mm-services/changes.service';
import { SessionService } from '@mm-services/session.service';

import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CHTScriptApiService {
  private userCtx;
  private settings;
  private initialized;
  private extensionLibs = {};

  constructor(
    private http: HttpClient,
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

  private async init() {
    this.watchChanges();
    this.userCtx = this.sessionService.userCtx();
    await this.getSettings();
    await this.loadScripts();
  }

  private async loadScripts() {
    const extensionLibs = this.settings?.extension_libs;
    if (extensionLibs && extensionLibs.length) {
      return Promise.all(extensionLibs.map(name => this.loadScript(name)));
    }
  }

  private async loadScript(name) {
    try {
      const request = this.http.get('/extension-libs/' + name, { responseType: 'text' });
      const result = await lastValueFrom(request);
      this.extensionLibs[name] = new Function(result)();
    } catch(e) {
      console.error(`Error loading extension lib: "${name}"`, e);
    }
  }

  private async getSettings() {
    const settings = await this.settingsService.get();
    this.settings = settings;
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

  async getApi() {
    await this.isInitialized();
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
        getExtensionLib: (id) => {
          return this.extensionLibs[id];
        }
      }
    };
  }
}
