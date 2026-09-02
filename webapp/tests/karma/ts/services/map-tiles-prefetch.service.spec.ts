import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { MapTilesPrefetchService, LAST_PREFETCH_DATE_KEY } from '@mm-services/map-tiles-prefetch.service';
import { DBSyncService, SyncStatus } from '@mm-services/db-sync.service';
import { DbService } from '@mm-services/db.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { TelemetryService } from '@mm-services/telemetry.service';

describe('MapTilesPrefetchService', () => {
  let service;
  let syncListener;
  let dbSyncService;
  let userSettingsService;
  let allDocs;
  let telemetryService;
  let fetchStub;
  let isControlled;

  const NAIROBI = { latitude: -1.2921, longitude: 36.8219, accuracy: 10 };

  const sync = async (update: any = { to: SyncStatus.Success, from: SyncStatus.Success }) => {
    syncListener(update);
    // the prefetch runs detached from the sync listener
    await new Promise(resolve => setTimeout(resolve, 20));
  };

  beforeEach(() => {
    window.localStorage.removeItem(LAST_PREFETCH_DATE_KEY);
    dbSyncService = { subscribe: sinon.stub().callsFake(listener => syncListener = listener) };
    userSettingsService = { get: sinon.stub().resolves({ facility_id: ['facility1'] }) };
    allDocs = sinon.stub().resolves({ rows: [{ doc: { _id: 'facility1', geolocation: NAIROBI } }] });
    telemetryService = { record: sinon.stub().resolves() };
    fetchStub = sinon.stub(window, 'fetch').callsFake(() => Promise.resolve(new Response(new Blob(['tile']))));

    TestBed.configureTestingModule({
      providers: [
        { provide: DBSyncService, useValue: dbSyncService },
        { provide: DbService, useValue: { get: () => ({ allDocs }) } },
        { provide: UserSettingsService, useValue: userSettingsService },
        { provide: TelemetryService, useValue: telemetryService },
      ],
    });
    service = TestBed.inject(MapTilesPrefetchService);
    isControlled = sinon.stub(service, 'isControlled').returns(true);
    service.init();
  });

  afterEach(async () => {
    window.localStorage.removeItem(LAST_PREFETCH_DATE_KEY);
    await window.caches.delete('cht-map-tiles');
    sinon.restore();
  });

  it('should subscribe to sync updates once', () => {
    service.init();
    expect(dbSyncService.subscribe.callCount).to.equal(1);
  });

  it('should not run for unsuccessful or partial syncs', async () => {
    await sync({ state: SyncStatus.InProgress });
    await sync({ to: SyncStatus.Success, from: SyncStatus.Required });
    expect(fetchStub.callCount).to.equal(0);
  });

  it('should download the tiles around the facility after a successful sync', async () => {
    await sync();

    const urls = fetchStub.args.map(([url]) => url);
    expect(urls.length).to.be.within(30, 120); // zooms 0-14 for a 5km radius
    expect(new Set(urls).size).to.equal(urls.length); // no duplicates
    urls.forEach(url => {
      expect(url).to.match(/^https:\/\/vector\.openstreetmap\.org\/shortbread_v1\/\d+\/\d+\/\d+\.mvt$/);
    });
    // the world at low zoom and the facility's own tile at max data zoom
    expect(urls).to.include('https://vector.openstreetmap.org/shortbread_v1/0/0/0.mvt');
    expect(urls).to.include('https://vector.openstreetmap.org/shortbread_v1/14/9867/8250.mvt');

    expect(window.localStorage.getItem(LAST_PREFETCH_DATE_KEY)).to.be.ok;
    expect(telemetryService.record.args).to.deep.equal([['map:tiles-prefetch', urls.length]]);
  });

  it('should run at most once a day', async () => {
    await sync();
    const downloads = fetchStub.callCount;
    expect(downloads).to.be.greaterThan(0);

    await sync();
    expect(fetchStub.callCount).to.equal(downloads);

    window.localStorage.setItem(LAST_PREFETCH_DATE_KEY, `${Date.now() - 25 * 60 * 60 * 1000}`);
    await sync();
    expect(fetchStub.callCount).to.be.greaterThan(downloads);
  });

  it('should skip tiles that are already cached', async () => {
    const cache = await window.caches.open('cht-map-tiles');
    await cache.put('https://vector.openstreetmap.org/shortbread_v1/0/0/0.mvt', new Response(new Blob(['cached'])));

    await sync();

    const urls = fetchStub.args.map(([url]) => url);
    expect(urls).to.not.include('https://vector.openstreetmap.org/shortbread_v1/0/0/0.mvt');
    expect(urls).to.include('https://vector.openstreetmap.org/shortbread_v1/1/1/1.mvt');
  });

  it('should do nothing without a facility with a valid geolocation', async () => {
    allDocs.resolves({ rows: [
      { doc: { _id: 'facility1' } },
      { doc: { _id: 'facility2', geolocation: { latitude: 'not', longitude: 'valid' } } },
    ] });
    await sync();
    expect(fetchStub.callCount).to.equal(0);
    expect(window.localStorage.getItem(LAST_PREFETCH_DATE_KEY)).to.equal(null);
  });

  it('should do nothing when the user has no facility', async () => {
    userSettingsService.get.resolves({});
    await sync();
    expect(allDocs.callCount).to.equal(0);
    expect(fetchStub.callCount).to.equal(0);
  });

  it('should do nothing when the page is not controlled by the service worker', async () => {
    isControlled.returns(false);
    await sync();
    expect(fetchStub.callCount).to.equal(0);
  });

  it('should stop and not mark the run after repeated download failures', async () => {
    fetchStub.rejects(new Error('offline'));
    await sync();

    expect(fetchStub.callCount).to.be.lessThan(20); // aborted early instead of draining the whole list
    expect(window.localStorage.getItem(LAST_PREFETCH_DATE_KEY)).to.equal(null);
    expect(telemetryService.record.callCount).to.equal(0);
  });
});
