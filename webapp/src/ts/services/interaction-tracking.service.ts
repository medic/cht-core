import { Inject, Injectable, NgZone } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { AuthService } from '@mm-services/auth.service';
import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { VersionService } from '@mm-services/version.service';
import { TelemetryService } from '@mm-services/telemetry.service';

interface InteractionEvent {
  action: string;
  timestamp: number;
  ref?: string;
  detail?: string;
}

interface BufferedEvent extends InteractionEvent {
  session: string;
  sessionStartedAt: number;
}

interface InteractionSession {
  session: string;
  startedAt: number;
  events: InteractionEvent[];
}

interface InteractionLogDoc {
  _id: string;
  _rev?: string;
  type: 'interaction-log';
  sessions: InteractionSession[];
  metadata: {
    user: string;
    deviceId: string;
    date: string;
    version: string;
  };
}

type Day = {
  formatted: string;
  now: number;
};

@Injectable({
  providedIn: 'root'
})
export class InteractionTrackingService {
  private static readonly PERMISSION = 'can_track_task_interactions';
  private static readonly PREFIX = 'interaction';
  private static readonly POUCH_PREFIX = '_pouch_';
  private static readonly NAME_DIVIDER = '-';
  private static readonly MAX_EVENTS_PER_DAY = 500;
  private static readonly BUFFER_FLUSH_THRESHOLD = 50;

  private static readonly DB_NAME_PATTERN = new RegExp(
    `^${InteractionTrackingService.PREFIX}-[0-9]{4}-[0-1]?[0-9]-[0-3]?[0-9]-.+$`
  );

  private static readonly DB_NAME_USER_PATTERN = new RegExp(
    String.raw`^${InteractionTrackingService.PREFIX}-\d{4}-\d{1,2}-\d{1,2}-(.+)$`
  );

  private currentSession: string | null = null;
  private sessionStartedAt: number | null = null;
  private lastEventKey: string | null = null;

  private buffer: BufferedEvent[] = [];
  private currentDayKey: string | null = null;
  private persistedEventCount = 0;

  // Promise-based guard for aggregation work.
  private aggregationInFlight: Promise<void> | null = null;

  private enabled = false;
  private user!: string;
  private readonly windowRef;

  constructor(
    private readonly authService: AuthService,
    private readonly dbService: DbService,
    private readonly sessionService: SessionService,
    private readonly versionService: VersionService,
    private readonly telemetryService: TelemetryService,
    private readonly ngZone: NgZone,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {
    this.windowRef = this.document.defaultView;
  }

  async init(): Promise<void> {
    const user = this.sessionService.userCtx()?.name;
    if (!user) {
      return;
    }
    const granted = await this.authService.has(InteractionTrackingService.PERMISSION);
    if (!granted) {
      return;
    }

    this.user = user;
    const currentDay = this.getCurrentDay();
    try {
      await this.aggregateOldDb(currentDay);
    } catch (error) {
      console.error('Error aggregating leftover interaction DBs', error);
    }

    this.currentDayKey = currentDay.formatted;
    this.persistedEventCount = await this.readPersistedCount(currentDay);
    this.enabled = true;
  }

  /**
   * Start a new interaction session. Subsequent record() calls are tagged with
   * this session and a fresh sessionStartedAt.
   */
  startSession(session: string): void {
    if (!this.enabled) {
      return;
    }
    this.currentSession = session;
    this.sessionStartedAt = Date.now();
    this.lastEventKey = null;
  }

  /**
   * Stop accepting events and persist the in-memory buffer.
   */
  async endSession(): Promise<void> {
    return this.ngZone.runOutsideAngular(() => this._endSession());
  }

  private async _endSession() {
    const hadSession = !!this.currentSession;
    this.currentSession = null;
    this.sessionStartedAt = null;
    this.lastEventKey = null;
    if (hadSession) {
      await this._persistBuffer();
    }
  }

  /**
   * Record an interaction event into the in-memory buffer. The buffer is
   * persisted in batches at threshold, on endSession(), or on visibilitychange.
   */
  record(action: string, ref?: string, detail?: string): void {
    if (!this.canRecord()) {
      return;
    }
    const eventKey = `${action}|${ref ?? ''}|${detail ?? ''}`;
    if (eventKey === this.lastEventKey) {
      return;
    }
    const currentDay = this.getCurrentDay();
    if (!this.rolloverAndCheckCapacity(currentDay)) {
      return;
    }
    this.appendEvent(action, currentDay, ref, detail);
    this.lastEventKey = eventKey;
    if (this.buffer.length >= InteractionTrackingService.BUFFER_FLUSH_THRESHOLD) {
      this.persistBuffer();
    }
  }

  private canRecord(): boolean {
    return this.enabled && !!this.currentSession && this.sessionStartedAt !== null;
  }

  // Flushes the buffer on day rollover (which synchronously resets
  // `persistedEventCount` and `this.buffer` to 0 before the first await in
  // `_persistBuffer`), then returns whether the per-day cap leaves room for
  // another event.
  private rolloverAndCheckCapacity(currentDay: Day): boolean {
    if (this.currentDayKey !== currentDay.formatted) {
      this.persistBuffer();
    }
    return this.persistedEventCount + this.buffer.length < InteractionTrackingService.MAX_EVENTS_PER_DAY;
  }

  private appendEvent(action: string, currentDay: Day, ref?: string, detail?: string): void {
    this.buffer.push({
      action,
      timestamp: currentDay.now,
      session: this.currentSession!,
      sessionStartedAt: this.sessionStartedAt!,
      ...(ref ? { ref } : {}),
      ...(detail ? { detail } : {}),
    });
  }

  /**
   * Persist the in-memory buffer in a single bulkDocs write to the day-DB
   * matching the events' day. Owns all per-day state cleanup: if the date has
   * changed since the buffer was filled, the snapshot writes to the previous
   * day's DB and the tracker resets for the new day.
   */
  async persistBuffer(): Promise<void> {
    return this.ngZone.runOutsideAngular(() => this._persistBuffer());
  }

  private async _persistBuffer() {
    if (!this.enabled || !this.windowRef) {
      return;
    }

    const snapshot = this.buffer;
    const snapshotDayKey = this.currentDayKey;
    this.buffer = [];

    const currentDay = this.getCurrentDay();
    const dayChanged = this.currentDayKey !== currentDay.formatted;
    if (dayChanged) {
      this.currentDayKey = currentDay.formatted;
      this.persistedEventCount = 0;
      this.lastEventKey = null;
    }

    if (snapshot.length && snapshotDayKey) {
      try {
        await this.writeEvents(snapshotDayKey, snapshot);
        if (snapshotDayKey === this.currentDayKey) {
          this.persistedEventCount += snapshot.length;
        }
      } catch (error) {
        console.error('Error persisting interaction buffer', error);
      }
    }

    // Long-running sessions cross midnight without a reload; fold yesterday's
    // per-day DB into the aggregate as soon as we notice the rollover instead
    // of waiting for the next `init()`.
    if (dayChanged) {
      try {
        await this.aggregateOldDb(currentDay);
      } catch (error) {
        console.error('Error aggregating leftover interaction DBs', error);
      }
    }
  }

  private async writeEvents(day: string, events: BufferedEvent[]): Promise<void> {
    const dbName = this.dayDbNameForDate(day);
    const db = this.windowRef.PouchDB(dbName);
    try {
      await db.bulkDocs(events.map(e => this.toEventDoc(e)));
    } finally {
      this.closeDb(db);
    }
  }

  private toEventDoc(event: BufferedEvent) {
    const doc: any = {
      action: event.action,
      timestamp: event.timestamp,
      session: event.session,
      sessionStartedAt: event.sessionStartedAt,
    };
    if (event.ref) {
      doc.ref = event.ref;
    }
    if (event.detail) {
      doc.detail = event.detail;
    }
    return doc;
  }

  private aggregateOldDb(currentDay: Day): Promise<void> {
    if (this.aggregationInFlight) {
      return this.aggregationInFlight;
    }
    this.aggregationInFlight = this.doAggregate(currentDay).finally(() => {
      this.aggregationInFlight = null;
    });
    return this.aggregationInFlight;
  }

  private async doAggregate(currentDay: Day): Promise<void> {
    const dbNames = await this.findInteractionDbs();
    const currentDayDbName = this.dayDbNameForDate(currentDay.formatted);

    const oldDbs =
      dbNames.filter(name => name !== currentDayDbName && this.dbBelongsToUser(name, this.user));
    for (const name of oldDbs) {
      try {
        await this.aggregateAndDestroy(name);
      } catch (error) {
        console.error('Error aggregating interaction DB', name, error);
      }
    }
  }

  private async findInteractionDbs(): Promise<string[]> {
    const databases = await this.windowRef.indexedDB.databases();
    return (databases || [])
      .map(db => db?.name?.replace(InteractionTrackingService.POUCH_PREFIX, '') || '')
      .filter(name => this.isValidDbName(name));
  }

  private isValidDbName(name: string): boolean {
    return InteractionTrackingService.DB_NAME_PATTERN.test(name);
  }

  private dbBelongsToUser(dbName: string, userSuffix: string): boolean {
    const match = InteractionTrackingService.DB_NAME_USER_PATTERN.exec(dbName);
    return match?.[1] === userSuffix;
  }

  private async aggregateAndDestroy(dbName: string): Promise<void> {
    const db = this.windowRef.PouchDB(dbName);
    try {
      const result = await db.allDocs({ include_docs: true });
      const sessions = this.groupBySession(result.rows.map(row => row.doc));
      const aggregateDoc = await this.buildAggregateDoc(dbName, sessions);
      await this.putAggregate(aggregateDoc);
      await db.destroy();
    } catch (error) {
      this.closeDb(db);
      throw error;
    }
  }

  private async putAggregate(doc: InteractionLogDoc): Promise<void> {
    try {
      await this.dbService.get({ meta: true }).put(doc);
    } catch (error: any) {
      if (error?.status !== 409) {
        throw error;
      }
      doc._id = [doc._id, 'conflicted', Date.now()].join(InteractionTrackingService.NAME_DIVIDER);
      (doc.metadata as any).conflicted = true;
      await this.dbService.get({ meta: true }).put(doc);
    }
  }

  private groupBySession(docs: any[]): InteractionSession[] {
    const map = new Map<number, InteractionSession>();
    for (const doc of docs) {
      this.addDocToSessions(map, doc);
    }
    const sessions = [...map.values()];
    sessions.sort((a, b) => a.startedAt - b.startedAt);
    for (const session of sessions) {
      session.events.sort((a, b) => a.timestamp - b.timestamp);
    }
    return sessions;
  }

  private addDocToSessions(map: Map<number, InteractionSession>, doc: any): void {
    if (!doc || typeof doc.sessionStartedAt !== 'number') {
      return;
    }
    let entry = map.get(doc.sessionStartedAt);
    if (!entry) {
      entry = { session: doc.session, startedAt: doc.sessionStartedAt, events: [] };
      map.set(doc.sessionStartedAt, entry);
    }
    entry.events.push(this.toEventFromDoc(doc));
  }

  private toEventFromDoc(doc: any): InteractionEvent {
    const event: InteractionEvent = { action: doc.action, timestamp: doc.timestamp };
    if (doc.ref) {
      event.ref = doc.ref;
    }
    if (doc.detail) {
      event.detail = doc.detail;
    }
    return event;
  }

  private async buildAggregateDoc(dbName: string, sessions: InteractionSession[]): Promise<InteractionLogDoc> {
    const date = this.parseDbDate(dbName);
    const version = await this.getAppVersion();
    return {
      _id: this.aggregateDocId(date),
      type: 'interaction-log',
      sessions,
      metadata: {
        user: this.user,
        deviceId: this.telemetryService.getUniqueDeviceId(),
        date,
        version,
      },
    };
  }

  private aggregateDocId(date: string): string {
    return [
      InteractionTrackingService.PREFIX,
      date,
      this.user,
      this.telemetryService.getUniqueDeviceId(),
    ].join(InteractionTrackingService.NAME_DIVIDER);
  }

  private parseDbDate(dbName: string): string {
    const parts = dbName.split(InteractionTrackingService.NAME_DIVIDER);
    return `${parts[1]}-${parts[2]}-${parts[3]}`;
  }

  private dayDbNameForDate(date: string): string {
    return [
      InteractionTrackingService.PREFIX,
      date,
      this.user,
    ].join(InteractionTrackingService.NAME_DIVIDER);
  }

  private async readPersistedCount(day: Day): Promise<number> {
    if (!this.windowRef) {
      return 0;
    }
    const db = this.windowRef.PouchDB(this.dayDbNameForDate(day.formatted));
    try {
      const info = await db.info();
      return info?.doc_count || 0;
    } catch (error) {
      console.error('Error reading interaction DB info', error);
      return 0;
    } finally {
      this.closeDb(db);
    }
  }

  private getCurrentDay(): Day {
    const date = new Date();
    return {
      now: date.getTime(),
      formatted: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
    };
  }

  private closeDb(db: any) {
    if (!db || db._destroyed || db._closed) {
      return;
    }
    try {
      db.close();
    } catch (error) {
      console.error('Error closing interaction DB', error);
    }
  }

  private async getAppVersion(): Promise<string> {
    try {
      const { version } = await this.versionService.getServiceWorker();
      return version || 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
