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

  // Fixed local time: 2026-03-27 10:00:00.000 — moment formats to '2026-03-27' in any timezone.
  const NOW = new Date(2026, 2, 27, 10, 0, 0, 0).getTime();

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
    clock = sinon.useFakeTimers(NOW);
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

    it('should record an event with the current session, startedAt, and timestamp', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      expect(metaDb.put.calledOnce).to.be.true;
      const doc = metaDb.put.args[0][0];
      expect(doc.sessions).to.deep.equal([
        {
          session: 'tasks',
          startedAt: NOW,
          events: [{ action: 'task_list:open', timestamp: NOW }],
        },
      ]);
    });

    it('should timestamp each event with the time it was recorded', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');
      await clock.tickAsync(1_000);
      service.record('task_list:scroll');
      await clock.tickAsync(2_500);
      service.record('task:open', 'delivery_report', '4');
      await service.flush();

      const session = metaDb.put.args[0][0].sessions[0];
      expect(session.startedAt).to.equal(NOW);
      expect(session.events).to.deep.equal([
        { action: 'task_list:open', timestamp: NOW },
        { action: 'task_list:scroll', timestamp: NOW + 1_000 },
        { action: 'task:open', timestamp: NOW + 3_500, ref: 'delivery_report', detail: '4' },
      ]);
    });

    it('should record ref and detail when provided', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task:open', 'pregnancy_follow_up', '3');
      await service.flush();

      expect(metaDb.put.args[0][0].sessions[0].events).to.deep.equal([
        { action: 'task:open', timestamp: NOW, ref: 'pregnancy_follow_up', detail: '3' },
      ]);
    });

    it('should not include ref or detail when not provided', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:scroll');
      await service.flush();

      const event = metaDb.put.args[0][0].sessions[0].events[0];
      expect(event).to.deep.equal({ action: 'task_list:scroll', timestamp: NOW });
      expect(event).to.not.have.property('ref');
      expect(event).to.not.have.property('detail');
    });

    it('should deduplicate consecutive events with the same action, ref, and detail', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_group:show', undefined, '5');
      await clock.tickAsync(50);
      service.record('task_group:show', undefined, '5');
      await clock.tickAsync(50);
      service.record('task_group:show', undefined, '5');
      await service.flush();

      const events = metaDb.put.args[0][0].sessions[0].events;
      expect(events).to.deep.equal([
        { action: 'task_group:show', timestamp: NOW, detail: '5' },
      ]);
    });

    it('should not deduplicate events with different ref or detail', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task:open', 'task_a', '0');
      await clock.tickAsync(100);
      service.record('task:open', 'task_b', '1');
      await clock.tickAsync(100);
      service.record('task:open', 'task_b', '1'); // dedup
      await clock.tickAsync(100);
      service.record('task:open', 'task_a', '0');
      await service.flush();

      expect(metaDb.put.args[0][0].sessions[0].events).to.deep.equal([
        { action: 'task:open', timestamp: NOW, ref: 'task_a', detail: '0' },
        { action: 'task:open', timestamp: NOW + 100, ref: 'task_b', detail: '1' },
        { action: 'task:open', timestamp: NOW + 300, ref: 'task_a', detail: '0' },
      ]);
    });

    it('should not deduplicate non-consecutive identical events', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:scroll');
      await clock.tickAsync(100);
      service.record('task:open', 'task_a', '0');
      await clock.tickAsync(100);
      service.record('task_list:scroll');
      await service.flush();

      expect(metaDb.put.args[0][0].sessions[0].events).to.deep.equal([
        { action: 'task_list:scroll', timestamp: NOW },
        { action: 'task:open', timestamp: NOW + 100, ref: 'task_a', detail: '0' },
        { action: 'task_list:scroll', timestamp: NOW + 200 },
      ]);
    });

    it('should stop recording new events after flush reveals daily limit is reached', async () => {
      const existingEvents = new Array(500).fill({ action: 'x', timestamp: 1 });
      metaDb.get.resolves({
        _id: 'interaction-2026-03-27-greg-device-uuid-123',
        _rev: '1-abc',
        type: 'interaction-log',
        sessions: [{ session: 'tasks', startedAt: 1, events: existingEvents }],
        metadata: { user: 'greg', deviceId: 'device-uuid-123', date: '2026-03-27', versions: ['4.5.0'] },
      });

      // First session flushes and discovers the doc already has 500 events
      service.startSession('tasks');
      service.record('event_a');
      await service.flush();

      // totalEventsToday is now updated — new events should be silently dropped
      metaDb.put.resetHistory();

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
      await clock.tickAsync(200);
      service.record('task_list:scroll');
      await service.flush();

      expect(metaDb.put.calledOnce).to.be.true;
      const doc = metaDb.put.args[0][0];
      expect(doc._id).to.equal('interaction-2026-03-27-greg-device-uuid-123');
      expect(doc.type).to.equal('interaction-log');
      expect(doc.metadata).to.deep.equal({
        user: 'greg',
        deviceId: 'device-uuid-123',
        date: '2026-03-27',
        versions: ['4.5.0'],
      });
      expect(doc.sessions).to.deep.equal([
        {
          session: 'tasks',
          startedAt: NOW,
          events: [
            { action: 'task_list:open', timestamp: NOW },
            { action: 'task_list:scroll', timestamp: NOW + 200 },
          ],
        },
      ]);
    });

    it('should append sessions to an existing daily doc', async () => {
      const existingDoc = {
        _id: 'interaction-2026-03-27-greg-device-uuid-123',
        _rev: '1-abc',
        type: 'interaction-log',
        sessions: [{
          session: 'tasks',
          startedAt: NOW - 60_000,
          events: [{ action: 'task_list:open', timestamp: NOW - 60_000 }],
        }],
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
      expect(doc.sessions).to.deep.equal([
        {
          session: 'tasks',
          startedAt: NOW - 60_000,
          events: [{ action: 'task_list:open', timestamp: NOW - 60_000 }],
        },
        {
          session: 'tasks',
          startedAt: NOW,
          events: [{ action: 'task:open', timestamp: NOW, ref: 'delivery_report' }],
        },
      ]);
    });

    it('should add new version to versions array', async () => {
      metaDb.get.resolves({
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
      });

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      expect(metaDb.put.args[0][0].metadata.versions).to.deep.equal(['4.4.0', '4.5.0']);
    });

    it('should not duplicate existing version', async () => {
      metaDb.get.resolves({
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
      });

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      expect(metaDb.put.args[0][0].metadata.versions).to.deep.equal(['4.5.0']);
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
    it('should persist a session keyed by its startedAt', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      const doc = metaDb.put.args[0][0];
      expect(doc.sessions).to.have.length(1);
      expect(doc.sessions[0].session).to.equal('tasks');
      expect(doc.sessions[0].startedAt).to.equal(NOW);
    });

    it('should start a fresh session with a new startedAt after flushing', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      // Advance time so the new session has a different startedAt
      await clock.tickAsync(10_000);

      // The second session needs to see the doc from the first save when flushing
      metaDb.get.resolves(metaDb.put.args[0][0]);

      service.startSession('tasks');
      service.record('task:open', 'delivery');
      await service.flush();

      expect(metaDb.put.calledTwice).to.be.true;
      const secondDoc = metaDb.put.args[1][0];
      expect(secondDoc.sessions).to.deep.equal([
        {
          session: 'tasks',
          startedAt: NOW,
          events: [{ action: 'task_list:open', timestamp: NOW }],
        },
        {
          session: 'tasks',
          startedAt: NOW + 10_000,
          events: [{ action: 'task:open', timestamp: NOW + 10_000, ref: 'delivery' }],
        },
      ]);
    });
  });

  describe('session timeout', () => {
    it('should accumulate events until flush is called', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');
      await clock.tickAsync(3_000);
      service.record('task_list:scroll');

      expect(metaDb.put.called).to.be.false;

      await service.flush();

      expect(metaDb.put.calledOnce).to.be.true;
      const session = metaDb.put.args[0][0].sessions[0];
      expect(session.startedAt).to.equal(NOW);
      expect(session.events).to.deep.equal([
        { action: 'task_list:open', timestamp: NOW },
        { action: 'task_list:scroll', timestamp: NOW + 3_000 },
      ]);
    });
  });

  describe('save()', () => {
    it('should persist events without ending the session', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');
      await service.save();

      expect(metaDb.put.calledOnce).to.be.true;
      let doc = metaDb.put.args[0][0];
      expect(doc.sessions).to.deep.equal([
        {
          session: 'tasks',
          startedAt: NOW,
          events: [{ action: 'task_list:open', timestamp: NOW }],
        },
      ]);

      // Session is still active — recording more events should work
      await clock.tickAsync(1_500);
      service.record('task_list:scroll');
      metaDb.get.resolves(doc);
      metaDb.put.resetHistory();
      await service.save();

      expect(metaDb.put.calledOnce).to.be.true;
      doc = metaDb.put.args[0][0];
      // Same session (same startedAt), events appended
      expect(doc.sessions).to.deep.equal([
        {
          session: 'tasks',
          startedAt: NOW,
          events: [
            { action: 'task_list:open', timestamp: NOW },
            { action: 'task_list:scroll', timestamp: NOW + 1_500 },
          ],
        },
      ]);
    });

    it('should update existing session by startedAt instead of creating a new one', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('event_a');
      await service.save();

      const savedDoc = metaDb.put.args[0][0];
      expect(savedDoc.sessions[0].startedAt).to.equal(NOW);

      // Simulate doc already having the session from the first save
      metaDb.get.resolves(savedDoc);
      metaDb.put.resetHistory();

      await clock.tickAsync(500);
      service.record('event_b');
      await service.flush();

      expect(metaDb.put.calledOnce).to.be.true;
      const finalDoc = metaDb.put.args[0][0];
      expect(finalDoc.sessions).to.deep.equal([
        {
          session: 'tasks',
          startedAt: NOW,
          events: [
            { action: 'event_a', timestamp: NOW },
            { action: 'event_b', timestamp: NOW + 500 },
          ],
        },
      ]);
    });

    it('should be triggered by the periodic save interval', async () => {
      metaDb.get.rejects({ status: 404 });

      service.startSession('tasks');
      service.record('task_list:open');

      expect(metaDb.put.called).to.be.false;

      // Advance time by 5 minutes to trigger the save interval
      await clock.tickAsync(5 * 60 * 1000);

      expect(metaDb.put.calledOnce).to.be.true;
      let doc = metaDb.put.args[0][0];
      expect(doc.sessions).to.deep.equal([
        {
          session: 'tasks',
          startedAt: NOW,
          events: [{ action: 'task_list:open', timestamp: NOW }],
        },
      ]);

      // Session should still be active — record more events
      service.record('task_list:scroll');
      metaDb.get.resolves(doc);
      metaDb.put.resetHistory();

      // Advance another 5 minutes
      await clock.tickAsync(5 * 60 * 1000);

      expect(metaDb.put.calledOnce).to.be.true;
      doc = metaDb.put.args[0][0];
      expect(doc.sessions).to.deep.equal([
        {
          session: 'tasks',
          startedAt: NOW,
          events: [
            { action: 'task_list:open', timestamp: NOW },
            { action: 'task_list:scroll', timestamp: NOW + 5 * 60 * 1000 },
          ],
        },
      ]);
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

      expect(metaDb.put.args[0][0]._id).to.equal('interaction-2026-03-27-greg-device-uuid-123');
    });

    it('should use different IDs for different users', async () => {
      metaDb.get.rejects({ status: 404 });
      sessionService.userCtx.returns({ name: 'jane' });

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      expect(metaDb.put.args[0][0]._id).to.equal('interaction-2026-03-27-jane-device-uuid-123');
    });

    it('should fallback to "unknown" when user is not available', async () => {
      metaDb.get.rejects({ status: 404 });
      sessionService.userCtx.returns({});

      service.startSession('tasks');
      service.record('task_list:open');
      await service.flush();

      expect(metaDb.put.args[0][0]._id).to.equal('interaction-2026-03-27-unknown-device-uuid-123');
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
