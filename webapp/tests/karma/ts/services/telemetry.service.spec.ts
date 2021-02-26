import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import * as moment from 'moment';

import { TelemetryService } from '@mm-services/telemetry.service';
import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';

describe('TelemetryService', () => {
  const NOW = new Date(2018, 10, 10, 12, 33).getTime();
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

  beforeEach(() => {
    dbInstance = {
      info: sinon.stub(),
      put: sinon.stub(),
      get: sinon.stub(),
      query: sinon.stub()
    };
    dbService = { get: () => dbInstance };
    consoleErrorSpy = sinon.spy(console, 'error');
    pouchDb = {
      post: sinon.stub().resolves(),
      close: sinon.stub()
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
  });

  describe('record()', () => {
    it('should record a piece of telemetry', async () => {
      pouchDb.post = sinon.stub().resolves();
      pouchDb.close = sinon.stub();
      storageGetItemStub
        .withArgs('medic-greg-telemetry-db')
        .returns('dbname');
      storageGetItemStub
        .withArgs('medic-greg-telemetry-date')
        .returns(Date.now().toString());

      await service.record('test', 100);

      expect(consoleErrorSpy.callCount).to.equal(0);
      expect(pouchDb.post.callCount).to.equal(1);
      expect(pouchDb.post.args[0][0]).to.deep.include({ key: 'test', value: 100 });
      expect(pouchDb.post.args[0][0].date_recorded).to.be.above(0);
      expect(storageGetItemStub.callCount).to.equal(2);
      expect(pouchDb.close.callCount).to.equal(1);
    });

    it('should default the value to 1 if not passed', async () => {
      pouchDb.post = sinon.stub().resolves();
      pouchDb.close = sinon.stub();
      storageGetItemStub
        .withArgs('medic-greg-telemetry-db')
        .returns('dbname');
      storageGetItemStub
        .withArgs('medic-greg-telemetry-date')
        .returns(Date.now().toString());

      await service.record('test');

      expect(consoleErrorSpy.callCount).to.equal(0);
      expect(pouchDb.post.args[0][0].value).to.equal(1);
      expect(pouchDb.close.callCount).to.equal(1);
    });

    it('should set localStorage values', async () => {
      pouchDb.post = sinon.stub().resolves();
      pouchDb.close = sinon.stub();
      storageGetItemStub
        .withArgs('medic-greg-telemetry-db')
        .returns(undefined);
      storageGetItemStub
        .withArgs('medic-greg-telemetry-date')
        .returns(undefined);

      await service.record('test', 1);

      expect(consoleErrorSpy.callCount).to.equal(0);
      expect(storageSetItemStub.callCount).to.equal(2);
      expect(storageSetItemStub.args[0][0]).to.equal('medic-greg-telemetry-db');
      expect(storageSetItemStub.args[0][1]).to.match(/medic-user-greg-telemetry-/); // ends with a UUID
      expect(storageSetItemStub.args[1][0]).to.equal('medic-greg-telemetry-date');
      expect(storageSetItemStub.args[1][1]).to.equal(NOW.toString());
    });

    it('should aggregate once a month and resets the db', async () => {
      storageGetItemStub
        .withArgs('medic-greg-telemetry-db')
        .returns('dbname');
      storageGetItemStub
        .withArgs('medic-greg-telemetry-date')
        .returns(
          moment()
            .subtract(5, 'weeks')
            .valueOf()
            .toString()
        );

      pouchDb.post = sinon.stub().resolves();
      pouchDb.query = sinon.stub().resolves({
        rows: [
          { key: 'foo', value: 'stats' },
          { key: 'bar', value: 'more stats' },
        ],
      });
      pouchDb.destroy = sinon.stub().callsFake(() => {
        pouchDb._destroyed = true;
        return Promise.resolve();
      });
      pouchDb.close = sinon.stub();

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

      Object.defineProperty(window.navigator, 'userAgent', { value: 'Agent Smith', configurable: true });
      Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: 4, configurable: true });
      Object.defineProperty(window.screen, 'availWidth', { value: 768, configurable: true });
      Object.defineProperty(window.screen, 'availHeight', { value: 1024, configurable: true });

      await service.record('test', 1);

      expect(consoleErrorSpy.callCount).to.equal(0);
      expect(pouchDb.post.callCount).to.equal(1);
      expect(pouchDb.post.args[0][0]).to.deep.include({ key: 'test', value: 1 });
      expect(dbInstance.put.callCount).to.equal(1);

      const aggregatedDoc = dbInstance.put.args[0][0];
      expect(aggregatedDoc._id).to.match(/telemetry-2018-10-greg/);
      expect(aggregatedDoc.metrics).to.deep.equal({
        foo: 'stats',
        bar: 'more stats',
      });
      expect(aggregatedDoc.type).to.equal('telemetry');
      expect(aggregatedDoc.metadata.year).to.equal(2018);
      expect(aggregatedDoc.metadata.month).to.equal(10);
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
    });

    it('should deal with conflicts by making the ID unique and noting the conflict in the new document', async () => {
      storageGetItemStub.withArgs('medic-greg-telemetry-db').returns('dbname');
      storageGetItemStub.withArgs('medic-greg-telemetry-date').returns(
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
      pouchDb.destroy = sinon.stub().callsFake(() => {
        pouchDb._destroyed = true;
        return Promise.resolve();
      });
      pouchDb.close = sinon.stub();

      Object.defineProperty(window.navigator, 'userAgent', { value: 'Agent Smith', configurable: true });
      Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: 4, configurable: true });
      Object.defineProperty(window.screen, 'availWidth', { value: 768, configurable: true });
      Object.defineProperty(window.screen, 'availHeight', { value: 1024, configurable: true });

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
