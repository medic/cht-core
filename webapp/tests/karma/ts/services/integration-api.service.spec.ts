import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { IntegrationApiService } from '@mm-services/integration-api.service';
import { GeolocationService } from '@mm-services/geolocation.service';
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
import { MapTilesPrefetchService } from '@mm-services/map-tiles-prefetch.service';

describe('IntegrationApiService', () => {
  let service;
  let geolocationService;
  let mapTilesPrefetchService;

  beforeEach(() => {
    geolocationService = { init: sinon.stub() };
    mapTilesPrefetchService = { getCacheSize: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        { provide: GeolocationService, useValue: geolocationService },
        { provide: AndroidAppLauncherService, useValue: {} },
        { provide: LanguageService, useValue: {} },
        { provide: Select2SearchService, useValue: {} },
        { provide: MRDTService, useValue: {} },
        { provide: SettingsService, useValue: {} },
        { provide: AndroidApiService, useValue: {} },
        { provide: DbService, useValue: {} },
        { provide: EnketoService, useValue: {} },
        { provide: TranslateService, useValue: {} },
        { provide: InteractionTrackingService, useValue: {} },
        { provide: MapTilesPrefetchService, useValue: mapTilesPrefetchService },
      ]
    });
    service = TestBed.inject(IntegrationApiService);
  });

  afterEach(() => sinon.restore());

  it('should expose GeolocationService as Geolocation', () => {
    expect(service.Geolocation).to.equal(geolocationService);
  });

  it('should expose MapTilesPrefetchService as MapTiles', () => {
    expect(service.MapTiles).to.equal(mapTilesPrefetchService);
  });
});
