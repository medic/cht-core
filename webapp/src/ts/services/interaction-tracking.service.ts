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
  private static readonly MAX_EVENTS_PER_DAY = 2000;
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
    this.ngZone.runOutsideAngular(() => {
      if (!this.currentSession) {
        return;
      }

      if (this.totalEventsToday >= InteractionTrackingService.MAX_EVENTS_PER_DAY) {
        return;
      }

      const event: InteractionEvent = { action, timestamp: Date.now() };
      if (ref) {
        event.ref = ref;
      }
      if (detail) {
        event.detail = detail;
      }

      this.events.push(event);
      this.resetSessionTimer();
    });
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
    if (!this.currentSession || this.events.length === 0) {
      if (endSession) {
        this.clearSession();
      }
      return;
    }

    const session = this.currentSession;
    const startedAt = this.sessionStartedAt!;
    const events = [...this.events];

    if (endSession) {
      this.clearSession();
    }

    try {
      const version = await this.getAppVersion();
      const metaDb = this.dbService.get({ meta: true });
      const doc = await this.getOrCreateDailyDoc(metaDb);

      const existingSession = doc.sessions.find(s => s.startedAt === startedAt);
      const otherEventCount = doc.sessions.reduce((sum, s) => {
        return sum + (s.startedAt === startedAt ? 0 : s.events.length);
      }, 0);

      const remaining = InteractionTrackingService.MAX_EVENTS_PER_DAY - otherEventCount;
      if (remaining <= 0) {
        this.totalEventsToday = otherEventCount;
        return;
      }

      const trimmedEvents = events.slice(0, remaining);

      if (existingSession) {
        existingSession.events = trimmedEvents;
      } else {
        doc.sessions.push({ session, startedAt, events: trimmedEvents });
      }

      this.totalEventsToday = otherEventCount + trimmedEvents.length;

      if (!doc.metadata.versions.includes(version)) {
        doc.metadata.versions.push(version);
      }

      await metaDb.put(doc);
    } catch (error) {
      console.error('Error saving interaction log', error);
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
