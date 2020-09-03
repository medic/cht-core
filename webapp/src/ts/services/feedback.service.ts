import * as uuidV4 from 'uuid/v4';
import {Injectable} from '@angular/core';
import { DbService } from './db.service';
import { SessionService } from './session.service';
import { VersionService } from './version.service';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  constructor(
    private dbService:DbService,
    private sessionService:SessionService,
    private versionService:VersionService,
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
        if (typeof value === "object" && value !== null) {
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
        // push the error onto the stack
        this.logs[this.logIdx++] = { level, arguments: JSON.stringify(args, getCircularReplacer()) };
        if (this.logIdx === this.LOG_LENGTH) {
          this.logIdx = 0;
        }

        // output to the console as per usual
        original.apply(this.options.console, args);
      };
    });
  }

  private create(info, isManual?) {
    return this.versionService.getLocal().then(({ version }) => {
      const date = new Date().toISOString();
      const uuid = uuidV4();
      return {
        _id: `feedback-${date}-${uuid}`,
        meta: {
          time: date,
          user: this.sessionService.userCtx(),
          url: this.getUrl(),
          version: version,
          source: isManual ? 'manual' : 'automatic'
        },
        info: info,
        log: this.getLog(),
        type: 'feedback'
      };
    });
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
