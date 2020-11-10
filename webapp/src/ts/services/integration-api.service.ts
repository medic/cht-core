import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { LanguageService } from '@mm-services/language.service';
import { Select2SearchService } from '@mm-services/select2-search.service';
import { MRDTService } from '@mm-services/mrdt.service';
import { MarkdownService } from '@mm-services/markdown.service';
import { SettingsService } from '@mm-services/settings.service';
import { AndroidApiService } from '@mm-services/android-api.service';
import { DbService } from '@mm-services/db.service';
import { EnketoService } from '@mm-services/enketo.service';

@Injectable({
  providedIn: 'root'
})
export class IntegrationApiService {
  Language;
  Select2Search;
  Enketo;
  Translate;
  MRDT;
  Markdown;
  Settings;
  AndroidApi;
  DB;

  constructor(
    private dbService:DbService,
    private languageService:LanguageService,
    private select2SearchService:Select2SearchService,
    private enketoService:EnketoService,
    private translateService:TranslateService,
    private mrdtService:MRDTService,
    private markdownService:MarkdownService,
    private settingsService:SettingsService,
    // todo simprints
    private androidApiService:AndroidApiService,
  ) {
    this.DB = dbService;
    this.Language = languageService;
    this.Select2Search = select2SearchService;
    this.Enketo = enketoService;
    this.MRDT = mrdtService;
    this.Markdown = markdownService;
    this.Settings = settingsService;
    this.AndroidApi = androidApiService;
    this.Translate = translateService;
  }

  get(service) {
    return this[service];
  }
}
