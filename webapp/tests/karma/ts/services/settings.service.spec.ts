import { fakeAsync, TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { SettingsService } from '@mm-services/settings.service';
import { CacheService } from '@mm-services/cache.service';
import { DbService } from '@mm-services/db.service';

describe('Settings service', () => {
  let service:SettingsService;
  let get;

  beforeEach(() => {
    get = sinon.stub();

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: () => ({ get }) } },
        { provide: CacheService, useValue: { register: (options) => options.get } },
      ],
    });
    service = TestBed.inject(SettingsService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('triggers change events when cache updates', fakeAsync(() => {
    const expected = {
      isTrue: true,
      isString: 'hello'
    };
    get.resolves({ settings: expected });
    service
      .get()
      .then((actual:any) => {
        expect(actual.isTrue).to.equal(expected.isTrue);
        expect(actual.isString).to.equal(expected.isString);
      });
  }));

  it('returns errors', fakeAsync(() => {
    get.rejects('Not found');
    service
      .get()
      .then(() => {
        assert.fail('Unexpected resolution of promise.');
      })
      .catch((err) => {
        expect(err.name).to.equal('Not found');
      });
  }));
});
