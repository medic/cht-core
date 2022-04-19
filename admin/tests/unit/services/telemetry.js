describe('Telemetry service', () => {
  'use strict';

  const NOW = new Date(2018, 10, 10, 12, 33).getTime();

  let clock;
  let service;
  let $window;
  let $log;
  let DB;
  let storageGetItem;
  let storageSetItem;
  let storageRemoveItem;
  let pouchDb;

  beforeEach(() => {
    module('adminApp');
    clock = sinon.useFakeTimers(NOW);

    storageGetItem = sinon.stub();
    storageSetItem = sinon.stub();
    storageRemoveItem = sinon.stub();

    pouchDb = {};

    $window = {
      localStorage: {
        getItem: storageGetItem,
        setItem: storageSetItem,
        removeItem: storageRemoveItem,
      },
      navigator: {},
      PouchDB: () => pouchDb,
    };

    $log = {
      error: sinon.stub()
    };
    $log.error.callsFake(console.error);

    DB = {
      info: sinon.stub(),
      put: sinon.stub(),
      get: sinon.stub(),
      query: sinon.stub()
    };

    module($provide => {
      $provide.value('$q', Q);
      $provide.value('$window', $window);
      $provide.value('$log', $log);
      $provide.factory('DB', KarmaUtils.mockDB(DB));
      $provide.value('Session', {
        userCtx: () => {
          return { name: 'greg' };
        },
        checkCurrentSession: sinon.stub(),
      });
    });
    inject(_Telemetry_ => {
      service = _Telemetry_;
    });
  });

  afterEach(function() {
    clock.restore();
  });

  describe('record()', () => {
    it('records a piece of telemetry', () => {
      storageGetItem.withArgs('medic-greg-telemetry-db').returns('dbname');
      storageGetItem
        .withArgs('medic-greg-telemetry-date')
        .returns(Date.now().toString());

      pouchDb.post = sinon.stub().resolves();
      pouchDb.close = sinon.stub();

      return service.record('test', 100).then(() => {
        chai.expect($log.error.callCount).to.equal(0);
        chai.expect(pouchDb.post.callCount).to.equal(1);
        chai
          .expect(pouchDb.post.args[0][0])
          .to.deep.include({ key: 'test', value: 100 });
        chai.expect(pouchDb.post.args[0][0].date_recorded).to.be.above(0);
        chai.expect(storageGetItem.callCount).to.equal(2);
        chai.expect(pouchDb.close.callCount).to.equal(1);
      });
    });

    it('defaults the value to 1 if not passed', () => {
      storageGetItem.withArgs('medic-greg-telemetry-db').returns('dbname');
      storageGetItem
        .withArgs('medic-greg-telemetry-date')
        .returns(Date.now().toString());

      pouchDb.post = sinon.stub().resolves();
      pouchDb.close = sinon.stub();

      return service.record('test').then(() => {
        chai.expect($log.error.callCount).to.equal(0);
        chai.expect(pouchDb.post.args[0][0].value).to.equal(1);
        chai.expect(pouchDb.close.callCount).to.equal(1);
      });
    });

    it('sets localStorage values', () => {
      storageGetItem.withArgs('medic-greg-telemetry-db').returns(undefined);
      storageGetItem.withArgs('medic-greg-telemetry-date').returns(undefined);

      pouchDb.post = sinon.stub().resolves();
      pouchDb.close = sinon.stub();

      return service.record('test', 1).then(() => {
        chai.expect($log.error.callCount).to.equal(0);
        chai.expect(storageSetItem.callCount).to.equal(2);
        chai
          .expect(storageSetItem.args[0][0])
          .to.equal('medic-greg-telemetry-db');
        chai
          .expect(storageSetItem.args[0][1])
          .to.match(/medic-user-greg-telemetry-/); // ends with a UUID
        chai
          .expect(storageSetItem.args[1][0])
          .to.equal('medic-greg-telemetry-date');
        chai.expect(storageSetItem.args[1][1]).to.equal(NOW);
      });
    });

    it('aggregates once a month and resets the db', () => {
      storageGetItem.withArgs('medic-greg-telemetry-db').returns('dbname');
      storageGetItem.withArgs('medic-greg-telemetry-date').returns(
        moment()
          .subtract(5, 'weeks')
          .valueOf()
          .toString()
      );

      pouchDb.post = sinon.stub().resolves();
      pouchDb.query = sinon.stub().resolves({
        rows: [
          {
            key: 'foo',
            value: 'stats',
          },
          {
            key: 'bar',
            value: 'more stats',
          },
        ],
      });
      DB.info.resolves({ some: 'stats' });
      DB.put.resolves();
      DB.get.withArgs('_design/medic-client').resolves({
        _id: '_design/medic-client',
        deploy_info: {
          version: '3.0.0'
        }
      });
      DB.query.resolves({
        rows: [
          {
            id: 'form:anc_followup',
            key: 'anc_followup',
            doc: {
              _id: 'form:anc_followup',
              _rev: '1-abc',
              internalId: 'anc_followup'
            }
          }
        ]
      });
      pouchDb.destroy = sinon.stub().callsFake(() => {
        pouchDb._destroyed = true;
        return Promise.resolve();
      });
      pouchDb.close = sinon.stub();

      $window.navigator.userAgent = 'Agent Smith';
      $window.navigator.hardwareConcurrency = 4;
      $window.screen = {
        availWidth: 768,
        availHeight: 1024,
      };

      return service.record('test', 1).then(() => {
        chai.expect($log.error.callCount).to.equal(0);
        chai.expect(pouchDb.post.callCount).to.equal(1);
        chai
          .expect(pouchDb.post.args[0][0])
          .to.deep.include({ key: 'test', value: 1 });
        chai.expect(DB.put.callCount).to.equal(1);

        const aggregatedDoc = DB.put.args[0][0];
        chai.expect(aggregatedDoc._id).to.match(/telemetry-2018-10-greg/);
        chai.expect(aggregatedDoc.metrics).to.deep.equal({
          foo: 'stats',
          bar: 'more stats',
        });
        chai.expect(aggregatedDoc.type).to.equal('telemetry');
        chai.expect(aggregatedDoc.metadata.year).to.equal(2018);
        chai.expect(aggregatedDoc.metadata.month).to.equal(10);
        chai.expect(aggregatedDoc.metadata.user).to.equal('greg');
        chai.expect(aggregatedDoc.metadata.versions).to.deep.equal({
          app: '3.0.0',
          forms: {
            'anc_followup': '1-abc'
          }
        });
        chai.expect(aggregatedDoc.dbInfo).to.deep.equal({ some: 'stats' });
        chai.expect(aggregatedDoc.device).to.deep.equal({
          userAgent: 'Agent Smith',
          hardwareConcurrency: 4,
          screen: {
            width: 768,
            height: 1024,
          },
          deviceInfo: {}
        });
        chai.expect(DB.query.callCount).to.equal(1);
        chai.expect(DB.query.args[0][0]).to.equal('medic-client/doc_by_type');
        chai.expect(DB.query.args[0][1]).to.deep.equal({ key: ['form'], include_docs: true });
        chai.expect(pouchDb.destroy.callCount).to.equal(1);
        chai.expect(pouchDb.close.callCount).to.equal(0);
      });
    });

    it('deals with conflicts by making the ID unique and noting the conflict in the new document', () => {
      storageGetItem.withArgs('medic-greg-telemetry-db').returns('dbname');
      storageGetItem.withArgs('medic-greg-telemetry-date').returns(
        moment()
          .subtract(5, 'weeks')
          .valueOf()
          .toString()
      );

      pouchDb.post = sinon.stub().resolves();
      pouchDb.query = sinon.stub().resolves({
        rows: [
          {
            key: 'foo',
            value: 'stats',
          },
          {
            key: 'bar',
            value: 'more stats',
          },
        ],
      });
      DB.info.resolves({ some: 'stats' });
      DB.put.onFirstCall().rejects({ status: 409 });
      DB.put.onSecondCall().resolves();
      DB.get.withArgs('_design/medic-client').resolves({
        _id: '_design/medic-client',
        deploy_info: {
          version: '3.0.0'
        }
      });
      DB.query.resolves({ rows: [] });
      pouchDb.destroy = sinon.stub().callsFake(() => {
        pouchDb._destroyed = true;
        return Promise.resolve();
      });
      pouchDb.close = sinon.stub();

      $window.navigator.userAgent = 'Agent Smith';
      $window.navigator.hardwareConcurrency = 4;
      $window.screen = {
        availWidth: 768,
        availHeight: 1024,
      };

      return service.record('test', 1).then(() => {
        chai.expect($log.error.callCount).to.equal(0);
        chai.expect(DB.put.callCount).to.equal(2);
        chai.expect(DB.put.args[1][0]._id).to.match(/conflicted/);
        chai.expect(DB.put.args[1][0].metadata.conflicted).to.equal(true);
        chai.expect(pouchDb.destroy.callCount).to.equal(1);
        chai.expect(pouchDb.close.callCount).to.equal(0);
      });
    });
  });
});
