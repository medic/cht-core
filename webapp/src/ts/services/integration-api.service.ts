import { Injectable } from '@angular/core';

import { AndroidAppLauncherService } from '@mm-services/android-app-launcher.service';
import { LanguageService } from '@mm-services/language.service';
import { Select2SearchService } from '@mm-services/select2-search.service';
import { MRDTService } from '@mm-services/mrdt.service';
import { SettingsService } from '@mm-services/settings.service';
import { AndroidApiService } from '@mm-services/android-api.service';
import { DbService } from '@mm-services/db.service';
import { EnketoService } from '@mm-services/enketo.service';
import { TranslateService } from '@mm-services/translate.service';
import { InteractionTrackingService } from '@mm-services/interaction-tracking.service';
import { GeolocationService } from '@mm-services/geolocation.service';

@Injectable({
  providedIn: 'root'
})
export class IntegrationApiService {
  readonly AndroidAppLauncher;
  readonly Language;
  readonly Select2Search;
  readonly Enketo;
  readonly Translate;
  readonly MRDT;
  readonly Settings;
  readonly AndroidApi;
  readonly DB;
  readonly InteractionTracking;
  readonly Geolocation;

  constructor(
    private dbService:DbService,
    private androidAppLauncherService:AndroidAppLauncherService,
    private languageService:LanguageService,
    private select2SearchService:Select2SearchService,
    private enketoService:EnketoService,
    private translateService:TranslateService,
    private mrdtService:MRDTService,
    private settingsService:SettingsService,
    private androidApiService:AndroidApiService,
    private readonly interactionTrackingService:InteractionTrackingService,
    private readonly geolocationService:GeolocationService,
  ) {
    this.DB = dbService;
    this.AndroidAppLauncher = androidAppLauncherService;
    this.Language = languageService;
    this.Select2Search = select2SearchService;
    this.Enketo = enketoService;
    this.MRDT = mrdtService;
    this.Settings = settingsService;
    this.AndroidApi = androidApiService;
    this.Translate = translateService;
    this.InteractionTracking = interactionTrackingService;
    this.Geolocation = this.geolocationService;
  }

  get(service) {
    return this[service];
  }
}
