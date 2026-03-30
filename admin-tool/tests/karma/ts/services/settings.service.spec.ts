import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { DbService } from '@admin-tool-services/db.service';
import { ChangesService } from '@admin-tool-services/changes.service';
import { SettingsService } from '@admin-tool-services/settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let dbService;
  let changesService;
  let changesCallback: Function;

  beforeEach(() => {
    changesCallback = () => {};

    changesService = {
      subscribe: sinon.stub().callsFake((options) => {
        changesCallback = options.filter
          ? (change) => { if (options.filter(change)) options.callback(change); }
          : options.callback;
        return { unsubscribe: sinon.stub() };
      }),
    };

    dbService = {
      get: sinon.stub().returns({
        get: sinon.stub().resolves({ _id: 'medic-client', settings: { locale: 'en' } }),
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: ChangesService, useValue: changesService },
      ]
    });

    service = TestBed.inject(SettingsService);
  });

  afterEach(() => sinon.restore());

  it('should fetch and return the settings doc', async () => {
    const settings = await service.get();

    expect(settings).to.deep.equal({ locale: 'en' });
    expect(dbService.get().get.callCount).to.equal(1);
  });

  it('should return cached settings on subsequent calls', async () => {
    await service.get();
    await service.get();

    expect(dbService.get().get.callCount).to.equal(1);
  });

  it('should subscribe to changes on construction', () => {
    expect(changesService.subscribe.callCount).to.equal(1);
    expect(changesService.subscribe.args[0][0].key).to.equal('settings');
  });

  it('should invalidate cache when settings doc changes', async () => {
    await service.get();
    expect(dbService.get().get.callCount).to.equal(1);

    changesCallback({ id: 'settings', seq: 5 });

    await service.get();
    expect(dbService.get().get.callCount).to.equal(2);
  });

  it('should not invalidate cache when an unrelated doc changes', async () => {
    await service.get();
    expect(dbService.get().get.callCount).to.equal(1);

    changesCallback({ id: 'not-settings', seq: 6 });

    await service.get();
    expect(dbService.get().get.callCount).to.equal(1);
  });

  it('should clear the cache and reject on fetch error', async () => {
    const error = new Error('not found');
    dbService.get().get.rejects(error);

    try {
      await service.get();
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).to.equal(error);
    }

    // cache cleared — next call should try again
    dbService.get().get.resolves({ _id: 'medic-client', settings: { locale: 'fr' } });
    const settings = await service.get();
    expect(settings).to.deep.equal({ locale: 'fr' });
  });
});
