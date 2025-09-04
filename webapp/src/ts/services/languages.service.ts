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

    const enabledLanguages = (settings.languages || [])
      .filter(language => language.enabled !== false)
      .map(language => language.locale);

    const result = await this.dbService
      .get()
      .query('medic-client/doc_by_type', { key: ['translations'], include_docs: true });

    return result.rows
      .filter(row => enabledLanguages.includes(row.doc.code) || !enabledLanguages.length)
      .map(row => ({
        code: row.doc.code,
        name: row.doc.name,
      }));
  }
}
