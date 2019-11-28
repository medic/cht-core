describe('DBSyncRetry service', () => {
  'use strict';

  chai.config.truncateThreshold = 0;

  let service;
  let db;
  let medicLocalDb;
  let metaLocalDb;

  beforeEach(() => {
    medicLocalDb = { get: sinon.stub(), put: sinon.stub().resolves({ ok: true }) };
    metaLocalDb = { get: sinon.stub(), put: sinon.stub().resolves({ ok: true }) };
    db = sinon.stub().callsFake((param) => (param && param.meta) ? metaLocalDb : medicLocalDb);

    module('inboxApp');
    module($provide => {
      $provide.value('DB', db);
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject((_DBSyncRetry_) => {
      service = _DBSyncRetry_;
    });
  });


  describe('retryForbiddenFailure', () => {
    it('should do nothing when no error', () => {
      const result = service();
      chai.expect(medicLocalDb.get.callCount).to.equal(0);
      chai.expect(metaLocalDb.get.callCount).to.equal(0);
      chai.expect(!!result).to.equal(false);
    });

    it('should do nothing when error has no id property', () => {
      const result = service({ error: 'whatever' });
      chai.expect(medicLocalDb.get.callCount).to.equal(0);
      chai.expect(metaLocalDb.get.callCount).to.equal(0);
      chai.expect(!!result).to.equal(false);
    });

    it('should catch 404s', () => {
      medicLocalDb.get.rejects({ status: 404 });
      metaLocalDb.get.rejects({ status: 404 });
      return service({ id: 'some_uuid' }).then(result => {
        chai.expect(medicLocalDb.get.callCount).to.equal(1);
        chai.expect(medicLocalDb.get.args[0]).to.deep.equal(['some_uuid', { revs: true }]);
        chai.expect(metaLocalDb.get.callCount).to.equal(1);
        chai.expect(metaLocalDb.get.args[0]).to.deep.equal(['_local/some_uuid']);
        chai.expect(medicLocalDb.put.callCount).to.equal(0);
        chai.expect(metaLocalDb.put.callCount).to.equal(0);
        chai.expect(!!result).to.equal(false);
      });
    });

    it('should account for no _revisions property', () => {
      const doc = {
        _id: 'random',
        _rev: '3-rev',
      };
      medicLocalDb.get.resolves(doc);
      metaLocalDb.get.rejects({ status: 404 });

      return service({ id: 'random' }).then(result => {
        chai.expect(medicLocalDb.get.callCount).to.equal(1);
        chai.expect(medicLocalDb.get.args[0]).to.deep.equal(['random', { revs: true }]);
        chai.expect(metaLocalDb.get.callCount).to.equal(1);
        chai.expect(metaLocalDb.get.args[0]).to.deep.equal(['_local/random']);

        chai.expect(medicLocalDb.put.callCount).to.equal(1);
        chai.expect(medicLocalDb.put.args[0]).to.deep.equal([{
          _id: 'random',
          _rev: '3-rev',
        }]);
        chai.expect(metaLocalDb.put.callCount).to.equal(1);
        chai.expect(metaLocalDb.put.args[0]).to.deep.equal([{
          _id: '_local/random',
          replication_retry: {
            rev: '3-rev',
            count: 1
          },
        }]);
        chai.expect(!!result).to.equal(true);
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

      return service({ id: 'demo_report' }).then(result => {
        chai.expect(medicLocalDb.get.callCount).to.equal(1);
        chai.expect(medicLocalDb.get.args[0]).to.deep.equal(['demo_report', { revs: true }]);
        chai.expect(metaLocalDb.get.callCount).to.equal(1);
        chai.expect(metaLocalDb.get.args[0]).to.deep.equal(['_local/demo_report']);

        chai.expect(medicLocalDb.put.callCount).to.equal(1);
        chai.expect(medicLocalDb.put.args[0]).to.deep.equal([{
          _id: 'demo_report',
          _rev: '3-rev',
        }]);

        chai.expect(metaLocalDb.put.callCount).to.equal(1);
        chai.expect(metaLocalDb.put.args[0]).to.deep.equal([{
          _id: '_local/demo_report',
          replication_retry: {
            rev: '3-rev',
            count: 1
          },
        }]);
        chai.expect(!!result).to.equal(true);
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

      return service({ id: 'uuid' }).then(result => {
        chai.expect(medicLocalDb.get.callCount).to.equal(1);
        chai.expect(metaLocalDb.get.callCount).to.equal(1);

        chai.expect(medicLocalDb.put.callCount).to.equal(1);
        chai.expect(medicLocalDb.put.args[0]).to.deep.equal([{
          _id: 'uuid',
          _rev: '3-rev',
        }]);
        chai.expect(metaLocalDb.put.callCount).to.equal(1);
        chai.expect(metaLocalDb.put.args[0]).to.deep.equal([{
          _id: '_local/uuid',
          _rev: '1-rev',
          replication_retry: {
            rev: '3-rev',
            count: 1
          },
        }]);
        chai.expect(!!result).to.equal(true);
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

      return service({ id: 'uuid' }).then(result => {
        chai.expect(medicLocalDb.get.callCount).to.equal(1);
        chai.expect(metaLocalDb.get.callCount).to.equal(1);
        chai.expect(medicLocalDb.put.callCount).to.equal(1);
        chai.expect(medicLocalDb.put.args[0]).to.deep.equal([{
          _id: 'uuid',
          _rev: '3-rev',
        }]);
        chai.expect(metaLocalDb.put.callCount).to.equal(1);
        chai.expect(metaLocalDb.put.args[0]).to.deep.equal([{
          _id: '_local/uuid',
          _rev: '23-rev',
          replication_retry: {
            rev: '3-rev',
            count: 3
          },
        }]);
        chai.expect(!!result).to.equal(true);
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

      return service({ id: 'uuid' }).then(result => {
        chai.expect(medicLocalDb.get.callCount).to.equal(1);
        chai.expect(metaLocalDb.get.callCount).to.equal(1);

        chai.expect(medicLocalDb.put.callCount).to.equal(1);
        chai.expect(medicLocalDb.put.args[0]).to.deep.equal([{
          _id: 'uuid',
          _rev: '4-rev',
        }]);
        chai.expect(metaLocalDb.put.callCount).to.equal(1);
        chai.expect(metaLocalDb.put.args[0]).to.deep.equal([{
          _id: '_local/uuid',
          _rev: '33-rev',
          replication_retry: {
            rev: '4-rev',
            count: 1
          },
        }]);
        chai.expect(!!result).to.equal(true);
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

      return service({ id: 'uuid' }).then(result => {
        chai.expect(medicLocalDb.get.callCount).to.equal(1);
        chai.expect(metaLocalDb.get.callCount).to.equal(1);

        chai.expect(medicLocalDb.put.callCount).to.equal(1);
        chai.expect(medicLocalDb.put.args[0]).to.deep.equal([{
          _id: 'uuid',
          _rev: '4-rev',
        }]);
        chai.expect(metaLocalDb.put.callCount).to.equal(0);
        chai.expect(!!result).to.equal(false);
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

      return service({ id: 'uuid' }).then(result => {
        chai.expect(medicLocalDb.get.callCount).to.equal(1);
        chai.expect(metaLocalDb.get.callCount).to.equal(1);

        chai.expect(medicLocalDb.put.callCount).to.equal(0);
        chai.expect(metaLocalDb.put.callCount).to.equal(0);
        chai.expect(!!result).to.equal(false);
      });
    });

    it('should catch db put errors', () => {
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

      return service({ id: 'the_id' }).then(result => {
        chai.expect(medicLocalDb.get.callCount).to.equal(1);
        chai.expect(medicLocalDb.get.args[0]).to.deep.equal(['the_id', { revs: true }]);
        chai.expect(metaLocalDb.get.callCount).to.equal(1);
        chai.expect(metaLocalDb.get.args[0]).to.deep.equal(['_local/the_id']);
        chai.expect(medicLocalDb.put.callCount).to.equal(1);
        chai.expect(medicLocalDb.put.args[0]).to.deep.equal([{
          _id: 'the_id',
          _rev: '4-rev',
        }]);
        chai.expect(metaLocalDb.put.callCount).to.equal(0);
        chai.expect(!!result).to.equal(false);
      });
    });
  });

});
