import { Inject, Injectable, NgZone } from '@angular/core';
import { DOCUMENT } from '@angular/common';

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

interface InteractionSession {
  session: string;
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
  private static readonly MAX_EVENTS_PER_SESSION = 500;
  private static readonly MAX_SESSIONS_PER_DAY = 200;
  private static readonly SESSION_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes of inactivity ends session

  private currentSession: string | null = null;
  private events: InteractionEvent[] = [];
  private sessionTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly visibilityHandler = () => this.onVisibilityChange();

  constructor(
    private readonly dbService: DbService,
    private readonly sessionService: SessionService,
    private readonly versionService: VersionService,
    private readonly telemetryService: TelemetryService,
    private readonly ngZone: NgZone,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {
    this.document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private onVisibilityChange() {
    if (this.document.hidden && this.currentSession) {
      this.flush();
    }
  }

  /**
   * Start a new interaction session. If a session is already active, it is flushed first.
   * @param session Name of the session context (e.g., 'tasks')
   */
  startSession(session: string) {
    this.ngZone.runOutsideAngular(() => {
      if (this.currentSession) {
        this.flush();
      }
      this.currentSession = session;
      this.events = [];
      this.resetSessionTimer();
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

      if (this.events.length >= InteractionTrackingService.MAX_EVENTS_PER_SESSION) {
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
   * End the current session and append it to the daily interaction log document.
   */
  async flush() {
    return this.ngZone.runOutsideAngular(() => this._flush());
  }

  private async _flush() {
    if (!this.currentSession || this.events.length === 0) {
      this.clearSession();
      return;
    }

    const session = this.currentSession;
    const events = [...this.events];
    this.clearSession();

    try {
      const version = await this.getAppVersion();
      const metaDb = this.dbService.get({ meta: true });
      const doc = await this.getOrCreateDailyDoc(metaDb);

      if (doc.sessions.length >= InteractionTrackingService.MAX_SESSIONS_PER_DAY) {
        return;
      }

      doc.sessions.push({ session, events });

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
        sessions: [],
        metadata: {
          user: this.sessionService.userCtx()?.name,
          deviceId: this.telemetryService.getUniqueDeviceId(),
          date: this.getTodayDate(),
          versions: [],
        },
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
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  }

  private clearSession() {
    this.currentSession = null;
    this.events = [];
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  private resetSessionTimer() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    this.sessionTimer = setTimeout(
      () => this.flush(),
      InteractionTrackingService.SESSION_TIMEOUT_MS,
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
