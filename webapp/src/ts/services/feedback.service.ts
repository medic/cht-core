import {Injectable} from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { VersionService } from '@mm-services/version.service';
import { environment } from '@mm-environments/environment';
import { DebugService } from '@mm-services/debug.service';
import { LanguageService } from '@mm-services/language.service';
import { TelemetryService } from '@mm-services/telemetry.service';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  constructor(
    private dbService:DbService,
    private sessionService:SessionService,
    private versionService:VersionService,
    private debugService: DebugService,
    private languageService: LanguageService,
    private telemetryService : TelemetryService,
  ) {
  }

  private options = {
    window: window,
    console: console,
    document: document
  };

  private logIdx = 0;
  private readonly LEVELS = ['error', 'warn', 'log', 'info'];
  private readonly LOG_LENGTH = 20;
  private readonly logs = new Array(this.LOG_LENGTH);

  // Flips and reverses log into a clean latest first array for logging out
  private getLog() {
    // [oldest + newest] -> reversed -> filter empty
    return (this.logs.slice(this.logIdx, this.LOG_LENGTH).concat(this.logs.slice(0, this.logIdx)))
      .reverse()
      .filter(i => !!i);
  }

  private getUrl() {
    const url = this.options.document && this.options.document.URL;
    if (url) {
      // blank out passwords
      return url.replace(/:[^@:]*@/, ':********@');
    }
  }

  private registerConsoleInterceptor() {
    // stolen from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value#Examples
    const getCircularReplacer = () => {
      const seen = new WeakSet();
      return (key, value) => {
        if (value instanceof Error) {
          return value.stack;
        }

        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return;
          }
          seen.add(value);
        }
        return value;
      };
    };

    // intercept console logging
    this.LEVELS.forEach(level => {
      const original = this.options.console[level];
      this.options.console[level] = (...args) => {
        const logEvent = {
          level,
          arguments: JSON.stringify(args, getCircularReplacer()).substring(0, 1000),
        };

        // push the error onto the stack
        this.logs[this.logIdx++] = logEvent;
        if (this.logIdx === this.LOG_LENGTH) {
          this.logIdx = 0;
        }

        // output to the console as per usual
        original.apply(this.options.console, args);
      };
    });

    const debugOriginal = this.options.console.debug;
    this.options.console.debug = (...args) => {
      // only log debug messages in development settings or when manually enabled from Testing page
      if (this.debugService.get() || !environment.production) {
        debugOriginal.apply(this.options.console, args);
      }
    };
  }

  private async create(info, isManual?) {
    const { version } = await this.versionService.getLocal();
    const language = await this.languageService.get();

    const time = new Date().toISOString();
    const uuid = uuidv4();

    return {
      _id: `feedback-${time}-${uuid}`,
      meta: {
        time,
        user: this.sessionService.userCtx(),
        language,
        url: this.getUrl(),
        version,
        source: isManual ? 'manual' : 'automatic',
        deviceId : this.telemetryService.getUniqueDeviceId(),
      },
      info,
      log: this.getLog(),
      type: 'feedback'
    };
  }

  private createAndSave(info, isManual?) {
    return this.create(info, isManual).then(doc => this.dbService.get({ meta: true }).post(doc));
  }

  private submitExisting() {
    const existing = this.options.window.bootstrapFeedback || [];
    existing.forEach(msg => {
      this.createAndSave(msg).catch(() => {
        // Intentionally not throwing errors, we'll just fire and forget
        // these for simplicity
      });
    });
  }

  init () {
    this.registerConsoleInterceptor();
    this.submitExisting();
  }

  submit (info, isManual?) {
    return this.createAndSave(info, isManual);
  }

  // used for testing
  _setOptions(_options) {
    this.options = _options;
    this.registerConsoleInterceptor();
  }
}
