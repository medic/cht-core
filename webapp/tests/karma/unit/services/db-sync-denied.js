describe('DBSync service - denied', () => {
  'use strict';

  const directions = { to: undefined, from: undefined };
  chai.config.truncateThreshold = 0;

  let service;
  let isOnlineOnly;
  let Auth;
  let replicationResult;
  let getItem;
  let setItem;
  let localDb;
  let remoteDb;

  beforeEach(() => {
    replicationResult = Q.resolve;

    directions.to = sinon.stub();
    directions.to.events = {};
    directions.to.recursiveOn = sinon.stub().callsFake((event, callback) => {
      directions.to.events[event] = callback;
      const promise = replicationResult();
      promise.on = directions.to.recursiveOn;
      return promise;
    });
    directions.to.returns({ on: directions.to.recursiveOn });

    directions.from = sinon.stub();
    directions.from.events = {};
    directions.from.recursiveOn = sinon.stub().callsFake((event, callback) => {
      directions.from.events[event] = callback;
      const promise = replicationResult();
      promise.on = directions.from.recursiveOn;
      return promise;
    });
    directions.from.returns({ on: directions.from.recursiveOn });

    isOnlineOnly = sinon.stub().returns(false);
    Auth = sinon.stub().resolves(true);

    localDb = {
      replicate: { to: directions.to, from: directions.from },
      sync: sinon.stub(),
      info: sinon.stub().resolves({}),
      get: sinon.stub(),
      put: sinon.stub(),
    };
    remoteDb = {};
    setItem = sinon.stub();
    getItem = sinon.stub();

    module('inboxApp');
    module($provide => {
      $provide.value('DB', (param) => (param && param.remote) ? remoteDb : localDb);
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('Session', { isOnlineOnly: isOnlineOnly });
      $provide.value('Auth', Auth);
      $provide.value('$window', { localStorage: { setItem, getItem } });
    });
    inject((_DBSync_) => {
      service = _DBSync_;
    });
  });

  it('should have "denied" handles for every direction', () => {
    return service.sync().then(() => {
      chai.expect(directions.to.events.denied).to.be.a('function');
      chai.expect(directions.from.events.denied).to.be.a('function');
    });
  });

  it('"denied" from handle does nothing', () => {
    return service.sync().then(() => {
      directions.from.events.denied();
      return Q.resolve().then(() => {
        chai.expect(localDb.get.callCount).to.equal(0);
        chai.expect(localDb.put.callCount).to.equal(0);
      });
    });
  });

  describe('retryForbiddenFailure', () => {
    it('should do nothing when no error', () => {
      return service.sync().then(() => {
        directions.to.events.denied();
        return Q.resolve().then(() => {
          chai.expect(localDb.get.callCount).to.equal(0);
          chai.expect(localDb.put.callCount).to.equal(0);
        });
      });
    });

    it('should do nothing when error has no id property', () => {
      return service.sync().then(() => {
        directions.to.events.denied({ name: 'something' });
        return Q.resolve().then(() => {
          chai.expect(localDb.get.callCount).to.equal(0);
          chai.expect(localDb.put.callCount).to.equal(0);
        });
      });
    });

    it('should catch 404s', () => {
      localDb.get.rejects({ status: 404 });
      return service.sync().then(() => {
        directions.to.events.denied({ id: 'some_uuid' });
        return Q.resolve().then(() => {
          chai.expect(localDb.get.callCount).to.equal(1);
          chai.expect(localDb.get.args[0]).to.deep.equal(['some_uuid', { revs: true }]);
          chai.expect(localDb.put.callCount).to.equal(0);
        });
      });
    });

    it('should account for no _revisions property', () => {
      const doc = {
        _id: 'uuid',
        _rev: '3-rev',
      };
      localDb.get.resolves(doc);
      return service.sync().then(() => {
        directions.to.events.denied({ id: 'some_uuid' });
        return Promise.resolve().then(() => {
          chai.expect(localDb.get.callCount).to.equal(1);
          chai.expect(localDb.get.args[0]).to.deep.equal(['some_uuid', { revs: true }]);
          chai.expect(localDb.put.callCount).to.equal(1);
          chai.expect(localDb.put.args[0]).to.deep.equal([{
            _id: 'uuid',
            _rev: '3-rev',
            replication_retry: {
              rev: '3-rev',
              count: 1
            },
          }]);
        });
      });
    });

    it('should account for weird compactions', () => {
      const doc = {
        _id: 'uuid',
        _rev: '3-rev',
        _revisions: {
          start: 3,
          ids: ['rev']
        },
      };
      localDb.get.resolves(doc);
      return service.sync().then(() => {
        directions.to.events.denied({ id: 'some_uuid' });
        return Promise.resolve().then(() => {
          chai.expect(localDb.get.callCount).to.equal(1);
          chai.expect(localDb.get.args[0]).to.deep.equal(['some_uuid', { revs: true }]);
          chai.expect(localDb.put.callCount).to.equal(1);
          chai.expect(localDb.put.args[0]).to.deep.equal([{
            _id: 'uuid',
            _rev: '3-rev',
            replication_retry: {
              rev: '3-rev',
              count: 1
            },
          }]);
        });
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
        replication_retry: {
          count: 2,
          rev: '2-whatever',
        },
      };
      localDb.get.resolves(doc);
      return service.sync().then(() => {
        directions.to.events.denied({ id: 'some_uuid' });
        return Promise.resolve().then(() => {
          chai.expect(localDb.get.callCount).to.equal(1);
          chai.expect(localDb.get.args[0]).to.deep.equal(['some_uuid', { revs: true }]);
          chai.expect(localDb.put.callCount).to.equal(1);
          chai.expect(localDb.put.args[0]).to.deep.equal([{
            _id: 'uuid',
            _rev: '3-rev',
            replication_retry: {
              rev: '3-rev',
              count: 1
            },
          }]);
        });
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
        replication_retry: {
          count: 2,
          rev: '2-whatever',
        },
      };

      localDb.get.resolves(doc);
      return service.sync().then(() => {
        directions.to.events.denied({ id: 'some_uuid' });
        return Promise.resolve().then(() => {
          chai.expect(localDb.get.callCount).to.equal(1);
          chai.expect(localDb.get.args[0]).to.deep.equal(['some_uuid', { revs: true }]);
          chai.expect(localDb.put.callCount).to.equal(1);
          chai.expect(localDb.put.args[0]).to.deep.equal([{
            _id: 'uuid',
            _rev: '3-rev',
            replication_retry: {
              rev: '3-rev',
              count: 3
            },
          }]);
        });
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
        replication_retry: {
          count: 2,
          rev: '2-whatever',
        },
      };

      localDb.get.resolves(doc);
      return service.sync().then(() => {
        directions.to.events.denied({ id: 'some_uuid' });
        return Promise.resolve().then(() => {
          chai.expect(localDb.get.callCount).to.equal(1);
          chai.expect(localDb.get.args[0]).to.deep.equal(['some_uuid', { revs: true }]);
          chai.expect(localDb.put.callCount).to.equal(1);
          chai.expect(localDb.put.args[0]).to.deep.equal([{
            _id: 'uuid',
            _rev: '4-rev',
            replication_retry: {
              rev: '4-rev',
              count: 1
            },
          }]);
        });
      });
    });

    it('should catch db put errors', () => {
      const doc = {
        _id: 'uuid',
        _rev: '4-rev',
        _revisions: {
          start: 4,
          ids: ['rev', 'other', 'whatever']
        },
        replication_retry: {
          count: 2,
          rev: '2-whatever',
        },
      };

      localDb.get.resolves(doc);
      localDb.put.rejects({ err: 'boom' });
      return service.sync().then(() => {
        directions.to.events.denied({ id: 'some_uuid' });
        return Promise.resolve().then(() => {
          chai.expect(localDb.get.callCount).to.equal(1);
          chai.expect(localDb.get.args[0]).to.deep.equal(['some_uuid', { revs: true }]);
          chai.expect(localDb.put.callCount).to.equal(1);
          chai.expect(localDb.put.args[0]).to.deep.equal([{
            _id: 'uuid',
            _rev: '4-rev',
            replication_retry: {
              rev: '4-rev',
              count: 1
            },
          }]);
        });
      });
    });
  });

});
