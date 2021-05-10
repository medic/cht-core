import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import * as moment from 'moment';

import { TelemetryService } from '@mm-services/telemetry.service';
import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';

describe('TelemetryService', () => {
  const NOW = new Date(2018, 10, 10, 12, 33).getTime(); // -> 2018-11-10T12:33:00
  let service: TelemetryService;
  let dbService;
  let dbInstance;
  let sessionService;
  let clock;
  let pouchDb;
  let storageGetItemStub;
  let storageSetItemStub;
  let consoleErrorSpy;

  const windowPouchOriginal = window.PouchDB;

  const windowScreenOriginal = {
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight
  };
  const windowNavigatorOriginal = {
    userAgent: window.navigator.userAgent,
    hardwareConcurrency: window.navigator.hardwareConcurrency
  };

  function defineWindow() {
    Object.defineProperty(window.navigator, 'userAgent',
      { value: 'Agent Smith', configurable: true });
    Object.defineProperty(window.navigator, 'hardwareConcurrency',
      { value: 4, configurable: true });
    Object.defineProperty(window.screen, 'availWidth',
      { value: 768, configurable: true });
    Object.defineProperty(window.screen, 'availHeight',
      { value: 1024, configurable: true });
  }

  function restoreWindow() {
    Object.defineProperty(window.navigator, 'userAgent',
      { value: windowNavigatorOriginal.userAgent, configurable: true });
    Object.defineProperty(window.navigator, 'hardwareConcurrency',
      { value: windowNavigatorOriginal.hardwareConcurrency, configurable: true });
    Object.defineProperty(window.screen, 'availWidth',
      { value: windowScreenOriginal.availWidth, configurable: true });
    Object.defineProperty(window.screen, 'availHeight',
      { value: windowScreenOriginal.availHeight, configurable: true });
  }

  function subtractDays(numDays) {
    return moment()
      .subtract(numDays, 'days')
      .valueOf()
      .toString();
  }

  function sameDay() {
    return moment()
      .valueOf()
      .toString();
  }

  beforeEach(() => {
    defineWindow();
    dbInstance = {
      info: sinon.stub(),
      put: sinon.stub(),
      get: sinon.stub(),
      query: sinon.stub()
    };
    dbService = { get: () => dbInstance };
    consoleErrorSpy = sinon.spy(console, 'error');
    pouchDb = {
      info: sinon.stub().resolves({doc_count: 10}),
      post: sinon.stub().resolves(),
      close: sinon.stub(),
      destroy: sinon.stub().callsFake(() => {
        pouchDb._destroyed = true;
        return Promise.resolve();
      })
    };
    sessionService = { userCtx: sinon.stub().returns({ name: 'greg' }) };
    storageGetItemStub = sinon.stub(window.localStorage, 'getItem');
    storageSetItemStub = sinon.stub(window.localStorage, 'setItem');

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: SessionService, useValue: sessionService }
      ]
    });

    service = TestBed.inject(TelemetryService);
    clock = sinon.useFakeTimers(NOW);
    window.PouchDB = () => pouchDb;
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
    window.PouchDB = windowPouchOriginal;
    restoreWindow();
  });

  describe('record()', () => {
    it('should record a piece of telemetry', async () => {
      storageGetItemStub.withArgs('medic-greg-telemetry-db').returns('dbname');
      storageGetItemStub.withArgs('medic-greg-telemetry-date').returns(Date.now().toString());

      await service.record('test', 100);

      expect(consoleErrorSpy.callCount).to.equal(0);
      expect(pouchDb.post.callCount).to.equal(1);
      expect(pouchDb.post.args[0][0]).to.deep.include({ key: 'test', value: 100 });
      expect(pouchDb.post.args[0][0].date_recorded).to.be.above(0);
      expect(storageGetItemStub.callCount).to.equal(3);
      expect(pouchDb.close.callCount).to.equal(1);
    });

    it('should default the value to 1 if not passed', async () => {
      storageGetItemStub.withArgs('medic-greg-telemetry-db').returns('dbname');
      storageGetItemStub.withArgs('medic-greg-telemetry-date').returns(Date.now().toString());

      await service.record('test');

      expect(consoleErrorSpy.callCount).to.equal(0);
      expect(pouchDb.post.args[0][0].value).to.equal(1);
      expect(pouchDb.close.callCount).to.equal(1);
    });

    function setupDbMocks() {
      storageGetItemStub.returns('dbname');
      pouchDb.query = sinon.stub().resolves({
        rows: [
          { key: 'foo', value: {sum:2876, min:581, max:2295, count:2, sumsqr:5604586} },
          { key: 'bar', value: {sum:93, min:43, max:50, count:2, sumsqr:4349} },
        ],
      });
      dbInstance.info.resolves({ some: 'stats' });
      dbInstance.put.resolves();
      dbInstance.get
        .withArgs('_design/medic-client')
        .resolves({
          _id: '_design/medic-client',
          deploy_info: { version: '3.0.0' }
        });
      dbInstance.query.resolves({
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
    }

    it('should aggregate once a day and resets the db first', async () => {
      setupDbMocks();
      storageGetItemStub.withArgs('medic-greg-telemetry-date').returns(subtractDays(5));

      await service.record('test', 1);

      expect(pouchDb.post.callCount).to.equal(1);
      expect(pouchDb.post.args[0][0]).to.deep.include({ key: 'test', value: 1 });

      expect(dbInstance.put.callCount).to.equal(1);
      const aggregatedDoc = dbInstance.put.args[0][0];
      expect(aggregatedDoc._id).to.match(/telemetry-2018-11-5-greg/);
      expect(aggregatedDoc.metrics).to.deep.equal({
        foo: {sum:2876, min:581, max:2295, count:2, sumsqr:5604586},
        bar: {sum:93, min:43, max:50, count:2, sumsqr:4349},
      });
      expect(aggregatedDoc.type).to.equal('telemetry');
      expect(aggregatedDoc.metadata.year).to.equal(2018);
      expect(aggregatedDoc.metadata.month).to.equal(11);
      expect(aggregatedDoc.metadata.day).to.equal(5);
      expect(aggregatedDoc.metadata.user).to.equal('greg');
      expect(aggregatedDoc.metadata.versions).to.deep.equal({
        app: '3.0.0',
        forms: {
          'anc_followup': '1-abc'
        }
      });
      expect(aggregatedDoc.dbInfo).to.deep.equal({ some: 'stats' });
      expect(aggregatedDoc.device).to.deep.equal({
        userAgent: 'Agent Smith',
        hardwareConcurrency: 4,
        screen: {
          width: 768,
          height: 1024,
        },
        deviceInfo: {}
      });

      expect(dbInstance.query.callCount).to.equal(1);
      expect(dbInstance.query.args[0][0]).to.equal('medic-client/doc_by_type');
      expect(dbInstance.query.args[0][1]).to.deep.equal({ key: ['form'], include_docs: true });
      expect(pouchDb.destroy.callCount).to.equal(1);
      expect(pouchDb.close.callCount).to.equal(0);

      expect(consoleErrorSpy.callCount).to.equal(0);  // no errors
    });

    it('should not aggregate when recording the day the db was created and next day it should aggregate', async () => {
      setupDbMocks();
      storageGetItemStub.withArgs('medic-greg-telemetry-date').returns(sameDay());

      await service.record('test', 10);

      expect(pouchDb.post.callCount).to.equal(1);
      expect(pouchDb.post.args[0][0]).to.deep.include({ key: 'test', value: 10 });
      expect(dbInstance.put.callCount).to.equal(0);   // NO telemetry has been recorded yet

      clock = sinon.useFakeTimers(moment(NOW).add(1, 'minutes').valueOf()); // 1 min later ...
      await service.record('test', 5);

      expect(pouchDb.post.callCount).to.equal(2); // second call
      expect(pouchDb.post.args[1][0]).to.deep.include({ key: 'test', value: 5 });
      expect(dbInstance.put.callCount).to.equal(0);   // still NO telemetry has been recorded (same day)

      clock = sinon.useFakeTimers(moment(NOW).add(1, 'days').valueOf()); // 1 day later ...
      await service.record('test', 2);

      expect(pouchDb.post.callCount).to.equal(3); // third call
      expect(pouchDb.post.args[2][0]).to.deep.include({ key: 'test', value: 2 });
      expect(dbInstance.put.callCount).to.equal(1);   // Now telemetry has been recorded

      const aggregatedDoc = dbInstance.put.args[0][0];
      expect(aggregatedDoc._id).to.match(/telemetry-2018-11-10-greg/);  // Now is 2018-11-11 but aggregation
      expect(pouchDb.destroy.callCount).to.equal(1);                    // is from from previous day

      expect(consoleErrorSpy.callCount).to.equal(0);  // no errors
    });

    it('should aggregate from days with records skipping days without records', async () => {
      setupDbMocks();
      storageGetItemStub.withArgs('medic-greg-telemetry-date').returns(sameDay());

      await service.record('datapoint', 12);

      expect(pouchDb.post.callCount).to.equal(1);
      expect(dbInstance.put.callCount).to.equal(0);   // NO telemetry has been recorded yet

      clock = sinon.useFakeTimers(moment(NOW).add(1, 'minutes').valueOf()); // 1 min later ...
      await service.record('another.datapoint');

      expect(pouchDb.post.callCount).to.equal(2);       // second call
      expect(dbInstance.put.callCount).to.equal(0);     // still NO telemetry has been recorded (same day)

      storageGetItemStub.withArgs('medic-greg-telemetry-date').returns(sameDay());
      clock = sinon.useFakeTimers(moment(NOW).add(2, 'days').valueOf()); // 2 days later ...
      await service.record('test', 2);

      expect(pouchDb.post.callCount).to.equal(3);       // third call
      expect(dbInstance.put.callCount).to.equal(1);     // Now telemetry IS recorded

      let aggregatedDoc = dbInstance.put.args[0][0];
      expect(aggregatedDoc._id).to.match(/telemetry-2018-11-10-greg/);  // Today is 2018-11-12 but aggregation
      expect(pouchDb.destroy.callCount).to.equal(1);                    // is from from 2 days ago (not Yesterday)

      storageGetItemStub.withArgs('medic-greg-telemetry-date').returns(sameDay());  // same day now is 2 days ahead

      clock = sinon.useFakeTimers(moment(NOW).add(7, 'days').valueOf()); // 7 days later ...
      await service.record('point.a', 1);

      expect(pouchDb.post.callCount).to.equal(4);       // 4th call
      expect(dbInstance.put.callCount).to.equal(2);     // Telemetry IS recorded again
      aggregatedDoc = dbInstance.put.args[1][0];
      expect(aggregatedDoc._id).to.match(/telemetry-2018-11-12-greg/);  // Today is 2018-11-19 but aggregation
                                                                        // is from 2018-11-12

      // A new record is added ...
      clock = sinon.useFakeTimers(moment(NOW).add(2, 'hours').valueOf()); // ... 2 hours later ...
      await service.record('point.b', 0); // 1 record added
      // ...the aggregation count is the same because
      // the aggregation was already performed 2 hours ago within the same day
      expect(pouchDb.post.callCount).to.equal(5);       // 5th call
      expect(dbInstance.put.callCount).to.equal(2);     // Telemetry count is the same

      expect(consoleErrorSpy.callCount).to.equal(0);    // no errors
    });
  });

  describe('getDb()', () => {
    it('should set localStorage values', async () => {
      storageGetItemStub
        .withArgs('medic-greg-telemetry-db')
        .returns(undefined);
      storageGetItemStub
        .withArgs('medic-greg-telemetry-date')
        .returns(undefined);

      await service.record('test', 1);

      expect(consoleErrorSpy.callCount).to.equal(0);
      expect(storageSetItemStub.callCount).to.equal(3);
      expect(storageSetItemStub.args[0][0]).to.equal('medic-greg-telemetry-db');
      expect(storageSetItemStub.args[0][1]).to.match(/medic-user-greg-telemetry-/); // ends with a UUID
      expect(storageSetItemStub.args[1][0]).to.equal('medic-greg-telemetry-date');
      expect(storageSetItemStub.args[1][1]).to.equal(NOW.toString());
    });
  });

  describe('storeConflictedAggregate()', () => {

    it('should deal with conflicts by making the ID unique and noting the conflict in the new document', async () => {
      storageGetItemStub.withArgs('medic-greg-telemetry-db').returns('dbname');
      storageGetItemStub.withArgs('medic-greg-telemetry-date').returns(subtractDays(5));

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
      dbInstance.info.resolves({ some: 'stats' });
      dbInstance.put.onFirstCall().rejects({ status: 409 });
      dbInstance.put.onSecondCall().resolves();
      dbInstance.get.withArgs('_design/medic-client').resolves({
        _id: '_design/medic-client',
        deploy_info: {
          version: '3.0.0'
        }
      });
      dbInstance.query.resolves({ rows: [] });

      await service.record('test', 1);

      expect(consoleErrorSpy.callCount).to.equal(0);
      expect(dbInstance.put.callCount).to.equal(2);
      expect(dbInstance.put.args[1][0]._id).to.match(/conflicted/);
      expect(dbInstance.put.args[1][0].metadata.conflicted).to.equal(true);
      expect(pouchDb.destroy.callCount).to.equal(1);
      expect(pouchDb.close.callCount).to.equal(0);
    });
  });
});
