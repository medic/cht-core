import { RolesMap, PermissionsMap } from '@admin-tool-modules/authorization/authorization-interfaces';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DOC_IDS } from '@medic/constants';
import { DbService } from '@admin-tool-services/db.service';
import { ChangesService } from '@admin-tool-services/changes.service';

/**
 * Interface representing the date and datetime display format settings.
 */
export interface DateTimeSettings {
  dateFormat: string;
  dateTimeFormat: string;
}

/**
 * Interface representing the application and outgoing message language settings.
 */
export interface LanguageSettings {
  locale: string;
  localeOutgoing: string;
}

/**
 * Represents the known properties of the CHT instance settings object.
 * Only includes fields used by the admin tool — the full settings schema
 * is open-ended and may contain additional properties.
 *
 * Used as Partial<CHTSettings> since not all fields are guaranteed
 * to be present in every response.
 *
 * As new features are added to the admin tool, any settings properties
 * they depend on should be added here.
 */
export interface CHTSettings {
  date_format?: string;
  reported_date_format?: string;
  roles?: RolesMap;
  permissions?: PermissionsMap;
  languages?: { locale: string; enabled: boolean }[];
  locale?: string;
  locale_outgoing?: string;
  token_login?: { enabled: boolean };
  oidc_provider?: string;
}
/**
 * Service responsible for reading and writing CHT instance settings
 * via the /api/v1/settings endpoint.
 *
 * All HTTP calls include withCredentials: true so the session cookie
 * is forwarded automatically.
 */
@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly SETTINGS_ID = DOC_IDS.SETTINGS;
  private cachedSettings: Promise<Partial<CHTSettings>> | null = null;

  constructor(
    private http: HttpClient,
    private db: DbService,
    private changesService: ChangesService,
  ) {
    this.changesService.subscribe({
      key: 'settings',
      filter: (change) => change.id === this.SETTINGS_ID,
      callback: () => {
        this.cachedSettings = null;
      },
    });
  }

  get(): Promise<Partial<CHTSettings>> {
    if (!this.cachedSettings) {
      this.cachedSettings = this.db
        .get()
        .get(this.SETTINGS_ID)
        .then((doc: any) => doc.settings)
        .catch((err) => {
          this.cachedSettings = null;
          return Promise.reject(err);
        });
    }
    return this.cachedSettings!;
  }

  /**
   * Sends a partial or full settings update to the API.
   * By default performs a partial update (replace=false), meaning only
   * the provided keys are overwritten and the rest of the settings are preserved.
   * Set replace=true to replace the entire settings object.
   *
   * @param {Record<string, any>} updates - key/value pairs to update in settings
   * @param {boolean} replace - if true, replaces all settings instead of merging. Defaults to false.
   * @returns {Promise<void>}
   */
  async updateSettings(
    updates: Record<string, any>,
    replace = false,
  ): Promise<void> {
    return firstValueFrom(
      this.http.put<void>('/api/v1/settings', updates, {
        params: { replace: String(replace) },
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }

  /**
   * Retrieves the date and datetime display formats from settings,
   * mapping the API's snake_case fields (date_format, reported_date_format)
   * to the DateTimeSettings model.
   *
   * @returns {Promise<DateTimeSettings>}
   */
  async getDateTimeSettings(): Promise<DateTimeSettings> {
    const res = await this.get();
    return {
      dateFormat: res.date_format ?? '',
      dateTimeFormat: res.reported_date_format ?? '',
    };
  }

  /**
   * Persists the date and datetime display formats to the API,
   * mapping camelCase model fields back to the API's snake_case keys.
   *
   * @param {DateTimeSettings} changes - the new date and datetime formats to save
   * @returns {Promise<void>}
   */
  async updateDateTimeSettings(changes: DateTimeSettings): Promise<void> {
    return this.updateSettings({
      date_format: changes.dateFormat,
      reported_date_format: changes.dateTimeFormat,
    });
  }

  /**
   * Retrieves the full roles map from settings.
   * Returns an empty object if no roles are defined.
   *
   * @returns {Promise<RolesMap>}
   */
  async getRoles(): Promise<RolesMap> {
    const res = await this.get();
    return res.roles || {};
  }

  /**
   * Persists the full roles map to the API.
   * Uses replace=true to fully overwrite the roles object in settings.
   *
   * @param {RolesMap} roles - the complete roles map to save
   * @returns {Promise<void>}
   */
  async updateRoles(roles: RolesMap): Promise<void> {
    return this.updateSettings({ roles }, true);
  }

  /**
   * Retrieves the full permissions map from settings.
   * Returns an empty object if no permissions are defined.
   *
   * @returns {Promise<PermissionsMap>}
   */
  async getPermissions(): Promise<PermissionsMap> {
    const res = await this.get();
    return res.permissions || {};
  }

  /**
   * Persists the full permissions map to the API.
   * Uses replace=true to fully overwrite the permissions object in settings.
   *
   * @param {PermissionsMap} permissions - the complete permissions map to save
   * @returns {Promise<void>}
   */
  async updatePermissions(permissions: PermissionsMap): Promise<void> {
    return this.updateSettings({ permissions }, true);
  }

  /**
   * Retrieves the application language and outgoing message language from settings,
   * mapping the API's snake_case fields (locale, locale_outgoing)
   * to the LanguageSettings model.
   *
   * @returns {Promise<LanguageSettings>}
   */
  async getLanguageSettings(): Promise<LanguageSettings> {
    const res = await this.get();
    return {
      locale: res.locale ?? '',
      localeOutgoing: res.locale_outgoing ?? '',
    };
  }
  
  /**
   * Persists the application language and outgoing message language to the API,
   * mapping camelCase model fields back to the API's snake_case keys.
   * Uses replace=false to merge without overwriting other settings.
   *
   * @param {LanguageSettings} changes - the new locale and locale_outgoing to save
   * @returns {Promise<void>}
   */
  async updateLanguageSettings(changes: LanguageSettings): Promise<void> {
    return this.updateSettings({
      locale: changes.locale,
      locale_outgoing: changes.localeOutgoing,
    });
  }
}
