import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import sinon from 'sinon';
import { expect } from 'chai';

import { InteractionTrackingService } from '@mm-services/interaction-tracking.service';
import { AuthService } from '@mm-services/auth.service';
import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { VersionService } from '@mm-services/version.service';
import { TelemetryService } from '@mm-services/telemetry.service';

describe('InteractionTrackingService', () => {
  const NOW = new Date(2026, 2, 27, 10, 0, 0, 0).getTime();

  let service: InteractionTrackingService;
  let authService;
  let dbService;
  let metaDb;
  let sessionService;
  let versionService;
  let telemetryService;
  let mockDatabases;
  let windowMock;
  let clock;
  let consoleErrorSpy;

  let pouchInstances: Map<string, any>;

  const makeDbStub = (overrides: any = {}) => ({
    info: sinon.stub().resolves({ doc_count: 0 }),
    bulkDocs: sinon.stub().resolves([{ ok: true }]),
    allDocs: sinon.stub().resolves({ rows: [] }),
    destroy: sinon.stub().resolves(),
    close: sinon.stub(),
    ...overrides,
  });

  const seedDb = (name: string, stub: any) => pouchInstances.set(name, stub);

  const configureService = (hasPermission = true) => {
    pouchInstances = new Map();
    metaDb = { put: sinon.stub().resolves() };
    const getStub = sinon.stub();
    getStub.withArgs({ meta: true }).returns(metaDb);
    dbService = { get: getStub };

    authService = { has: sinon.stub().resolves(hasPermission) };
    sessionService = { userCtx: sinon.stub().returns({ name: 'greg' }) };
    versionService = { getServiceWorker: sinon.stub().resolves({ version: '4.5.0' }) };
    telemetryService = { getUniqueDeviceId: sinon.stub().returns('device-uuid-123') };

    consoleErrorSpy = sinon.spy(console, 'error');

    mockDatabases = sinon.stub().resolves([]);
    windowMock = {
      PouchDB: sinon.stub().callsFake((dbName: string) => {
        let stub = pouchInstances.get(dbName);
        if (!stub) {
          stub = makeDbStub();
          pouchInstances.set(dbName, stub);
        }
        return stub;
      }),
      indexedDB: { databases: mockDatabases },
    };

    const documentMock = { defaultView: windowMock };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: DbService, useValue: dbService },
        { provide: SessionService, useValue: sessionService },
        { provide: VersionService, useValue: versionService },
        { provide: TelemetryService, useValue: telemetryService },
        { provide: DOCUMENT, useValue: documentMock },
      ]
    });

    service = TestBed.inject(InteractionTrackingService);
  };

  const todayDb = () => pouchInstances.get('interaction-2026-03-27-greg');

  beforeEach(() => {
    configureService(true);
    clock = sinon.useFakeTimers(NOW);
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  describe('init()', () => {
    it('enables tracking and initializes per-day state when permission is granted', async () => {
      await service.init();

      expect(authService.has.calledOnce).to.be.true;
      expect(authService.has.args[0][0]).to.equal('can_track_task_interactions');

      expect((service as any).enabled).to.be.true;
      expect((service as any).user).to.equal('greg');

      expect((service as any).currentDayKey).to.equal('2026-03-27');
      expect((service as any).persistedEventCount).to.equal(0);

      expect((service as any).currentSession).to.be.null;
      expect((service as any).sessionStartedAt).to.be.null;
      expect((service as any).lastEventKey).to.be.null;
      expect((service as any).buffer).to.deep.equal([]);
    });

    it('aggregates abandoned non-today DBs at boot', async () => {
      mockDatabases.resolves([
        { name: '_pouch_interaction-2026-03-25-greg' },
        { name: '_pouch_interaction-2026-03-26-greg' },
      ]);
      seedDb('interaction-2026-03-25-greg', makeDbStub({
        allDocs: sinon.stub().resolves({
          rows: [{ doc: { action: 'a', timestamp: 1, session: 'tasks', sessionStartedAt: 0 } }],
        }),
      }));
      seedDb('interaction-2026-03-26-greg', makeDbStub({
        allDocs: sinon.stub().resolves({
          rows: [{ doc: { action: 'b', timestamp: 2, session: 'tasks', sessionStartedAt: 0 } }],
        }),
      }));

      await service.init();

      // Two aggregate docs, one per pre-existing day-DB. Ordering of findInteractionDbs
      // is not guaranteed, so use deep.members.
      expect(metaDb.put.args.map(args => args[0])).to.have.deep.members([
        {
          _id: 'interaction-2026-03-25-greg-device-uuid-123',
          type: 'interaction-log',
          sessions: [{
            session: 'tasks',
            startedAt: 0,
            events: [{ action: 'a', timestamp: 1 }],
          }],
          metadata: {
            user: 'greg',
            deviceId: 'device-uuid-123',
            date: '2026-03-25',
            version: '4.5.0',
          },
        },
        {
          _id: 'interaction-2026-03-26-greg-device-uuid-123',
          type: 'interaction-log',
          sessions: [{
            session: 'tasks',
            startedAt: 0,
            events: [{ action: 'b', timestamp: 2 }],
          }],
          metadata: {
            user: 'greg',
            deviceId: 'device-uuid-123',
            date: '2026-03-26',
            version: '4.5.0',
          },
        },
      ]);
    });

    it('seeds today\'s count from db.info() so the cap survives reloads', async () => {
      seedDb('interaction-2026-03-27-greg', makeDbStub({ info: sinon.stub().resolves({ doc_count: 500 }) }));

      await service.init();

      // Now at the cap before any record. Subsequent records should be dropped.
      service.startSession('tasks');
      service.record('overflow');
      await service.persistBuffer();

      expect(todayDb().bulkDocs.called).to.be.false;
    });

    it('snapshots the user at init() so subsequent userCtx changes do not affect persistence', async () => {
      // Init under user 'greg'.
      await service.init();

      // Auth context flips mid-run (e.g., session expiry race, automation in-page swap).
      sessionService.userCtx.returns({ name: 'jane' });

      service.startSession('tasks');
      service.record('e1');
      await service.persistBuffer();

      // The day-DB used for the write must be greg's, not jane's.
      expect(windowMock.PouchDB.calledWith('interaction-2026-03-27-greg')).to.be.true;
      expect(windowMock.PouchDB.calledWith('interaction-2026-03-27-jane')).to.be.false;
    });

    it('does not enable tracking if the auth check rejects', async () => {
      authService.has.rejects(new Error('auth service unreachable'));
      const warn = sinon.stub(console, 'warn');

      await service.init();

      expect(warn.calledOnceWith('Interaction tracking disabled', sinon.match.instanceOf(Error))).to.be.true;
      expect(warn.firstCall.args[1].message).to.equal('auth service unreachable');
      expect((service as any).enabled).to.be.false;
      expect((service as any).user).to.be.undefined;
      expect((service as any).currentDayKey).to.be.null;
    });

    it('leaves state unset and silently no-ops when permission is denied', async () => {
      authService.has.resolves(false);
      mockDatabases.resolves([{ name: '_pouch_interaction-2026-03-25-greg' }]);

      await service.init();

      expect((service as any).enabled).to.be.false;
      expect((service as any).user).to.be.undefined;
      expect((service as any).currentDayKey).to.be.null;
      expect((service as any).persistedEventCount).to.equal(0);

      service.startSession('tasks');
      service.record('e1');
      await service.persistBuffer();

      expect((service as any).currentSession).to.be.null;
      expect((service as any).buffer).to.deep.equal([]);
      expect(metaDb.put.called).to.be.false;
      expect(windowMock.PouchDB.calledWith('interaction-2026-03-27-greg')).to.be.false;
    });
  });

  describe('record() — buffering', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('does nothing when no session is active', async () => {
      service.record('task_list:open');
      await service.persistBuffer();
      expect(todayDb().bulkDocs.called).to.be.false;
    });

    it('buffers events without writing to disk', () => {
      service.startSession('tasks');
      service.record('e1');
      service.record('e2');
      service.record('e3');

      expect(todayDb().bulkDocs.called).to.be.false;
    });

    it('persists the buffer in a single bulkDocs on persistBuffer()', async () => {
      service.startSession('tasks');
      service.record('task_list:open');
      service.record('task_list:scroll');
      service.record('task:open', 'pregnancy_visit', '3');

      await service.persistBuffer();

      expect(todayDb().bulkDocs.calledOnce).to.be.true;
      expect(todayDb().bulkDocs.args[0][0]).to.deep.equal([
        {
          action: 'task_list:open',
          timestamp: NOW,
          session: 'tasks',
          sessionStartedAt: NOW,
        },
        {
          action: 'task_list:scroll',
          timestamp: NOW,
          session: 'tasks',
          sessionStartedAt: NOW,
        },
        {
          action: 'task:open',
          timestamp: NOW,
          ref: 'pregnancy_visit',
          detail: '3',
          session: 'tasks',
          sessionStartedAt: NOW,
        },
      ]);
    });

    it('clears the buffer after a successful persist', async () => {
      service.startSession('tasks');
      service.record('e1');
      await service.persistBuffer();
      expect(todayDb().bulkDocs.callCount).to.equal(1);

      await service.persistBuffer();
      expect(todayDb().bulkDocs.callCount).to.equal(1);
    });

    it('persists automatically when the buffer threshold (50) is reached', async () => {
      service.startSession('tasks');
      for (let i = 0; i < 50; i++) {
        service.record(`event_${i}`);
      }
      await Promise.resolve();
      await Promise.resolve();

      expect(todayDb().bulkDocs.calledOnce).to.be.true;
      expect(todayDb().bulkDocs.args[0][0]).to.have.length(50);
    });

    it('records ref and detail when provided, omits when not', async () => {
      service.startSession('tasks');
      service.record('a', 'r', 'd');
      service.record('b'); // no ref/detail
      await service.persistBuffer();

      const docs = todayDb().bulkDocs.args[0][0];
      expect(docs[0]).to.include({ ref: 'r', detail: 'd' });
      expect(docs[1]).to.not.have.property('ref');
      expect(docs[1]).to.not.have.property('detail');
    });

    it('deduplicates consecutive identical events', async () => {
      service.startSession('tasks');
      service.record('task_group:show', undefined, '5');
      service.record('task_group:show', undefined, '5');
      service.record('task_group:show', undefined, '5');
      await service.persistBuffer();

      // Only the first event lands; the two duplicates are dropped silently.
      expect(todayDb().bulkDocs.args[0][0]).to.deep.equal([
        {
          action: 'task_group:show',
          timestamp: NOW,
          detail: '5',
          session: 'tasks',
          sessionStartedAt: NOW,
        },
      ]);
    });

    it('does not deduplicate events with different ref or detail', async () => {
      service.startSession('tasks');
      service.record('task:open', 'task_a', '0');
      service.record('task:open', 'task_b', '1');
      service.record('task:open', 'task_b', '1'); // dedup of the previous one
      service.record('task:open', 'task_a', '0'); // not a dedup — non-consecutive
      await service.persistBuffer();

      expect(todayDb().bulkDocs.args[0][0]).to.deep.equal([
        {
          action: 'task:open',
          timestamp: NOW,
          ref: 'task_a',
          detail: '0',
          session: 'tasks',
          sessionStartedAt: NOW,
        },
        {
          action: 'task:open',
          timestamp: NOW,
          ref: 'task_b',
          detail: '1',
          session: 'tasks',
          sessionStartedAt: NOW,
        },
        {
          action: 'task:open',
          timestamp: NOW,
          ref: 'task_a',
          detail: '0',
          session: 'tasks',
          sessionStartedAt: NOW,
        },
      ]);
    });

    it('records timestamps reflecting the time each event was buffered', async () => {
      service.startSession('tasks');
      service.record('a');
      await clock.tickAsync(1_000);
      service.record('b');
      await clock.tickAsync(2_500);
      service.record('c');
      await service.persistBuffer();

      expect(todayDb().bulkDocs.args[0][0]).to.deep.equal([
        { action: 'a', timestamp: NOW, session: 'tasks', sessionStartedAt: NOW },
        { action: 'b', timestamp: NOW + 1_000, session: 'tasks', sessionStartedAt: NOW },
        { action: 'c', timestamp: NOW + 3_500, session: 'tasks', sessionStartedAt: NOW },
      ]);
    });

    it('treats empty-string ref and detail the same as missing values', async () => {
      service.startSession('tasks');
      service.record('a', '', '');
      service.record('a', '', '');             // dedup vs previous
      service.record('a', undefined, undefined); // also a dedup — empty string and undefined collapse equally
      await service.persistBuffer();

      expect(todayDb().bulkDocs.args[0][0]).to.deep.equal([
        { action: 'a', timestamp: NOW, session: 'tasks', sessionStartedAt: NOW },
      ]);
    });

    it('startSession called twice without endSession mixes prior buffered events with the new session', async () => {
      // First session
      service.startSession('tasks');
      service.record('a1');
      service.record('a2');

      // Second startSession overrides session/sessionStartedAt but does not drain the
      // buffer. Events recorded BEFORE the override keep the OLD sessionStartedAt;
      // events recorded AFTER carry the NEW one. All land in the same persist.
      await clock.tickAsync(5_000);
      service.startSession('tasks');
      service.record('b1');
      await service.persistBuffer();

      expect(todayDb().bulkDocs.args[0][0]).to.deep.equal([
        { action: 'a1', timestamp: NOW, session: 'tasks', sessionStartedAt: NOW },
        { action: 'a2', timestamp: NOW, session: 'tasks', sessionStartedAt: NOW },
        { action: 'b1', timestamp: NOW + 5_000, session: 'tasks', sessionStartedAt: NOW + 5_000 },
      ]);
    });

    it('handles bulkDocs errors gracefully and clears the buffer', async () => {
      const failingDb = makeDbStub({ bulkDocs: sinon.stub().rejects(new Error('IDB write failed')) });
      seedDb('interaction-2026-03-27-greg', failingDb);

      service.startSession('tasks');
      service.record('e1');
      await service.persistBuffer();

      expect(consoleErrorSpy.called).to.be.true;
      // Buffer is cleared even on failure (events were already snapshotted).
      // A subsequent persist with an empty buffer is a no-op.
      failingDb.bulkDocs.resetHistory();
      await service.persistBuffer();
      expect(failingDb.bulkDocs.called).to.be.false;
    });
  });

  describe('endSession()', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('persists buffered events on session end', async () => {
      service.startSession('tasks');
      service.record('a');
      service.record('b');

      await service.endSession();

      expect(todayDb().bulkDocs.calledOnce).to.be.true;
      expect(todayDb().bulkDocs.args[0][0]).to.have.length(2);
    });

    it('disables further recording until the next startSession', async () => {
      service.startSession('tasks');
      service.record('a');
      await service.endSession();

      service.record('b'); // no session active — must be dropped
      await service.persistBuffer();

      expect(todayDb().bulkDocs.callCount).to.equal(1);
      expect(todayDb().bulkDocs.args[0][0]).to.deep.equal([
        { action: 'a', timestamp: NOW, session: 'tasks', sessionStartedAt: NOW },
      ]);
    });

    it('starts a fresh sessionStartedAt on the next startSession', async () => {
      // First session at NOW with two events.
      service.startSession('tasks');
      service.record('e1');
      await clock.tickAsync(500);
      service.record('e2');
      await service.endSession();

      // Gap, then second session — its own startedAt and its own pair of events.
      await clock.tickAsync(10_000);
      service.startSession('tasks');
      service.record('e3');
      await clock.tickAsync(750);
      service.record('e4');
      await service.endSession();

      expect(todayDb().bulkDocs.args).to.deep.equal([
        [[
          { action: 'e1', timestamp: NOW, session: 'tasks', sessionStartedAt: NOW },
          { action: 'e2', timestamp: NOW + 500, session: 'tasks', sessionStartedAt: NOW },
        ]],
        [[
          { action: 'e3', timestamp: NOW + 10_500, session: 'tasks', sessionStartedAt: NOW + 10_500 },
          { action: 'e4', timestamp: NOW + 11_250, session: 'tasks', sessionStartedAt: NOW + 10_500 },
        ]],
      ]);
    });
  });

  describe('cap', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('stops accepting events at MAX_EVENTS_PER_DAY (across buffer + persisted)', async () => {
      service.startSession('tasks');
      const countStoredEvents = () => todayDb().bulkDocs.args.reduce((sum, args) => sum + args[0].length, 0);

      // 100 records: 50 trigger threshold persist, then 50 more buffered.
      for (let i = 0; i < 100; i++) {
        service.record(`e_${i}`);
      }
      await service.persistBuffer();
      await Promise.resolve();
      // Now ~100 events on disk. Add 400 more to reach 500.
      for (let i = 100; i < 500; i++) {
        service.record(`e_${i}`);
      }
      await service.persistBuffer();
      await Promise.resolve();

      // Try to overflow — single record after the cap.
      service.record('overflow_1');
      await service.persistBuffer();
      expect(countStoredEvents()).to.equal(500);

      // Try harder: many records in a row, all should be silently dropped.
      for (let i = 0; i < 200; i++) {
        service.record(`overflow_burst_${i}`);
      }
      await service.persistBuffer();
      expect(countStoredEvents()).to.equal(500);

      // Try to bypass via time: tick forward (still same day), then more records.
      await clock.tickAsync(60 * 60 * 1000); // 1h, still 2026-03-27
      service.record('overflow_after_wait_1');
      service.record('overflow_after_wait_2');
      await service.persistBuffer();
      expect(countStoredEvents()).to.equal(500);

      // Try to bypass via session lifecycle: end + start a new session, record again.
      // The cap is per-day, not per-session — a new session must not reset it.
      await service.endSession();
      service.startSession('tasks');
      service.record('overflow_new_session_1');
      service.record('overflow_new_session_2');
      service.record('overflow_new_session_3');
      await service.persistBuffer();
      expect(countStoredEvents()).to.equal(500);

      // Sanity: the original 500 events are exactly what's on disk; no overflow_* leaked.
      const allWritten = todayDb().bulkDocs.args.flatMap(args => args[0]);
      const overflowWritten = allWritten.filter(d => d.action.startsWith('overflow_'));
      expect(overflowWritten).to.have.length(0);
    });
  });

  describe('cross-midnight bucketing', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('events recorded before midnight land in yesterday\'s DB even when persisted after', async () => {
      service.startSession('tasks');
      service.record('yesterday_event'); // recorded under 2026-03-27

      await clock.tickAsync(15 * 60 * 60 * 1000); // 15h → 2026-03-28 01:00

      service.record('today_event');
      await service.persistBuffer();

      const yesterdayDb = pouchInstances.get('interaction-2026-03-27-greg');
      const todayDbInstance = pouchInstances.get('interaction-2026-03-28-greg');
      expect(yesterdayDb.bulkDocs.calledOnce).to.be.true;
      expect(yesterdayDb.bulkDocs.args[0][0]).to.have.length(1);
      expect(yesterdayDb.bulkDocs.args[0][0][0].action).to.equal('yesterday_event');

      expect(todayDbInstance.bulkDocs.calledOnce).to.be.true;
      expect(todayDbInstance.bulkDocs.args[0][0]).to.have.length(1);
      expect(todayDbInstance.bulkDocs.args[0][0][0].action).to.equal('today_event');
    });

    it('auto-persists buffered events when the date changes mid-session', async () => {
      service.startSession('tasks');
      service.record('a');
      service.record('b');
      service.record('c');

      // Cross midnight; buffer still holds three yesterday-tagged events
      await clock.tickAsync(15 * 60 * 60 * 1000);
      const yesterdayDb = pouchInstances.get('interaction-2026-03-27-greg');
      expect(yesterdayDb.bulkDocs.called).to.be.false;

      // The first record() of the new day triggers a persist of yesterday's buffered events
      service.record('d');
      await Promise.resolve();
      await Promise.resolve();

      expect(yesterdayDb.bulkDocs.calledOnce).to.be.true;
      expect(yesterdayDb.bulkDocs.args[0][0]).to.deep.equal([
        { action: 'a', timestamp: NOW, session: 'tasks', sessionStartedAt: NOW },
        { action: 'b', timestamp: NOW, session: 'tasks', sessionStartedAt: NOW },
        { action: 'c', timestamp: NOW, session: 'tasks', sessionStartedAt: NOW },
      ]);

      // Today's buffer still holds 'd' — its day-DB hasn't been opened yet.
      expect(pouchInstances.has('interaction-2026-03-28-greg')).to.be.false;
    });

    it('respects the per-day cap when yesterday\'s buffer drains across midnight', async () => {
      (service as any).persistedEventCount = 480;

      service.startSession('tasks');

      // Record 25 events — only 20 should fit (480 + 20 = 500)
      for (let i = 0; i < 25; i++) {
        service.record(`yesterday_${i}`);
      }
      expect((service as any).buffer).to.have.length(20);

      // Cross midnight without persisting first.
      await clock.tickAsync(15 * 60 * 60 * 1000);

      // First record of the new day triggers the rollover persist of yesterday's events to yesterday's DB
      service.record('today_event');
      await service.persistBuffer();

      const yesterdayDb = pouchInstances.get('interaction-2026-03-27-greg');
      const todayDbInstance = pouchInstances.get('interaction-2026-03-28-greg');

      expect(yesterdayDb.bulkDocs.calledOnce).to.be.true;
      expect(yesterdayDb.bulkDocs.args[0][0]).to.have.length(20);
      expect(yesterdayDb.bulkDocs.args[0][0].map(d => d.action)).to.deep.equal(
        Array.from({ length: 20 }, (_, i) => `yesterday_${i}`)
      );

      expect(todayDbInstance.bulkDocs.calledOnce).to.be.true;
      expect(todayDbInstance.bulkDocs.args[0][0]).to.deep.equal([
        { action: 'today_event', timestamp: NOW + 15 * 60 * 60 * 1000,
          session: 'tasks', sessionStartedAt: NOW },
      ]);
    });
  });

  describe('aggregation (init only)', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('does not aggregate other users\' DBs', async () => {
      mockDatabases.resolves([
        { name: '_pouch_interaction-2026-03-26-greg' },
        { name: '_pouch_interaction-2026-03-26-alice' },
        { name: '_pouch_interaction-2026-03-26-bob-jones' },
      ]);
      seedDb('interaction-2026-03-26-greg', makeDbStub({
        allDocs: sinon.stub().resolves({
          rows: [{ doc: { action: 'g', timestamp: 1, session: 'tasks', sessionStartedAt: 0 } }],
        }),
      }));
      const aliceDb = makeDbStub();
      const bobDb = makeDbStub();
      seedDb('interaction-2026-03-26-alice', aliceDb);
      seedDb('interaction-2026-03-26-bob-jones', bobDb);

      await service.init();

      expect(aliceDb.allDocs.called).to.be.false;
      expect(bobDb.allDocs.called).to.be.false;

      expect(metaDb.put.args).to.deep.equal([[{
        _id: 'interaction-2026-03-26-greg-device-uuid-123',
        type: 'interaction-log',
        sessions: [{
          session: 'tasks',
          startedAt: 0,
          events: [{ action: 'g', timestamp: 1 }],
        }],
        metadata: {
          user: 'greg',
          deviceId: 'device-uuid-123',
          date: '2026-03-26',
          version: '4.5.0',
        },
      }]]);
    });

    it('handles 409 conflicts on aggregate put and still destroys the source DB', async () => {
      mockDatabases.resolves([{ name: '_pouch_interaction-2026-03-26-greg' }]);
      const oldDb = makeDbStub({
        allDocs: sinon.stub().resolves({
          rows: [{ doc: { action: 'a', timestamp: 1, session: 'tasks', sessionStartedAt: 0 } }],
        }),
      });
      seedDb('interaction-2026-03-26-greg', oldDb);

      metaDb.put.onFirstCall().rejects({ status: 409 });
      metaDb.put.onSecondCall().resolves();

      await service.init();

      expect(metaDb.put.calledTwice).to.be.true;
      expect(metaDb.put.args[1][0]._id).to.match(
        /^interaction-2026-03-26-greg-device-uuid-123-conflicted-\d+$/
      );
      expect(metaDb.put.args[1][0].metadata.conflicted).to.equal(true);
      expect(oldDb.destroy.calledOnce).to.be.true;
    });

    it('logs and continues if one DB\'s aggregation fails', async () => {
      mockDatabases.resolves([
        { name: '_pouch_interaction-2026-03-25-greg' },
        { name: '_pouch_interaction-2026-03-26-greg' },
      ]);
      const failingDb = makeDbStub({ allDocs: sinon.stub().rejects(new Error('IDB read failed')) });
      const okDb = makeDbStub({
        allDocs: sinon.stub().resolves({
          rows: [{ doc: { action: 'o', timestamp: 1, session: 'tasks', sessionStartedAt: 0 } }],
        }),
      });
      seedDb('interaction-2026-03-25-greg', failingDb);
      seedDb('interaction-2026-03-26-greg', okDb);

      await service.init();

      expect(consoleErrorSpy.called).to.be.true;
      expect(okDb.destroy.calledOnce).to.be.true;
      expect(metaDb.put.calledOnce).to.be.true;
    });

    it('groups events into per-session entries sorted by startedAt and timestamp', async () => {
      // Yesterday's DB contains events from two sessions, written to disk
      // out of both startedAt and timestamp order.
      mockDatabases.resolves([{ name: '_pouch_interaction-2026-03-26-greg' }]);
      seedDb('interaction-2026-03-26-greg', makeDbStub({
        allDocs: sinon.stub().resolves({
          rows: [
            // Session B (startedAt=100), event at ts=200 written before its own ts=150
            { doc: { action: 'b2', timestamp: 200, session: 'tasks', sessionStartedAt: 100 } },
            { doc: { action: 'b1', timestamp: 150, session: 'tasks', sessionStartedAt: 100 } },
            // Session A (startedAt=50, earlier than B), also out of timestamp order
            { doc: { action: 'a2', timestamp: 80, session: 'tasks', sessionStartedAt: 50 } },
            { doc: { action: 'a1', timestamp: 60, session: 'tasks', sessionStartedAt: 50 } },
          ],
        }),
      }));

      await service.init();

      expect(metaDb.put.args).to.deep.equal([[{
        _id: 'interaction-2026-03-26-greg-device-uuid-123',
        type: 'interaction-log',
        sessions: [
          // Session A first (smaller startedAt); events sorted by timestamp.
          {
            session: 'tasks',
            startedAt: 50,
            events: [
              { action: 'a1', timestamp: 60 },
              { action: 'a2', timestamp: 80 },
            ],
          },
          // Session B second; events sorted by timestamp.
          {
            session: 'tasks',
            startedAt: 100,
            events: [
              { action: 'b1', timestamp: 150 },
              { action: 'b2', timestamp: 200 },
            ],
          },
        ],
        metadata: {
          user: 'greg',
          deviceId: 'device-uuid-123',
          date: '2026-03-26',
          version: '4.5.0',
        },
      }]]);
    });

    it('skips malformed event docs during aggregation', async () => {
      mockDatabases.resolves([{ name: '_pouch_interaction-2026-03-26-greg' }]);
      seedDb('interaction-2026-03-26-greg', makeDbStub({
        allDocs: sinon.stub().resolves({
          rows: [
            // Valid event — must be in the aggregate.
            { doc: { action: 'good', timestamp: 100, session: 'tasks', sessionStartedAt: 50 } },
            // No sessionStartedAt — dropped.
            { doc: { action: 'orphan', timestamp: 200, session: 'tasks' } },
            // sessionStartedAt is a string, not a number — dropped.
            { doc: { action: 'string_ts', timestamp: 300, session: 'tasks', sessionStartedAt: 'not_a_number' as any } },
            // Null doc — dropped.
            { doc: null },
          ],
        }),
      }));

      await service.init();

      // Only the valid event is in the aggregate; malformed docs are filtered.
      expect(metaDb.put.calledOnce).to.be.true;
      expect(metaDb.put.args[0][0].sessions).to.deep.equal([
        { session: 'tasks', startedAt: 50, events: [{ action: 'good', timestamp: 100 }] },
      ]);
    });

    it('logs a destroy failure and does NOT write a conflicted-aggregate', async () => {
      mockDatabases.resolves([{ name: '_pouch_interaction-2026-03-26-greg' }]);
      const failingDb = makeDbStub({
        allDocs: sinon.stub().resolves({
          rows: [{ doc: { action: 'a', timestamp: 1, session: 'tasks', sessionStartedAt: 0 } }],
        }),
        destroy: sinon.stub().rejects(new Error('IDB destroy failed')),
      });
      seedDb('interaction-2026-03-26-greg', failingDb);

      await service.init();

      // The aggregate doc was written successfully ONCE — no 409 retry, no conflicted-id.
      // Destroy then failed; the error is logged but doesn't trigger a second put.
      // (Tomorrow's init will see this DB again and the 409 path will catch the retry.)
      expect(metaDb.put.calledOnce).to.be.true;
      expect(metaDb.put.args[0][0]._id).to.equal('interaction-2026-03-26-greg-device-uuid-123');
      expect(metaDb.put.args[0][0].metadata).to.not.have.property('conflicted');
      expect(failingDb.destroy.calledOnce).to.be.true;
      expect(consoleErrorSpy.called).to.be.true;
    });

    it('ignores DBs with prefix near-misses or invalid date patterns', async () => {
      mockDatabases.resolves([
        { name: '_pouch_interactive-2026-03-26-greg' },
        { name: '_pouch_interaction-data' },
        { name: '_pouch_interaction-2026-03-26' },
      ]);

      await service.init();

      expect(metaDb.put.called).to.be.false;
    });
  });

  describe('concurrent persists', () => {
    beforeEach(async () => {
      await service.init();
    });
    it('two concurrent persistBuffer calls produce disjoint writes', async () => {
      await service.init();
      service.startSession('tasks');
      service.record('e1');
      service.record('e2');

      const p1 = service.persistBuffer();
      service.record('e3');
      const p2 = service.persistBuffer();

      await Promise.all([p1, p2]);

      expect(todayDb().bulkDocs.args).to.deep.equal([
        [[
          { action: 'e1', timestamp: NOW, session: 'tasks', sessionStartedAt: NOW },
          { action: 'e2', timestamp: NOW, session: 'tasks', sessionStartedAt: NOW },
        ]],
        [[
          { action: 'e3', timestamp: NOW, session: 'tasks', sessionStartedAt: NOW },
        ]],
      ]);
    });
  });

  describe('error tolerance', () => {
    it('falls back to "unknown" version when service worker is unavailable', async () => {
      versionService.getServiceWorker.rejects(new Error('no service worker'));

      mockDatabases.resolves([{ name: '_pouch_interaction-2026-03-26-greg' }]);
      seedDb('interaction-2026-03-26-greg', makeDbStub({
        allDocs: sinon.stub().resolves({
          rows: [{ doc: { action: 'a', timestamp: 1, session: 'tasks', sessionStartedAt: 0 } }],
        }),
      }));

      await service.init();

      expect(metaDb.put.args[0][0].metadata.version).to.equal('unknown');
    });

    it('does not enable tracking when userCtx has no name', async () => {
      sessionService.userCtx.returns({});

      await service.init();
      service.startSession('tasks');
      service.record('e1');
      await service.persistBuffer();

      // No DB opened, no events written. authService.has not even consulted.
      expect(authService.has.called).to.be.false;
      expect(windowMock.PouchDB.called).to.be.false;
      expect(metaDb.put.called).to.be.false;
    });

    it('does not enable tracking when userCtx is null', async () => {
      sessionService.userCtx.returns(null);

      await service.init();
      service.startSession('tasks');
      service.record('e1');
      await service.persistBuffer();

      expect(authService.has.called).to.be.false;
      expect(windowMock.PouchDB.called).to.be.false;
      expect(metaDb.put.called).to.be.false;
    });
  });
});
