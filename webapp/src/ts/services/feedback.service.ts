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
  private readonly STACK_LENGTH = 5000;
  private readonly MAX_DOCS = 1000;
  private readonly logCircularBuffer = new Array(this.LOG_LENGTH);
  // List of Error messages to not automatically log to feedback
  // Can be a lower-cased partial string or a regular expression
  private readonly NO_FEEDBACK_MESSAGES = [
    /failed to fetch/i,
    /http failure .* unknown error/i, // server offline
    /service unavailable/i, // server starting up
    /missing/i,
    /document not found/i,
    /denied replicating to remote server/i,
    /phone number not unique/i,
    /invalid phone number/i,
    /validation failed/i,
    /form is invalid/i,
    /unauthorized/i
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

  private async exceededFeedbackDocDbLimit () {
    const response = await this.dbService.get({ meta: true }).allDocs({
      start_key: 'feedback',
      end_key: 'feedback\ufff0',
      limit: this.MAX_DOCS
    });

    return response.rows.length === this.MAX_DOCS;
  }

  private async shouldGenerateFeedback(message:string, exceptionMessage:string, exception?) {
    // requiring a valid error to be logged to avoid cascades of feedback docs
    if (!message || !exception) {
      return false;
    }

    // don't double-log errors as a basic infinite loop defense
    if (this.lastErrorMessage === message || this.lastErrorMessage === exceptionMessage) {
      return false;
    }

    const matchesNoFeedback = this.NO_FEEDBACK_MESSAGES
      .find((item:RegExp) => item.test(message) || item.test(exceptionMessage));

    if (matchesNoFeedback) {
      return false;
    }

    if (await this.exceededFeedbackDocDbLimit()) {
      return false;
    }

    return true;
  }

  private getExceptionMessage(exception) {
    if (!exception) {
      return;
    }

    if (typeof exception.error === 'string') {
      return exception.error;
    }

    return exception.reason || exception.message;
  }

  private async generateFeedbackOnError(level, ...args) {
    if (this.FEEDBACK_LEVEL !== level) {
      return false;
    }

    const exception = args.find(arg => arg instanceof Error || arg?.stack || arg instanceof HttpErrorResponse);
    const exceptionMessage = this.getExceptionMessage(exception);
    const loggedMessage = String(args[0]);

    try {
      if (await this.shouldGenerateFeedback(loggedMessage, exceptionMessage, exception)) {
        const message = exceptionMessage || loggedMessage;
        this.lastErrorMessage = message;
        await this.createAndSave( { message, stack: exception?.stack, args });
      }
    } catch (e) {
      // stop infinite loop of exceptions
      console.warn('Error while trying to record error', e);
    }
  }

  private getUrl() {
    const url = this.options.document && this.options.document.URL;
    if (url) {
      // blank out passwords
      return url.replace(/:[^@:]*@/, ':********@');
    }
  }

  // stolen from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value#Examples
  private getCircularReplacer = () => {
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

  private registerConsoleInterceptor() {
    // intercept console logging
    this.LEVELS.forEach(level => {
      const original = this.options.console[level];
      this.options.console[level] = (...args) => {
        const logEvent = {
          level,
          arguments: JSON.stringify(args, this.getCircularReplacer()).substring(0, this.STACK_LENGTH),
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
      info: {
        message: info.message,
        stack: info.stack
      },
      arguments: info.args && info.args.map(arg => JSON.stringify(arg, this.getCircularReplacer())),
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
