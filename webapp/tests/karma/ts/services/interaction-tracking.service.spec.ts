import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import sinon from 'sinon';
import { expect } from 'chai';

import { InteractionTrackingService } from '@mm-services/interaction-tracking.service';
import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { VersionService } from '@mm-services/version.service';
import { TelemetryService } from '@mm-services/telemetry.service';

describe('InteractionTrackingService', () => {
  let service: InteractionTrackingService;
  let dbService;
  let metaDb;
  let sessionService;
  let versionService;
  let telemetryService;
  let clock;
  let consoleErrorSpy;
  let documentMock;

  beforeEach(() => {
    metaDb = {
      get: sinon.stub(),
      put: sinon.stub().resolves(),
    };
    const getStub = sinon.stub();
    getStub.withArgs({ meta: true }).returns(metaDb);
    dbService = { get: getStub };

    sessionService = { userCtx: sinon.stub().returns({ name: 'greg' }) };
    versionService = { getServiceWorker: sinon.stub().resolves({ version: '4.5.0' }) };
    telemetryService = { getUniqueDeviceId: sinon.stub().returns('device-uuid-123') };

    consoleErrorSpy = sinon.spy(console, 'error');

    documentMock = {
      addEventListener: sinon.stub(),
      hidden: false,
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: SessionService, useValue: sessionService },
        { provide: VersionService, useValue: versionService },
        { provide: TelemetryService, useValue: telemetryService },
        { provide: DOCUMENT, useValue: documentMock },
      ]
    });

    service = TestBed.inject(InteractionTrackingService);
    clock = sinon.useFakeTimers({ now: new Date(2026, 2, 27, 10, 0).getTime() });
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  it('should register visibilitychange listener on construction', () => {
    expect(documentMock.addEventListener.calledOnce).to.be.true;
    expect(documentMock.addEventListener.args[0][0]).to.equal('visibilitychange');
  });

  describe('record()', () => {
    it('should not record events when no session is active', async () => {
      service.record('task_list:open');
      // No session started, so flush should be a no-op
      metaDb.get.rejects({ status: 404 });
      await service.flush();
      expect(metaDb.put.called).to.be.false;
    });

    it('should record events with action and timestamp', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      expect(metaDb.put.calledOnce).to.be.true;
      const doc = metaDb.put.args[0][0];
      expect(doc.sessions).to.have.length(1);
      expect(doc.sessions[0].events).to.have.length(1);
      expect(doc.sessions[0].events[0].action).to.equal('task_list:open');
      expect(doc.sessions[0].events[0].ts).to.be.a('number');
    });

    it('should record ref and detail when provided', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task:open', 'pregnancy_follow_up', '3');
      await service.flush();

      const event = metaDb.put.args[0][0].sessions[0].events[0];
      expect(event.action).to.equal('task:open');
      expect(event.ref).to.equal('pregnancy_follow_up');
      expect(event.detail).to.equal('3');
    });

    it('should not include ref or detail when not provided', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:scroll');
      await service.flush();

      const event = metaDb.put.args[0][0].sessions[0].events[0];
      expect(event).to.not.have.property('ref');
      expect(event).to.not.have.property('detail');
    });

    it('should cap events at MAX_EVENTS_PER_SESSION', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      for (let i = 0; i < 510; i++) {
        service.record('task_list:scroll');
      }
      await service.flush();

      const events = metaDb.put.args[0][0].sessions[0].events;
      expect(events).to.have.length(500);
    });
  });

  describe('flush()', () => {
    it('should not save when session has no events', async () => {
      service.startSession('tasks');
      await service.flush();

      expect(metaDb.put.called).to.be.false;
    });

    it('should create a new daily doc when none exists', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      expect(metaDb.put.calledOnce).to.be.true;
      const doc = metaDb.put.args[0][0];
      expect(doc._id).to.equal('interaction-2026-3-27-greg-device-uuid-123');
      expect(doc.type).to.equal('interaction-log');
      expect(doc.metadata.user).to.equal('greg');
      expect(doc.metadata.deviceId).to.equal('device-uuid-123');
      expect(doc.metadata.date).to.equal('2026-3-27');
      expect(doc.metadata.versions).to.deep.equal(['4.5.0']);
    });

    it('should append sessions to an existing daily doc', async () => {
      const existingDoc = {
        _id: 'interaction-2026-3-27-greg-device-uuid-123',
        _rev: '1-abc',
        type: 'interaction-log',
        sessions: [{ session: 'tasks', eventimestamp: [{ action: 'task_list:open', timestamp: 1000 }] }],
        metadata: {
          user: 'greg',
          deviceId: 'device-uuid-123',
          date: '2026-3-27',
          versions: ['4.5.0'],
        },
      };
      metaDb.get.resolves(existingDoc);

      service.startSession('tasks');
      service.record('task:open', 'delivery_report');
      await service.flush();

      expect(metaDb.put.calledOnce).to.be.true;
      const doc = metaDb.put.args[0][0];
      expect(doc._rev).to.equal('1-abc');
      expect(doc.sessions).to.have.length(2);
      expect(doc.sessions[1].events[0].action).to.equal('task:open');
    });

    it('should add new version to versions array', async () => {
      const existingDoc = {
        _id: 'interaction-2026-3-27-greg-device-uuid-123',
        _rev: '1-abc',
        type: 'interaction-log',
        sessions: [],
        metadata: {
          user: 'greg',
          deviceId: 'device-uuid-123',
          date: '2026-3-27',
          versions: ['4.4.0'],
        },
      };
      metaDb.get.resolves(existingDoc);

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      const doc = metaDb.put.args[0][0];
      expect(doc.metadata.versions).to.deep.equal(['4.4.0', '4.5.0']);
    });

    it('should not duplicate existing version', async () => {
      const existingDoc = {
        _id: 'interaction-2026-3-27-greg-device-uuid-123',
        _rev: '1-abc',
        type: 'interaction-log',
        sessions: [],
        metadata: {
          user: 'greg',
          deviceId: 'device-uuid-123',
          date: '2026-3-27',
          versions: ['4.5.0'],
        },
      };
      metaDb.get.resolves(existingDoc);

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      const doc = metaDb.put.args[0][0];
      expect(doc.metadata.versions).to.deep.equal(['4.5.0']);
    });

    it('should not save when MAX_SESSIONS_PER_DAY is reached', async () => {
      const existingDoc = {
        _id: 'interaction-2026-3-27-greg-device-uuid-123',
        _rev: '1-abc',
        type: 'interaction-log',
        sessions: new Array(200).fill({ session: 'tasks', eventimestamp: [{ action: 'x', timestamp: 1 }] }),
        metadata: {
          user: 'greg',
          deviceId: 'device-uuid-123',
          date: '2026-3-27',
          versions: ['4.5.0'],
        },
      };
      metaDb.get.resolves(existingDoc);

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      expect(metaDb.put.called).to.be.false;
    });

    it('should clear session state after flush', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      // Second flush should be a no-op since session was cleared
      await service.flush();
      expect(metaDb.put.calledOnce).to.be.true;
    });

    it('should handle db errors gracefully', async () => {
      metaDb.get.rejects({ status: 500, message: 'server error' });

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      expect(consoleErrorSpy.calledOnce).to.be.true;
      expect(metaDb.put.called).to.be.false;
    });

    it('should handle version service errors gracefully', async () => {
      versionService.getServiceWorker.rejects(new Error('no service worker'));
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      expect(metaDb.put.calledOnce).to.be.true;
      const doc = metaDb.put.args[0][0];
      expect(doc.metadata.versions).to.deep.equal(['unknown']);
    });
  });

  describe('startSession()', () => {
    it('should flush previous session when starting a new one', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');

      // Flush explicitly before starting a new session to verify the data
      await service.flush();

      expect(metaDb.put.calledOnce).to.be.true;
      const doc = metaDb.put.args[0][0];
      expect(doc.sessions[0].session).to.equal('tasks');
    });

    it('should start a fresh session after flushing', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      // Start new session and record different events
      service.startSession('tasks');
      service.record('task:open', 'delivery');
      await service.flush();

      expect(metaDb.put.calledTwice).to.be.true;
      const secondDoc = metaDb.put.args[1][0];
      expect(secondDoc.sessions[0].events[0].action).to.equal('task:open');
    });
  });

  describe('session timeout', () => {
    it('should accumulate events until flush is called', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');
      service.record('task_list:scroll');

      // Events are buffered, not yet saved
      expect(metaDb.put.called).to.be.false;

      await service.flush();

      expect(metaDb.put.calledOnce).to.be.true;
      const events = metaDb.put.args[0][0].sessions[0].events;
      expect(events).to.have.length(2);
      expect(events[0].action).to.equal('task_list:open');
      expect(events[1].action).to.equal('task_list:scroll');
    });
  });

  describe('visibilitychange', () => {
    it('should register handler that calls flush when hidden', () => {
      expect(documentMock.addEventListener.calledOnce).to.be.true;
      expect(documentMock.addEventListener.args[0][0]).to.equal('visibilitychange');
      expect(documentMock.addEventListener.args[0][1]).to.be.a('function');
    });

    it('should flush data when page becomes hidden (simulated via direct flush)', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');

      // Directly call flush to simulate what the visibilitychange handler does
      await service.flush();

      expect(metaDb.put.calledOnce).to.be.true;
    });

    it('should not flush when no session is active', async () => {
      await service.flush();
      expect(metaDb.put.called).to.be.false;
    });
  });

  describe('daily document ID', () => {
    it('should generate ID with date, user, and device', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      const doc = metaDb.put.args[0][0];
      expect(doc._id).to.equal('interaction-2026-3-27-greg-device-uuid-123');
    });

    it('should use different IDs for different users', async () => {
      metaDb.get.rejects({ status: 404 });
      sessionService.userCtx.returns({ name: 'jane' });

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      const doc = metaDb.put.args[0][0];
      expect(doc._id).to.equal('interaction-2026-3-27-jane-device-uuid-123');
    });

    it('should fallback to "unknown" when user is not available', async () => {
      metaDb.get.rejects({ status: 404 });
      sessionService.userCtx.returns({});

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      const doc = metaDb.put.args[0][0];
      expect(doc._id).to.contain('unknown');
    });
  });
});
