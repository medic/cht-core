import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { DbSyncRetryService } from '@mm-services/db-sync-retry.service';
import { DbService } from '@mm-services/db.service';

describe('DBSyncRetry service', () => {
  let service:DbSyncRetryService;
  let db;
  let medicLocalDb;
  let metaLocalDb;

  beforeEach(() => {
    medicLocalDb = { get: sinon.stub(), put: sinon.stub().resolves({ ok: true }) };
    metaLocalDb = { get: sinon.stub(), put: sinon.stub().resolves({ ok: true }) };
    db = sinon.stub().callsFake((param) => (param && param.meta) ? metaLocalDb : medicLocalDb);

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: db } },
      ],
    });
    service = TestBed.inject(DbSyncRetryService);
  });

  afterEach(() => sinon.restore());

  describe('retryForbiddenFailure', () => {
    it('should do nothing when no error', () => {
      const result = service.retryForbiddenFailure();
      expect(medicLocalDb.get.callCount).to.equal(0);
      expect(metaLocalDb.get.callCount).to.equal(0);
      expect(!!result).to.equal(false);
    });

    it('should do nothing when error has no id property', () => {
      const result = service.retryForbiddenFailure({ error: 'whatever' });
      expect(medicLocalDb.get.callCount).to.equal(0);
      expect(metaLocalDb.get.callCount).to.equal(0);
      expect(!!result).to.equal(false);
    });

    it('should catch 404s', async () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      medicLocalDb.get.rejects({ status: 404 });
      metaLocalDb.get.rejects({ status: 404 });
      const result = await service.retryForbiddenFailure({ id: 'some_uuid' });
      expect(medicLocalDb.get.callCount).to.equal(1);
      expect(medicLocalDb.get.args[0]).to.deep.equal(['some_uuid', { revs: true }]);
      expect(metaLocalDb.get.callCount).to.equal(1);
      expect(metaLocalDb.get.args[0]).to.deep.equal(['_local/some_uuid']);
      expect(medicLocalDb.put.callCount).to.equal(0);
      expect(metaLocalDb.put.callCount).to.equal(0);
      expect(!!result).to.equal(false);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error when retrying replication for forbidden doc');
    });

    it('should account for no _revisions property', () => {
      const doc = {
        _id: 'random',
        _rev: '3-rev',
      };
      medicLocalDb.get.resolves(doc);
      metaLocalDb.get.rejects({ status: 404 });

      return service.retryForbiddenFailure({ id: 'random' })!.then(result => {
        expect(medicLocalDb.get.callCount).to.equal(1);
        expect(medicLocalDb.get.args[0]).to.deep.equal(['random', { revs: true }]);
        expect(metaLocalDb.get.callCount).to.equal(1);
        expect(metaLocalDb.get.args[0]).to.deep.equal(['_local/random']);

        expect(medicLocalDb.put.callCount).to.equal(1);
        expect(medicLocalDb.put.args[0]).to.deep.equal([{
          _id: 'random',
          _rev: '3-rev',
        }]);
        expect(metaLocalDb.put.callCount).to.equal(1);
        expect(metaLocalDb.put.args[0]).to.deep.equal([{
          _id: '_local/random',
          replication_retry: {
            rev: '3-rev',
            count: 1
          },
        }]);
        expect(!!result).to.equal(true);
      });
    });

    it('should account for weird compactions', () => {
      const doc = {
        _id: 'demo_report',
        _rev: '3-rev',
        _revisions: {
          start: 3,
          ids: ['rev']
        },
      };
      medicLocalDb.get.resolves(doc);
      metaLocalDb.get.rejects({ status: 404 });

      return service.retryForbiddenFailure({ id: 'demo_report' })!.then(result => {
        expect(medicLocalDb.get.callCount).to.equal(1);
        expect(medicLocalDb.get.args[0]).to.deep.equal(['demo_report', { revs: true }]);
        expect(metaLocalDb.get.callCount).to.equal(1);
        expect(metaLocalDb.get.args[0]).to.deep.equal(['_local/demo_report']);

        expect(medicLocalDb.put.callCount).to.equal(1);
        expect(medicLocalDb.put.args[0]).to.deep.equal([{
          _id: 'demo_report',
          _rev: '3-rev',
        }]);

        expect(metaLocalDb.put.callCount).to.equal(1);
        expect(metaLocalDb.put.args[0]).to.deep.equal([{
          _id: '_local/demo_report',
          replication_retry: {
            rev: '3-rev',
            count: 1
          },
        }]);
        expect(!!result).to.equal(true);
      });
    });

    it('should account for weird compactions with previous retries', () => {
      const doc = {
        _id: 'uuid',
        _rev: '3-rev',
        _revisions: {
          start: 3,
          ids: ['rev']
        },
      };
      const localDoc = {
        _id: '_local/uuid',
        _rev: '1-rev',
        replication_retry: {
          count: 2,
          rev: '2-whatever',
        },
      };
      medicLocalDb.get.resolves(doc);
      metaLocalDb.get.resolves(localDoc);

      return service.retryForbiddenFailure({ id: 'uuid' })!.then(result => {
        expect(medicLocalDb.get.callCount).to.equal(1);
        expect(metaLocalDb.get.callCount).to.equal(1);

        expect(medicLocalDb.put.callCount).to.equal(1);
        expect(medicLocalDb.put.args[0]).to.deep.equal([{
          _id: 'uuid',
          _rev: '3-rev',
        }]);
        expect(metaLocalDb.put.callCount).to.equal(1);
        expect(metaLocalDb.put.args[0]).to.deep.equal([{
          _id: '_local/uuid',
          _rev: '1-rev',
          replication_retry: {
            rev: '3-rev',
            count: 1
          },
        }]);
        expect(!!result).to.equal(true);
      });
    });

    it('should increase replication retry count on consecutive replications', () => {
      const doc = {
        _id: 'uuid',
        _rev: '3-rev',
        _revisions: {
          start: 3,
          ids: ['rev', 'whatever']
        },
      };
      const localDoc = {
        _id: '_local/uuid',
        _rev: '23-rev',
        replication_retry: {
          count: 2,
          rev: '2-whatever',
        },
      };

      medicLocalDb.get.resolves(doc);
      metaLocalDb.get.resolves(localDoc);

      return service.retryForbiddenFailure({ id: 'uuid' })!.then(result => {
        expect(medicLocalDb.get.callCount).to.equal(1);
        expect(metaLocalDb.get.callCount).to.equal(1);
        expect(medicLocalDb.put.callCount).to.equal(1);
        expect(medicLocalDb.put.args[0]).to.deep.equal([{
          _id: 'uuid',
          _rev: '3-rev',
        }]);
        expect(metaLocalDb.put.callCount).to.equal(1);
        expect(metaLocalDb.put.args[0]).to.deep.equal([{
          _id: '_local/uuid',
          _rev: '23-rev',
          replication_retry: {
            rev: '3-rev',
            count: 3
          },
        }]);
        expect(!!result).to.equal(true);
      });
    });

    it('should reset replication retry count on non-consecutive replications', () => {
      const doc = {
        _id: 'uuid',
        _rev: '4-rev',
        _revisions: {
          start: 4,
          ids: ['rev', 'other', 'whatever']
        },
      };
      const localDoc = {
        _id: '_local/uuid',
        _rev: '33-rev',
        replication_retry: {
          count: 2,
          rev: '2-whatever',
        },
      };

      medicLocalDb.get.resolves(doc);
      metaLocalDb.get.resolves(localDoc);

      return service.retryForbiddenFailure({ id: 'uuid' })!.then(result => {
        expect(medicLocalDb.get.callCount).to.equal(1);
        expect(metaLocalDb.get.callCount).to.equal(1);

        expect(medicLocalDb.put.callCount).to.equal(1);
        expect(medicLocalDb.put.args[0]).to.deep.equal([{
          _id: 'uuid',
          _rev: '4-rev',
        }]);
        expect(metaLocalDb.put.callCount).to.equal(1);
        expect(metaLocalDb.put.args[0]).to.deep.equal([{
          _id: '_local/uuid',
          _rev: '33-rev',
          replication_retry: {
            rev: '4-rev',
            count: 1
          },
        }]);
        expect(!!result).to.equal(true);
      });
    });

    it('should not save local doc when medic doc save conflicts', () => {
      const doc = {
        _id: 'uuid',
        _rev: '4-rev',
        _revisions: {
          start: 4,
          ids: ['rev', 'other', 'whatever']
        },
      };
      const localDoc = {
        _id: '_local/uuid',
        _rev: '33-rev',
        replication_retry: {
          count: 2,
          rev: '2-whatever',
        },
      };

      medicLocalDb.get.resolves(doc);
      metaLocalDb.get.resolves(localDoc);
      medicLocalDb.put.rejects({ status: 409 });

      return service.retryForbiddenFailure({ id: 'uuid' })!.then(result => {
        expect(medicLocalDb.get.callCount).to.equal(1);
        expect(metaLocalDb.get.callCount).to.equal(1);

        expect(medicLocalDb.put.callCount).to.equal(1);
        expect(medicLocalDb.put.args[0]).to.deep.equal([{
          _id: 'uuid',
          _rev: '4-rev',
        }]);
        expect(metaLocalDb.put.callCount).to.equal(0);
        expect(!!result).to.equal(false);
      });
    });

    it('should not touch doc when retry count is exceeded', () => {
      const doc = {
        _id: 'uuid',
        _rev: '4-rev',
        _revisions: {
          start: 4,
          ids: ['rev', 'whatever', 'whatever']
        },
      };
      const localDoc = {
        _id: '_local/uuid',
        _rev: '33-rev',
        replication_retry: {
          count: 3,
          rev: '3-whatever',
        },
      };

      medicLocalDb.get.resolves(doc);
      metaLocalDb.get.resolves(localDoc);

      return service.retryForbiddenFailure({ id: 'uuid' })!.then(result => {
        expect(medicLocalDb.get.callCount).to.equal(1);
        expect(metaLocalDb.get.callCount).to.equal(1);

        expect(medicLocalDb.put.callCount).to.equal(0);
        expect(metaLocalDb.put.callCount).to.equal(0);
        expect(!!result).to.equal(false);
      });
    });

    it('should catch db put errors', async () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      const doc = {
        _id: 'the_id',
        _rev: '4-rev',
        _revisions: {
          start: 4,
          ids: ['rev', 'other', 'whatever']
        },
      };
      const localDoc = {
        _id: '_local/the_id',
        _rev: '45-some_rev',
        replication_retry: {
          count: 2,
          rev: '2-whatever',
        },
      };

      medicLocalDb.get.resolves(doc);
      metaLocalDb.get.resolves(localDoc);
      medicLocalDb.put.rejects({ err: 'boom' });

      const result = await service.retryForbiddenFailure({ id: 'the_id' });
      expect(medicLocalDb.get.callCount).to.equal(1);
      expect(medicLocalDb.get.args[0]).to.deep.equal(['the_id', { revs: true }]);
      expect(metaLocalDb.get.callCount).to.equal(1);
      expect(metaLocalDb.get.args[0]).to.deep.equal(['_local/the_id']);
      expect(medicLocalDb.put.callCount).to.equal(1);
      expect(medicLocalDb.put.args[0]).to.deep.equal([{
        _id: 'the_id',
        _rev: '4-rev',
      }]);
      expect(metaLocalDb.put.callCount).to.equal(0);
      expect(!!result).to.equal(false);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error when retrying replication for forbidden doc');
    });
  });
});
