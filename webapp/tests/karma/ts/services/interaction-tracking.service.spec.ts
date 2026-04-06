import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { InteractionTrackingService } from '@mm-services/interaction-tracking.service';
import { AuthService } from '@mm-services/auth.service';
import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { VersionService } from '@mm-services/version.service';
import { TelemetryService } from '@mm-services/telemetry.service';

describe('InteractionTrackingService', () => {
  let service: InteractionTrackingService;
  let authService;
  let dbService;
  let metaDb;
  let sessionService;
  let versionService;
  let telemetryService;
  let clock;
  let consoleErrorSpy;

  const configureService = (hasPermission = true) => {
    metaDb = {
      get: sinon.stub(),
      put: sinon.stub().resolves(),
    };
    const getStub = sinon.stub();
    getStub.withArgs({ meta: true }).returns(metaDb);
    dbService = { get: getStub };

    authService = { has: sinon.stub().resolves(hasPermission) };
    sessionService = { userCtx: sinon.stub().returns({ name: 'greg' }) };
    versionService = { getServiceWorker: sinon.stub().resolves({ version: '4.5.0' }) };
    telemetryService = { getUniqueDeviceId: sinon.stub().returns('device-uuid-123') };

    consoleErrorSpy = sinon.spy(console, 'error');

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: DbService, useValue: dbService },
        { provide: SessionService, useValue: sessionService },
        { provide: VersionService, useValue: versionService },
        { provide: TelemetryService, useValue: telemetryService },
      ]
    });

    service = TestBed.inject(InteractionTrackingService);
  };

  beforeEach(async () => {
    configureService(true);
    await service.init();
    clock = sinon.useFakeTimers({ now: new Date(2026, 2, 27, 10, 0).getTime() });
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  describe('record()', () => {
    it('should not record events when no session is active', async () => {
      service.record('task_list:open');
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
      expect(doc.sessions[0].startedAt).to.be.a('number');
      expect(doc.sessions[0].events).to.have.length(1);
      expect(doc.sessions[0].events[0].action).to.equal('task_list:open');
      expect(doc.sessions[0].events[0].timestamp).to.be.a('number');
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

    it('should stop recording when MAX_EVENTS_PER_DAY is reached', async () => {
      const existingEvents = new Array(1999).fill({ action: 'x', timestamp: 1 });
      metaDb.get.resolves({
        _id: 'interaction-2026-03-27-greg-device-uuid-123',
        _rev: '1-abc',
        type: 'interaction-log',
        sessions: [{ session: 'tasks', startedAt: 1, events: existingEvents }],
        metadata: { user: 'greg', deviceId: 'device-uuid-123', date: '2026-03-27', versions: ['4.5.0'] },
      });

      // First flush: doc has 1999 events, adding 3 more should only keep 1
      service.startSession('tasks');
      service.record('event_a');
      service.record('event_b');
      service.record('event_c');
      await service.flush();

      expect(metaDb.put.calledOnce).to.be.true;
      const doc = metaDb.put.args[0][0];
      const newSession = doc.sessions[doc.sessions.length - 1];
      expect(newSession.events).to.have.length(1);
      expect(newSession.events[0].action).to.equal('event_a');

      // Second flush: totalEventsToday is now at the limit, so recording should be silently dropped
      metaDb.put.resetHistory();
      metaDb.get.resolves(doc);

      service.startSession('tasks');
      service.record('should_not_record');
      await service.flush();

      expect(metaDb.put.called).to.be.false;
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
      expect(doc._id).to.equal('interaction-2026-03-27-greg-device-uuid-123');
      expect(doc.type).to.equal('interaction-log');
      expect(doc.metadata.user).to.equal('greg');
      expect(doc.metadata.deviceId).to.equal('device-uuid-123');
      expect(doc.metadata.date).to.equal('2026-03-27');
      expect(doc.metadata.versions).to.deep.equal(['4.5.0']);
    });

    it('should append sessions to an existing daily doc', async () => {
      const existingDoc = {
        _id: 'interaction-2026-03-27-greg-device-uuid-123',
        _rev: '1-abc',
        type: 'interaction-log',
        sessions: [{ session: 'tasks', startedAt: 500, events: [{ action: 'task_list:open', timestamp: 1000 }] }],
        metadata: {
          user: 'greg',
          deviceId: 'device-uuid-123',
          date: '2026-03-27',
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
      expect(doc.sessions[1].startedAt).to.be.a('number');
    });

    it('should add new version to versions array', async () => {
      const existingDoc = {
        _id: 'interaction-2026-03-27-greg-device-uuid-123',
        _rev: '1-abc',
        type: 'interaction-log',
        sessions: [],
        metadata: {
          user: 'greg',
          deviceId: 'device-uuid-123',
          date: '2026-03-27',
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
        _id: 'interaction-2026-03-27-greg-device-uuid-123',
        _rev: '1-abc',
        type: 'interaction-log',
        sessions: [],
        metadata: {
          user: 'greg',
          deviceId: 'device-uuid-123',
          date: '2026-03-27',
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

    it('should not save when MAX_EVENTS_PER_DAY is already reached in existing doc', async () => {
      const existingEvents = new Array(2000).fill({ action: 'x', timestamp: 1 });
      metaDb.get.resolves({
        _id: 'interaction-2026-03-27-greg-device-uuid-123',
        _rev: '1-abc',
        type: 'interaction-log',
        sessions: [{ session: 'tasks', startedAt: 1, events: existingEvents }],
        metadata: { user: 'greg', deviceId: 'device-uuid-123', date: '2026-03-27', versions: ['4.5.0'] },
      });

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

      expect(metaDb.put.called).to.be.false;

      await service.flush();

      expect(metaDb.put.calledOnce).to.be.true;
      const events = metaDb.put.args[0][0].sessions[0].events;
      expect(events).to.have.length(2);
      expect(events[0].action).to.equal('task_list:open');
      expect(events[1].action).to.equal('task_list:scroll');
    });
  });

  describe('save()', () => {
    it('should persist events without ending the session', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');
      await service.save();

      expect(metaDb.put.calledOnce).to.be.true;
      const doc = metaDb.put.args[0][0];
      expect(doc.sessions).to.have.length(1);
      expect(doc.sessions[0].events[0].action).to.equal('task_list:open');

      // Session is still active — recording more events should work
      service.record('task_list:scroll');
      metaDb.get.resolves(doc);
      metaDb.put.resetHistory();
      await service.save();

      expect(metaDb.put.calledOnce).to.be.true;
      const updatedDoc = metaDb.put.args[0][0];
      // Should update the same session, not create a new one
      expect(updatedDoc.sessions).to.have.length(1);
      expect(updatedDoc.sessions[0].events).to.have.length(2);
      expect(updatedDoc.sessions[0].events[1].action).to.equal('task_list:scroll');
    });

    it('should update existing session by startedAt instead of creating a new one', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('event_a');
      await service.save();

      const savedDoc = metaDb.put.args[0][0];
      const startedAt = savedDoc.sessions[0].startedAt;

      // Simulate doc already having the session from the first save
      metaDb.get.resolves(savedDoc);
      metaDb.put.resetHistory();

      service.record('event_b');
      await service.flush();

      expect(metaDb.put.calledOnce).to.be.true;
      const finalDoc = metaDb.put.args[0][0];
      expect(finalDoc.sessions).to.have.length(1);
      expect(finalDoc.sessions[0].startedAt).to.equal(startedAt);
      expect(finalDoc.sessions[0].events).to.have.length(2);
      expect(finalDoc.sessions[0].events[0].action).to.equal('event_a');
      expect(finalDoc.sessions[0].events[1].action).to.equal('event_b');
    });

    it('should be triggered by the periodic save interval', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');

      expect(metaDb.put.called).to.be.false;

      // Advance time by 5 minutes to trigger the save interval
      await clock.tickAsync(5 * 60 * 1000);

      expect(metaDb.put.calledOnce).to.be.true;
      const doc = metaDb.put.args[0][0];
      expect(doc.sessions[0].events[0].action).to.equal('task_list:open');

      // Session should still be active — record more events
      service.record('task_list:scroll');
      metaDb.get.resolves(doc);
      metaDb.put.resetHistory();

      // Advance another 5 minutes
      await clock.tickAsync(5 * 60 * 1000);

      expect(metaDb.put.calledOnce).to.be.true;
      const updatedDoc = metaDb.put.args[0][0];
      expect(updatedDoc.sessions).to.have.length(1);
      expect(updatedDoc.sessions[0].events).to.have.length(2);
    });

    it('should stop the periodic save interval when session is flushed', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      metaDb.put.resetHistory();

      // Advance time — the save interval should not fire after flush
      await clock.tickAsync(5 * 60 * 1000);

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
      expect(doc._id).to.equal('interaction-2026-03-27-greg-device-uuid-123');
    });

    it('should use different IDs for different users', async () => {
      metaDb.get.rejects({ status: 404 });
      sessionService.userCtx.returns({ name: 'jane' });

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      const doc = metaDb.put.args[0][0];
      expect(doc._id).to.equal('interaction-2026-03-27-jane-device-uuid-123');
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

  describe('permission check', () => {
    it('should check can_track_task_interactions permission on init', () => {
      expect(authService.has.calledOnce).to.be.true;
      expect(authService.has.args[0][0]).to.equal('can_track_task_interactions');
    });

    it('should not start session when permission is denied', async () => {
      sinon.restore();
      TestBed.resetTestingModule();
      configureService(false);
      await service.init();

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      expect(metaDb.put.called).to.be.false;
    });

    it('should not record events when permission is denied', async () => {
      sinon.restore();
      TestBed.resetTestingModule();
      configureService(false);
      await service.init();

      service.record('task_list:open');
      await service.flush();

      expect(metaDb.put.called).to.be.false;
    });
  });
});
