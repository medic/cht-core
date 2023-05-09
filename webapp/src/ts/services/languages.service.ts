import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { SettingsService } from '@mm-services/settings.service';

@Injectable({
  providedIn: 'root'
})
export class LanguagesService {
  constructor(
    private dbService: DbService,
    private settingsService: SettingsService,
  ){}

  async get(): Promise<Object> {
    const settings = await this.settingsService.get();
    if (
      settings.languages &&
      Array.isArray(settings.languages) &&
      settings.languages.length > 0
    ) {
      const result = await this.dbService.get().query('medic-client/doc_by_type', {
        startkey: ['translations', false],
        endkey: ['translations', true],
      });
      return result.rows
        .filter(row => settings.languages.some(
          language => language.enabled !== false && language.locale === row.value.code,
        ))
        .map(row => row.value);
    }

    const result = await this.dbService.get().query('medic-client/doc_by_type', { key: ['translations', true] });
    return result.rows.map(row => row.value);
  }
}
