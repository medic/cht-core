import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { HttpErrorResponse } from '@angular/common/http';

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
  private lastErrorMessage;
  private readonly LEVELS = ['error', 'warn', 'log', 'info'];
  private readonly LOG_LENGTH = 20;
  private readonly logCircularBuffer = new Array(this.LOG_LENGTH);
  // List of Error messages to not automatically log to feedback
  // Can be a lower-cased partial string or a regular expression
  private readonly NO_FEEDBACK_MESSAGES = [
    'failed to fetch',
    'error while trying to record error',
    /http failure .* unknown error/gi // server offline
  ];

  private readonly FEEDBACK_LEVEL = 'error';

  // converts the logCircularBuffer into an ordered array of log events
  private getLog() {
    const olderLogEvents = this.logCircularBuffer.slice(this.logIdx, this.LOG_LENGTH);
    const newerLogEvents = this.logCircularBuffer.slice(0, this.logIdx);
    return [...olderLogEvents, ...newerLogEvents]
      .reverse()
      .filter(i => !!i);
  }

  private shouldGenerateFeedback(level:string, message:string) {
    if (this.FEEDBACK_LEVEL !== level) {
      return false;
    }

    if (!message){
      return false;
    }

    // don't double-log errors as a basic infinite loop defense
    if (this.lastErrorMessage === message) {
      return false;
    }

    const matchesNoFeedback = this.NO_FEEDBACK_MESSAGES.find(
      (item:string|RegExp) => item instanceof RegExp ? item.test(message) : message.toLowerCase().includes(item)
    );

    return !matchesNoFeedback;
  }

  private async generateFeedbackOnError(level, ...args) {
    const exception = args.find(arg => arg instanceof Error || arg?.stack || arg instanceof HttpErrorResponse);
    const message = exception?.reason || exception?.message || args[0];

    if (this.shouldGenerateFeedback(level, message)) {
      this.lastErrorMessage = message;
      try {
        await this.createAndSave( { message: message, stack: exception?.stack });
      } catch (e) {
        // stop infinite loop of exceptions
        console.error('Error while trying to record error', e);
      }
    }
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
          arguments: JSON.stringify(args, getCircularReplacer()).substring(0, 5000),
          time: new Date().toISOString(),
        };

        // push the log event onto the circular buffer
        this.logCircularBuffer[this.logIdx++] = logEvent;
        if (this.logIdx === this.LOG_LENGTH) {
          this.logIdx = 0;
        }

        // output to the console as per usual
        original.apply(this.options.console, args);
        this.generateFeedbackOnError(level, ...args);
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
        deviceId: this.telemetryService.getUniqueDeviceId(),
      },
      info,
      log: this.getLog(),
      type: 'feedback'
    };
  }

  private async createAndSave(info, isManual?) {
    const feedbackDoc = await this.create(info, isManual);
    return await this.dbService.get({ meta: true }).post(feedbackDoc);
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
