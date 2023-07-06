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
  let metaDb;
  let medicDb;
  let sessionService;
  let clock;
  let telemetryDb;
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

  const defineWindow = () => {
    Object.defineProperty(
      window.navigator,
      'userAgent',
      { value: 'Agent Smith', configurable: true }
    );
    Object.defineProperty(
      window.navigator,
      'hardwareConcurrency',
      { value: 4, configurable: true }
    );
    Object.defineProperty(
      window.screen,
      'availWidth',
      { value: 768, configurable: true }
    );
    Object.defineProperty(
      window.screen,
      'availHeight',
      { value: 1024, configurable: true }
    );
  };

  const restoreWindow = () => {
    Object.defineProperty(
      window.navigator,
      'userAgent',
      { value: windowNavigatorOriginal.userAgent, configurable: true }
    );
    Object.defineProperty(
      window.navigator,
      'hardwareConcurrency',
      { value: windowNavigatorOriginal.hardwareConcurrency, configurable: true }
    );
    Object.defineProperty(
      window.screen,
      'availWidth',
      { value: windowScreenOriginal.availWidth, configurable: true }
    );
    Object.defineProperty(
      window.screen,
      'availHeight',
      { value: windowScreenOriginal.availHeight, configurable: true }
    );
  };

  const subtractDays = (numDays) => {
    return moment()
      .subtract(numDays, 'days')
      .valueOf()
      .toString();
  };

  const sameDay = () => {
    return moment()
      .valueOf()
      .toString();
  };

  beforeEach(() => {
    defineWindow();
    metaDb = {
      put: sinon.stub(),
    };
    medicDb = {
      info: sinon.stub(),
      get: sinon.stub(),
      query: sinon.stub(),
      allDocs: sinon.stub()
    };
    const getStub = sinon.stub();
    getStub.withArgs({meta: true}).returns(metaDb);
    getStub.returns(medicDb);
    dbService = { get: getStub };
    consoleErrorSpy = sinon.spy(console, 'error');
    telemetryDb = {
      post: sinon.stub().resolves(),
      close: sinon.stub(),
      query: sinon.stub(),
      destroy: sinon.stub().callsFake(() => {
        telemetryDb._destroyed = true;
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
    window.PouchDB = () => telemetryDb;
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
      expect(telemetryDb.post.callCount).to.equal(1);
      expect(telemetryDb.post.args[0][0]).to.deep.include({ key: 'test', value: 100 });
      expect(telemetryDb.post.args[0][0].date_recorded).to.be.above(0);
      expect(storageGetItemStub.callCount).to.equal(3);
      expect(storageGetItemStub.args[0]).to.deep.equal(['medic-greg-telemetry-db']);
      expect(storageGetItemStub.args[1]).to.deep.equal(['medic-greg-telemetry-date']);
      expect(storageGetItemStub.args[2]).to.deep.equal(['medic-greg-telemetry-db']);
      expect(telemetryDb.close.callCount).to.equal(1);
    });

    it('should default the value to 1 if not passed', async () => {
      storageGetItemStub.withArgs('medic-greg-telemetry-db').returns('dbname');
      storageGetItemStub.withArgs('medic-greg-telemetry-date').returns(Date.now().toString());

      await service.record('test');

      expect(consoleErrorSpy.callCount).to.equal(0);
      expect(telemetryDb.post.args[0][0].value).to.equal(1);
      expect(telemetryDb.close.callCount).to.equal(1);
    });

    const setupDbMocks = () => {
      storageGetItemStub.returns('dbname');
      telemetryDb.query.resolves({
        rows: [
          { key: 'foo', value: {sum:2876, min:581, max:2295, count:2, sumsqr:5604586} },
          { key: 'bar', value: {sum:93, min:43, max:50, count:2, sumsqr:4349} },
        ],
      });
      medicDb.info.resolves({ some: 'stats' });
      metaDb.put.resolves();
      medicDb.get
        .withArgs('_design/medic-client')
        .resolves({
          _id: '_design/medic-client',
          build_info: { version: '3.0.0' }
        });
      medicDb.query.resolves({
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
      medicDb.allDocs.resolves({
        rows: [{
          value: {
            rev: 'somerandomrevision'
          }
        }]
      });
    };

    it('should aggregate once a day and resets the db first', async () => {
      setupDbMocks();
      storageGetItemStub.withArgs('medic-greg-telemetry-date').returns(subtractDays(5));

      await service.record('test', 1);

      expect(telemetryDb.post.callCount).to.equal(1);
      expect(telemetryDb.post.args[0][0]).to.deep.include({ key: 'test', value: 1 });

      expect(metaDb.put.callCount).to.equal(1);
      const aggregatedDoc = metaDb.put.args[0][0];
      expect(aggregatedDoc._id).to.match(/^telemetry-2018-11-5-greg-[\w-]+$/);
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
          anc_followup: '1-abc'
        },
        settings: 'somerandomrevision'
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

      expect(medicDb.query.callCount).to.equal(1);
      expect(medicDb.query.args[0][0]).to.equal('medic-client/doc_by_type');
      expect(medicDb.query.args[0][1]).to.deep.equal({ key: ['form'], include_docs: true });
      expect(telemetryDb.destroy.callCount).to.equal(1);
      expect(telemetryDb.close.callCount).to.equal(0);

      expect(consoleErrorSpy.callCount).to.equal(0);  // no errors
    });

    it('should not aggregate when recording the day the db was created and next day it should aggregate', async () => {
      setupDbMocks();
      storageGetItemStub.withArgs('medic-greg-telemetry-date').returns(sameDay());

      await service.record('test', 10);

      expect(telemetryDb.post.callCount).to.equal(1);     // Telemetry entry has been recorded
      expect(telemetryDb.post.args[0][0]).to.deep.include({ key: 'test', value: 10 });
      expect(telemetryDb.query.called).to.be.false;       // NO telemetry aggregation has
      expect(metaDb.put.callCount).to.equal(0);           // been recorded yet

      clock = sinon.useFakeTimers(moment(NOW).add(1, 'minutes').valueOf()); // 1 min later ...
      await service.record('test', 5);

      expect(telemetryDb.post.callCount).to.equal(2);     // second call
      expect(telemetryDb.post.args[1][0]).to.deep.include({ key: 'test', value: 5 });
      expect(telemetryDb.query.called).to.be.false;       // still NO aggregation has
      expect(metaDb.put.callCount).to.equal(0);           // been recorded (same day)

      let postCalledAfterQuery = false;
      telemetryDb.post.callsFake(async () => postCalledAfterQuery = telemetryDb.query.called);
      clock = sinon.useFakeTimers(moment(NOW).add(1, 'days').valueOf()); // 1 day later ...
      await service.record('test', 2);

      expect(telemetryDb.post.callCount).to.equal(3);     // third call
      expect(telemetryDb.post.args[2][0]).to.deep.include({ key: 'test', value: 2 });
      expect(telemetryDb.query.callCount).to.equal(1);    // Now aggregation HAS been performed
      expect(metaDb.put.callCount).to.equal(1);           // and the stats recorded

      // The telemetry record has been recorded after aggregation to not being included in the stats,
      // because the record belong to the current date, not the day aggregated (yesterday)
      expect(postCalledAfterQuery).to.be.true;

      const aggregatedDoc = metaDb.put.args[0][0];
      expect(aggregatedDoc._id).to.match(/^telemetry-2018-11-10-greg-[\w-]+$/);     // Now is 2018-11-11 but aggregation
      expect(telemetryDb.destroy.callCount).to.equal(1);                            // is from the previous day

      expect(consoleErrorSpy.callCount).to.equal(0);      // no errors
    });

    it('should aggregate from days with records skipping days without records', async () => {
      setupDbMocks();
      storageGetItemStub.withArgs('medic-greg-telemetry-date').returns(sameDay());

      await service.record('datapoint', 12);

      expect(telemetryDb.post.callCount).to.equal(1);
      expect(metaDb.put.callCount).to.equal(0);             // NO telemetry has been recorded yet

      clock = sinon.useFakeTimers(moment(NOW).add(1, 'minutes').valueOf()); // 1 min later ...
      await service.record('another.datapoint');

      expect(telemetryDb.post.callCount).to.equal(2);       // second call
      expect(metaDb.put.callCount).to.equal(0);             // still NO telemetry has been recorded (same day)

      storageGetItemStub.withArgs('medic-greg-telemetry-date').returns(sameDay());
      clock = sinon.useFakeTimers(moment(NOW).add(2, 'days').valueOf()); // 2 days later ...
      await service.record('test', 2);

      expect(telemetryDb.post.callCount).to.equal(3);       // third call
      expect(metaDb.put.callCount).to.equal(1);             // Now telemetry IS recorded

      let aggregatedDoc = metaDb.put.args[0][0];
      expect(aggregatedDoc._id).to.match(/^telemetry-2018-11-10-greg-[\w-]+$/);  // Today 2018-11-12 but aggregation is
      expect(telemetryDb.destroy.callCount).to.equal(1);                         // from from 2 days ago (not Yesterday)

      storageGetItemStub.withArgs('medic-greg-telemetry-date').returns(sameDay());    // same day now is 2 days ahead

      clock = sinon.useFakeTimers(moment(NOW).add(7, 'days').valueOf());  // 7 days later ...
      await service.record('point.a', 1);

      expect(telemetryDb.post.callCount).to.equal(4);       // 4th call
      expect(metaDb.put.callCount).to.equal(2);             // Telemetry IS recorded again
      aggregatedDoc = metaDb.put.args[1][0];
      expect(aggregatedDoc._id).to.match(/^telemetry-2018-11-12-greg-[\w-]+$/); // Now is Nov 19 but agg. is from Nov 12

      // A new record is added ...
      clock = sinon.useFakeTimers(moment(NOW).add(2, 'hours').valueOf()); // ... 2 hours later ...
      await service.record('point.b', 0); // 1 record added
      // ...the aggregation count is the same because
      // the aggregation was already performed 2 hours ago within the same day
      expect(telemetryDb.post.callCount).to.equal(5);       // 5th call
      expect(metaDb.put.callCount).to.equal(2);             // Telemetry count is the same

      expect(consoleErrorSpy.callCount).to.equal(0);        // no errors
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
      expect(storageSetItemStub.args[0][1]).to.match(/^medic-user-greg-telemetry-[\w-]+$/);
      expect(storageSetItemStub.args[1][0]).to.equal('medic-greg-telemetry-date');
      expect(storageSetItemStub.args[1][1]).to.equal(NOW.toString());
    });
  });

  describe('storeConflictedAggregate()', () => {

    it('should deal with conflicts by making the ID unique and noting the conflict in the new document', async () => {
      storageGetItemStub.withArgs('medic-greg-telemetry-db').returns('dbname');
      storageGetItemStub.withArgs('medic-greg-telemetry-date').returns(subtractDays(5));

      telemetryDb.query = sinon.stub().resolves({
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
      medicDb.info.resolves({ some: 'stats' });
      metaDb.put.onFirstCall().rejects({ status: 409 });
      metaDb.put.onSecondCall().resolves();
      medicDb.get.withArgs('_design/medic-client').resolves({
        _id: '_design/medic-client',
        build_info: {
          version: '3.0.0'
        }
      });
      medicDb.allDocs.resolves({
        rows: [{
          value: {
            rev: 'randomrev'
          }
        }]
      });
      medicDb.query.resolves({ rows: [] });

      await service.record('test', 1);

      expect(consoleErrorSpy.callCount).to.equal(0);
      expect(metaDb.put.callCount).to.equal(2);
      expect(metaDb.put.args[1][0]._id).to.match(/^telemetry-2018-11-5-greg-[\w-]+-conflicted-[\w-]+$/);
      expect(metaDb.put.args[1][0].metadata.conflicted).to.equal(true);
      expect(telemetryDb.destroy.callCount).to.equal(1);
      expect(telemetryDb.close.callCount).to.equal(0);
    });
  });
});
