import { Injectable, NgZone } from '@angular/core';

import { AuthService } from '@mm-services/auth.service';
import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { VersionService } from '@mm-services/version.service';
import { TelemetryService } from '@mm-services/telemetry.service';
const moment = require('moment');

interface InteractionEvent {
  action: string;
  timestamp: number;
  ref?: string;
  detail?: string;
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
    versions: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class InteractionTrackingService {
  private static readonly PERMISSION = 'can_track_task_interactions';
  private static readonly MAX_EVENTS_PER_DAY = 500;
  private static readonly SESSION_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes of inactivity ends session
  private static readonly SAVE_INTERVAL_MS = 5 * 60 * 1000; // persist current session every 5 minutes

  private currentSession: string | null = null;
  private sessionStartedAt: number | null = null;
  private events: InteractionEvent[] = [];
  private sessionTimer: ReturnType<typeof setTimeout> | null = null;
  private saveTimer: ReturnType<typeof setInterval> | null = null;
  private totalEventsToday = 0;
  private enabled = false;

  constructor(
    private readonly authService: AuthService,
    private readonly dbService: DbService,
    private readonly sessionService: SessionService,
    private readonly versionService: VersionService,
    private readonly telemetryService: TelemetryService,
    private readonly ngZone: NgZone,
  ) {}

  async init(): Promise<void> {
    this.enabled = await this.authService.has(InteractionTrackingService.PERMISSION);
  }

  /**
   * Start a new interaction session. If a session is already active, it is flushed first.
   * @param session Name of the session context (e.g., 'tasks')
   */
  startSession(session: string): void {
    this.ngZone.runOutsideAngular(() => {
      if (!this.enabled) {
        return;
      }
      if (this.currentSession) {
        this.flush();
      }
      this.currentSession = session;
      this.sessionStartedAt = Date.now();
      this.events = [];
      this.resetSessionTimer();
      this.startSaveInterval();
    });
  }

  /**
   * Record an interaction event within the current session.
   * @param action The action identifier (e.g., 'task_list:scroll', 'task:open')
   * @param ref Optional non-PII reference (e.g., task type id, form id)
   * @param detail Optional extra context (e.g., list position)
   */
  record(action: string, ref?: string, detail?: string) {
    this.ngZone.runOutsideAngular(() => this._record(action, ref, detail));
  }

  private _record(action: string, ref?: string, detail?: string) {
    if (!this.currentSession || this.hasReachedDailyLimit()) {
      return;
    }

    if (this.isDuplicate(action, ref, detail)) {
      return;
    }

    this.events.push(this.buildEvent(action, ref, detail));

    if (this.hasReachedDailyLimit()) {
      this.flush();
      return;
    }

    this.resetSessionTimer();
  }

  private hasReachedDailyLimit(): boolean {
    return (this.totalEventsToday + this.events.length) >= InteractionTrackingService.MAX_EVENTS_PER_DAY;
  }

  private isDuplicate(action: string, ref?: string, detail?: string): boolean {
    const lastEvent = this.events[this.events.length - 1];
    return lastEvent?.action === action && lastEvent?.ref === ref && lastEvent?.detail === detail;
  }

  private buildEvent(action: string, ref?: string, detail?: string): InteractionEvent {
    const event: InteractionEvent = { action, timestamp: Date.now() };
    if (ref) {
      event.ref = ref;
    }
    if (detail) {
      event.detail = detail;
    }
    return event;
  }

  /**
   * End the current session, persist it, and clear session state.
   */
  async flush() {
    return this.ngZone.runOutsideAngular(() => this._flush(true));
  }

  /**
   * Persist the current session's events without ending it.
   */
  async save() {
    return this.ngZone.runOutsideAngular(() => this._flush(false));
  }

  private async _flush(endSession: boolean) {
    const hasData = this.currentSession && this.events.length > 0;

    if (hasData) {
      await this._persist();
    }

    if (endSession) {
      this.clearSession();
    }
  }

  private async _persist() {
    const session = this.currentSession!;
    const startedAt = this.sessionStartedAt!;
    const events = [...this.events];

    try {
      const metaDb = this.dbService.get({ meta: true });
      const doc = await this.getOrCreateDailyDoc(metaDb);
      await this.upsertSession(doc, { session, startedAt, events });
      await metaDb.put(doc);
    } catch (error) {
      console.error('Error saving interaction log', error);
    }
  }

  private async upsertSession(doc: InteractionLogDoc, { session, startedAt, events }: InteractionSession) {
    const existingSession = doc.sessions.find(s => s.startedAt === startedAt);
    if (existingSession) {
      existingSession.events = events;
    } else {
      doc.sessions.push({ session, startedAt, events });
    }

    this.totalEventsToday = doc.sessions.reduce((sum, s) => sum + s.events.length, 0);

    const version = await this.getAppVersion();
    if (!doc.metadata.versions.includes(version)) {
      doc.metadata.versions.push(version);
    }
  }

  private async getOrCreateDailyDoc(metaDb: any): Promise<InteractionLogDoc> {
    const dailyDocId = this.getDailyDocId();
    try {
      return await metaDb.get(dailyDocId);
    } catch (err: any) {
      if (err.status !== 404) {
        throw err;
      }
      return {
        _id: dailyDocId,
        type: 'interaction-log',
        metadata: {
          user: this.sessionService.userCtx()?.name,
          deviceId: this.telemetryService.getUniqueDeviceId(),
          date: this.getTodayDate(),
          versions: [],
        },
        sessions: [],
      };
    }
  }

  private getDailyDocId(): string {
    const date = this.getTodayDate();
    const user = this.sessionService.userCtx()?.name || 'unknown';
    const deviceId = this.telemetryService.getUniqueDeviceId();
    return `interaction-${date}-${user}-${deviceId}`;
  }

  private getTodayDate(): string {
    return moment().format('YYYY-MM-DD');
  }

  private clearSession(): void {
    this.currentSession = null;
    this.sessionStartedAt = null;
    this.events = [];
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }

  private resetSessionTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    this.sessionTimer = setTimeout(
      () => this.flush(),
      InteractionTrackingService.SESSION_TIMEOUT_MS,
    );
  }

  private startSaveInterval(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }
    this.saveTimer = setInterval(
      () => this.save(),
      InteractionTrackingService.SAVE_INTERVAL_MS,
    );
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
