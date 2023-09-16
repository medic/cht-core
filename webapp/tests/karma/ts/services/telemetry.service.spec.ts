import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
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
  let consoleErrorSpy;
  let windowMock;

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
    getStub.withArgs({ meta: true }).returns(metaDb);
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
    windowMock = {
      PouchDB: sinon.stub().returns(telemetryDb),
      indexedDB: { databases: sinon.stub() },
      localStorage: { getItem: sinon.stub(), setItem: sinon.stub() },
    };
    const documentMock = {
      defaultView: windowMock,
      querySelectorAll: sinon.stub().returns([]),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: SessionService, useValue: sessionService },
        { provide: DOCUMENT, useValue: documentMock },
      ]
    });

    service = TestBed.inject(TelemetryService);
    clock = sinon.useFakeTimers(NOW);
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
    restoreWindow();
  });

  describe('record()', () => {
    it('should record a piece of telemetry', async () => {
      medicDb.query.resolves({ rows: [] });
      telemetryDb.query.resolves({ rows: [] });
      windowMock.indexedDB.databases.resolves([
        { name: '_pouch_telemetry-2018-11-10-greg' },
        { name: '_pouch_some-other-db' },
        { name: '_pouch_telemetry-2018-11-09-greg' },
      ]);

      await service.record('test', 100);

      expect(consoleErrorSpy.notCalled).to.be.true;
      expect(telemetryDb.post.calledOnce).to.be.true;
      expect(telemetryDb.post.args[0][0]).to.deep.include({ key: 'test', value: 100 });
      expect(telemetryDb.post.args[0][0].date_recorded).to.be.above(0);
      expect(windowMock.indexedDB.databases.calledTwice).to.be.true;
      expect(windowMock.PouchDB.calledTwice).to.be.true;
      expect(windowMock.PouchDB.args[0]).to.deep.equal([ 'telemetry-2018-11-09-greg' ]);
      expect(windowMock.PouchDB.args[1]).to.deep.equal([ 'telemetry-2018-11-10-greg' ]);
      expect(telemetryDb.destroy.calledOnce).to.be.true;
    });

    it('should default the value to 1 if not passed', async () => {
      medicDb.query.resolves({ rows: [] });
      telemetryDb.query.resolves({ rows: [] });
      windowMock.indexedDB.databases.resolves([
        { name: 'telemetry-2018-11-10-greg' },
        { name: 'some-other-db' },
        { name: 'telemetry-2018-11-09-greg' },
      ]);

      await service.record('test');

      expect(consoleErrorSpy.notCalled).to.be.true;
      expect(telemetryDb.post.args[0][0].value).to.equal(1);
      expect(telemetryDb.destroy.calledOnce).to.be.true;
    });

    const setupDbMocks = () => {
      telemetryDb.query.resolves({
        rows: [
          { key: 'foo', value: { sum: 2876, min: 581, max: 2295, count: 2, sumsqr: 5604586 } },
          { key: 'bar', value: { sum: 93, min: 43, max: 50, count: 2, sumsqr: 4349 } },
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

    it('should aggregate once a day and delete previous telemetry databases', async () => {
      windowMock.indexedDB.databases.resolves([
        { name: 'telemetry-2018-11-10-greg' },
        { name: 'some-other-db' },
        { name: 'telemetry-2018-11-09-greg' },
        { name: 'telemetry-2018-10-02-greg' },
      ]);
      setupDbMocks();

      await service.record('test', 1);

      expect(telemetryDb.post.calledOnce).to.be.true;
      expect(telemetryDb.post.args[0][0]).to.deep.include({ key: 'test', value: 1 });
      expect(metaDb.put.calledTwice).to.be.true;

      const aggregatedDocNov = metaDb.put.args[0][0];
      expect(aggregatedDocNov._id).to.match(/^telemetry-2018-11-9-greg-[\w-]+$/);
      expect(aggregatedDocNov.metrics).to.deep.equal({
        foo: { sum: 2876, min: 581, max: 2295, count: 2, sumsqr: 5604586 },
        bar: { sum: 93, min: 43, max: 50, count: 2, sumsqr: 4349 },
      });
      expect(aggregatedDocNov.type).to.equal('telemetry');
      expect(aggregatedDocNov.metadata.year).to.equal(2018);
      expect(aggregatedDocNov.metadata.month).to.equal(11);
      expect(aggregatedDocNov.metadata.day).to.equal(9);
      expect(aggregatedDocNov.metadata.user).to.equal('greg');
      expect(aggregatedDocNov.metadata.versions).to.deep.equal({
        app: '3.0.0',
        forms: { anc_followup: '1-abc' },
        settings: 'somerandomrevision',
      });
      expect(aggregatedDocNov.dbInfo).to.deep.equal({ some: 'stats' });
      expect(aggregatedDocNov.device).to.deep.equal({
        userAgent: 'Agent Smith',
        hardwareConcurrency: 4,
        screen: { width: 768, height: 1024 },
        deviceInfo: {}
      });

      const aggregatedDocOct = metaDb.put.args[1][0];
      expect(aggregatedDocOct._id.startsWith('telemetry-2018-10-2-greg')).to.be.true;
      expect(aggregatedDocOct.metrics).to.deep.equal({
        foo: { sum: 2876, min: 581, max: 2295, count: 2, sumsqr: 5604586 },
        bar: { sum: 93, min: 43, max: 50, count: 2, sumsqr: 4349 },
      });
      expect(aggregatedDocOct.type).to.equal('telemetry');
      expect(aggregatedDocOct.metadata.year).to.equal(2018);
      expect(aggregatedDocOct.metadata.month).to.equal(10);
      expect(aggregatedDocOct.metadata.day).to.equal(2);
      expect(aggregatedDocOct.metadata.user).to.equal('greg');
      expect(aggregatedDocOct.metadata.versions).to.deep.equal({
        app: '3.0.0',
        forms: { anc_followup: '1-abc' },
        settings: 'somerandomrevision',
      });
      expect(aggregatedDocOct.dbInfo).to.deep.equal({ some: 'stats' });
      expect(aggregatedDocOct.device).to.deep.equal({
        userAgent: 'Agent Smith',
        hardwareConcurrency: 4,
        screen: { width: 768, height: 1024 },
        deviceInfo: {}
      });

      expect(medicDb.query.calledTwice).to.be.true;
      expect(medicDb.query.args[0][0]).to.equal('medic-client/doc_by_type');
      expect(medicDb.query.args[0][1]).to.deep.equal({ key: [ 'form' ], include_docs: true });
      expect(telemetryDb.destroy.calledTwice).to.be.true;
      expect(telemetryDb.close.notCalled).to.be.true;

      expect(consoleErrorSpy.notCalled).to.be.true;
    });

    it('should not aggregate when recording the day the db was created and next day it should aggregate', async () => {
      windowMock.indexedDB.databases.resolves([
        { name: 'telemetry-2018-11-10-greg' },
        { name: 'some-other-db' },
      ]);
      setupDbMocks();

      await service.record('test', 10);

      expect(telemetryDb.post.calledOnce).to.be.true;   // Telemetry entry has been recorded
      expect(telemetryDb.post.args[0][0]).to.deep.include({ key: 'test', value: 10 });
      expect(telemetryDb.query.notCalled).to.be.true;   // NO telemetry aggregation has
      expect(metaDb.put.notCalled).to.be.true;          // been recorded yet
      expect(windowMock.PouchDB.calledOnce).to.be.true;
      expect(windowMock.PouchDB.args[0]).to.deep.equal([ 'telemetry-2018-11-10-greg' ]);

      clock = sinon.useFakeTimers(moment(NOW).add(1, 'minutes').valueOf()); // 1 min later ...
      await service.record('test', 5);

      expect(telemetryDb.post.calledTwice).to.be.true;  // second call
      expect(telemetryDb.post.args[1][0]).to.deep.include({ key: 'test', value: 5 });
      expect(telemetryDb.query.notCalled).to.be.true;   // still NO aggregation has
      expect(metaDb.put.notCalled).to.be.true;          // been recorded (same day)
      expect(windowMock.PouchDB.calledTwice).to.be.true;
      expect(windowMock.PouchDB.args[0]).to.deep.equal([ 'telemetry-2018-11-10-greg' ]);

      let postCalledAfterQuery = false;
      telemetryDb.post.callsFake(async () => postCalledAfterQuery = telemetryDb.query.called);
      clock = sinon.useFakeTimers(moment(NOW).add(1, 'days').valueOf()); // 1 day later ...
      await service.record('test', 2);

      expect(telemetryDb.post.calledThrice).to.be.true; // third call
      expect(telemetryDb.post.args[2][0]).to.deep.include({ key: 'test', value: 2 });
      expect(telemetryDb.query.calledOnce).to.be.true;  // Now aggregation HAS been performed
      expect(metaDb.put.calledOnce).to.be.true;         // and the stats recorded
      expect(windowMock.PouchDB.callCount).to.equal(4);
      expect(windowMock.PouchDB.args[2]).to.deep.equal([ 'telemetry-2018-11-10-greg' ]);
      expect(windowMock.PouchDB.args[3]).to.deep.equal([ 'telemetry-2018-11-11-greg' ]);

      // The telemetry record has been recorded after aggregation to not being included in the stats,
      // because the record belong to the current date, not the day aggregated (yesterday)
      expect(postCalledAfterQuery).to.be.true;

      const aggregatedDoc = metaDb.put.args[0][0];
      // Now is 2018-11-11 and aggregated telemetry for 2018-11-10
      expect(aggregatedDoc._id).to.match(/^telemetry-2018-11-10-greg-[\w-]+$/);
      expect(telemetryDb.destroy.calledOnce).to.be.true;   // is from the previous day

      expect(consoleErrorSpy.notCalled).to.be.true;
    });

    it('should aggregate from days with records skipping days without records', async () => {
      windowMock.indexedDB.databases.resolves([]);
      setupDbMocks();

      await service.record('datapoint', 12);

      expect(telemetryDb.post.calledOnce).to.be.true;
      expect(windowMock.PouchDB.calledOnce).to.be.true;
      expect(windowMock.PouchDB.args[0]).to.deep.equal([ 'telemetry-2018-11-10-greg' ]);
      expect(metaDb.put.notCalled).to.be.true;         // NO telemetry has been recorded yet

      clock = sinon.useFakeTimers(moment(NOW).add(1, 'minutes').valueOf()); // 1 min later ...
      await service.record('another.datapoint');

      expect(telemetryDb.post.calledTwice).to.be.true; // second call
      expect(windowMock.PouchDB.calledTwice).to.be.true;
      expect(windowMock.PouchDB.args[0]).to.deep.equal([ 'telemetry-2018-11-10-greg' ]);
      expect(metaDb.put.notCalled).to.be.true;         // still NO telemetry has been recorded (same day)

      clock = sinon.useFakeTimers(moment(NOW).add(2, 'days').valueOf()); // 2 days later ...
      windowMock.indexedDB.databases.resolves([ { name: 'telemetry-2018-11-10-greg' } ]);
      await service.record('test', 2);

      expect(telemetryDb.post.calledThrice).to.be.true; // third call
      expect(windowMock.PouchDB.callCount).to.equal(4);
      expect(windowMock.PouchDB.args[2]).to.deep.equal([ 'telemetry-2018-11-10-greg' ]);
      expect(windowMock.PouchDB.args[3]).to.deep.equal([ 'telemetry-2018-11-12-greg' ]);
      expect(metaDb.put.calledOnce).to.be.true;       // Now telemetry IS recorded

      let aggregatedDoc = metaDb.put.args[0][0];
      expect(aggregatedDoc._id).to.match(/^telemetry-2018-11-10-greg-[\w-]+$/);  // Today 2018-11-12 but aggregation is
      expect(telemetryDb.destroy.calledOnce).to.be.true;                      // from 2 days ago (not Yesterday)

      clock = sinon.useFakeTimers(moment(NOW).add(7, 'days').valueOf());  // 7 days later from Nov 10
      windowMock.indexedDB.databases.resolves([ { name: 'telemetry-2018-11-12-greg' } ]);
      await service.record('point.a', 1);

      expect(telemetryDb.post.callCount).to.equal(4);       // 4th call
      expect(windowMock.PouchDB.callCount).to.equal(6);
      expect(windowMock.PouchDB.args[4]).to.deep.equal([ 'telemetry-2018-11-12-greg' ]);
      expect(windowMock.PouchDB.args[5]).to.deep.equal([ 'telemetry-2018-11-17-greg' ]);
      expect(metaDb.put.calledTwice).to.be.true;            // Telemetry IS recorded again
      aggregatedDoc = metaDb.put.args[1][0];
      expect(aggregatedDoc._id).to.match(/^telemetry-2018-11-12-greg-[\w-]+$/); // Now is Nov 17 but agg. is from Nov 12

      // A new record is added ...
      clock = sinon.useFakeTimers(moment(NOW).add(2, 'hours').valueOf()); // ... 2 hours later ...
      windowMock.indexedDB.databases.resolves([]);
      await service.record('point.b', 0); // 1 record added
      // ...the aggregation count is the same because
      // the aggregation was already performed 2 hours ago within the same day
      expect(telemetryDb.post.callCount).to.equal(5);       // 5th call
      expect(metaDb.put.calledTwice).to.be.true;            // Telemetry count is the same

      expect(consoleErrorSpy.notCalled).to.be.true;
    });
  });

  describe('storeConflictedAggregate()', () => {
    it('should deal with conflicts by making the ID unique and noting the conflict in the new document', async () => {
      windowMock.indexedDB.databases.resolves([ { name: '_pouch_telemetry-2018-11-05-greg' } ]);

      telemetryDb.query = sinon.stub().resolves({
        rows: [
          { key: 'foo', value: 'stats' },
          { key: 'bar', value: 'more stats' },
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

      expect(consoleErrorSpy.notCalled).to.be.true;
      expect(metaDb.put.calledTwice).to.be.true;
      expect(metaDb.put.args[1][0]._id).to.match(/^telemetry-2018-11-5-greg-[\w-]+-conflicted-[\w-]+$/);
      expect(metaDb.put.args[1][0].metadata.conflicted).to.equal(true);
      expect(telemetryDb.destroy.calledOnce).to.be.true;
      expect(telemetryDb.close.notCalled).to.be.true;
    });
  });
});
