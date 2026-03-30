import { Injectable } from '@angular/core';
import { EventEmitter } from 'events';

import { LocationService } from '@admin-tool-services/location.service';

const POUCHDB_OPTIONS = {
  skip_setup: true,
  fetch: (url, opts) => {
    opts.credentials = 'same-origin';
    return window.PouchDB.fetch(url, opts);
  },
};

@Injectable({
  providedIn: 'root',
})
export class DbService {
  private cache: Record<string, any> = {};

  private readonly POUCHDB_METHODS = {
    destroy: this.wrapPromise.bind(this),
    put: this.wrapPromise.bind(this),
    post: this.wrapPromise.bind(this),
    get: this.wrapPromise.bind(this),
    remove: this.wrapPromise.bind(this),
    bulkDocs: this.wrapPromise.bind(this),
    bulkGet: this.wrapPromise.bind(this),
    allDocs: this.wrapPromise.bind(this),
    putAttachment: this.wrapPromise.bind(this),
    getAttachment: this.wrapPromise.bind(this),
    removeAttachment: this.wrapPromise.bind(this),
    query: this.wrapPromise.bind(this),
    viewCleanup: this.wrapPromise.bind(this),
    info: this.wrapPromise.bind(this),
    compact: this.wrapPromise.bind(this),
    revsDiff: this.wrapPromise.bind(this),
    changes: this.wrapEventEmitter.bind(this),
    sync: this.wrapEventEmitter.bind(this),
    replicate: this.wrapReplicate.bind(this),
  };

  constructor(private locationService: LocationService) {}

  private wrapPromise(fn, db) {
    return (...args) => fn.apply(db, args);
  }

  private wrapEventEmitter(fn, db) {
    const events = ['change', 'denied', 'complete', 'error'];

    return (...args) => {
      const promiseEmitter: any = new EventEmitter();
      const emitter = fn.apply(db, args);
      promiseEmitter.then = emitter.then.bind(emitter);
      promiseEmitter.catch = emitter.catch.bind(emitter);
      promiseEmitter.cancel = emitter.cancel.bind(emitter);

      events.forEach((event) => {
        emitter.on(event, (...eventArgs) => promiseEmitter.emit(event, ...eventArgs));
      });

      promiseEmitter.on('error', (error) => console.error(error));
      return promiseEmitter;
    };
  }

  private wrapReplicate(fn, db) {
    const getter = Object.keys(fn).reduce((index, key) => {
      index[key] = this.wrapEventEmitter(db.replicate[key], db);
      return index;
    }, {});

    Object.defineProperty(db, 'replicate', {
      set() {},
      get() {
        return getter;
      },
    });
  }

  private wrapMethods(db) {
    for (const method in this.POUCHDB_METHODS) {
      if (this.POUCHDB_METHODS[method]) {
        db[method] = this.POUCHDB_METHODS[method](db[method], db);
      }
    }
    return db;
  }

  get() {
    const name = this.locationService.url;
    if (!this.cache[name]) {
      const db = window.PouchDB(name, POUCHDB_OPTIONS);
      this.cache[name] = this.wrapMethods(db);
    }
    return this.cache[name];
  }
}
