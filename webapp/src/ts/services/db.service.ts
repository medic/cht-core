// Regex to test for characters that are invalid in db names
// Only lowercase characters (a-z), digits (0-9), and any of the characters _, $, (, ), +, -, and / are allowed.
// https://wiki.apache.org/couchdb/HTTP_database_API#Naming_and_Addressing
const DISALLOWED_CHARS = /[^a-z0-9_$()+/-]/g;
const USER_DB_SUFFIX = 'user';
const META_DB_SUFFIX = 'meta';
const USERS_DB_SUFFIX = 'users';

import { Injectable, NgZone } from '@angular/core';
import { EventEmitter } from 'events';

import { SessionService } from '@mm-services/session.service';
import { LocationService } from '@mm-services/location.service';
import { POUCHDB_OPTIONS } from '../constants';

@Injectable({
  providedIn: 'root'
})
export class DbService {
  private cache = {};
  private isOnlineOnly;

  private readonly POUCHDB_METHODS = {
    destroy: this.outOfZonePromise.bind(this),
    put: this.outOfZonePromise.bind(this),
    post: this.outOfZonePromise.bind(this),
    get: this.outOfZonePromise.bind(this),
    remove: this.outOfZonePromise.bind(this),
    bulkDocs: this.outOfZonePromise.bind(this),
    bulkGet: this.outOfZonePromise.bind(this),
    allDocs: this.outOfZonePromise.bind(this),
    putAttachment: this.outOfZonePromise.bind(this),
    getAttachment: this.outOfZonePromise.bind(this),
    removeAttachment: this.outOfZonePromise.bind(this),
    query: this.outOfZonePromise.bind(this),
    viewCleanup: this.outOfZonePromise.bind(this),
    info: this.outOfZonePromise.bind(this),
    compact: this.outOfZonePromise.bind(this),
    revsDiff: this.outOfZonePromise.bind(this),
    changes: this.outOfZoneEventEmitter.bind(this),
    sync: this.outOfZoneEventEmitter.bind(this),
    replicate: this.outOfZoneReplicate.bind(this),
  };

  private outOfZonePromise(fn, db) {
    return (...args) => this.ngZone.runOutsideAngular(() => fn.apply(db, args));
  }

  private outOfZoneEventEmitter(fn, db) {
    // complete possible events list is: ['change', 'paused', 'active', 'denied', 'complete', 'error']
    // omitting `paused` and `active` events, as we have no handlers for these and we don't need to trigger
    // change detection when they are emitted
    const events = ['change', 'denied', 'complete', 'error'];

    return (...args) => {
      const promiseEmitter:any = new EventEmitter();
      const emitter = this.ngZone.runOutsideAngular(() => fn.apply(db, args));
      promiseEmitter.isInAngularZone = NgZone.isInAngularZone();
      promiseEmitter.then = emitter.then.bind(emitter);
      promiseEmitter.catch = emitter.catch.bind(emitter);
      promiseEmitter.cancel = emitter.cancel.bind(emitter);

      events.forEach(event => {
        emitter.on(event, (...args) => {
          if (promiseEmitter.isInAngularZone) {
            return this.ngZone.run(() => promiseEmitter.emit(event, ...args));
          }
          promiseEmitter.emit(event, ...args);
        });
      });

      // when an error event is emitted, but there is no listener, the vanilla event emitter code will log
      // "Uncaught (in promise) Error: Unhandled error. (undefined)" because the thrown event has no `message` property.
      promiseEmitter.on('error', error => console.error(error));

      return promiseEmitter;
    };
  }

  private outOfZoneReplicate(fn, db) {
    const getter = Object.keys(fn).reduce((index, key) => {
      index[key] = this.outOfZoneEventEmitter(db.replicate[key], db);
      return index;
    }, {});

    Object.defineProperty(db, 'replicate', {
      set() {},
      get() {
        return getter;
      }
    });
  }

  constructor(
    private sessionService:SessionService,
    private locationService:LocationService,
    private ngZone:NgZone,
  ) {
    this.isOnlineOnly = this.sessionService.isOnlineOnly();

    if (!this.isOnlineOnly) {
      // delay the cleanup so it's out of the main startup sequence
      setTimeout(() => {
        this.get().viewCleanup();
        this.get({ meta: true }).viewCleanup();
      }, 1000);
    }
  }

  private getUsername(remote){
    const username = this.sessionService.userCtx().name;
    if (!remote) {
      return username;
    }
    // escape username in case they user invalid characters
    return username.replace(DISALLOWED_CHARS, match => `(${match.charCodeAt(0)})`);
  }

  private getDbName(remote, meta, usersMeta) {
    const parts: string[] = [];
    if (remote) {
      parts.push(this.locationService.url);
    } else {
      parts.push(this.locationService.dbName);
    }
    if ((!remote || meta) && !usersMeta) {
      parts.push(USER_DB_SUFFIX);
      parts.push(this.getUsername(remote));
    } else if (usersMeta) {
      parts.push(USERS_DB_SUFFIX);
    }
    if (meta || usersMeta) {
      parts.push(META_DB_SUFFIX);
    }
    return parts.join('-');
  }

  private getParams (remote, meta, usersMeta) {
    const clone = Object.assign({}, remote ? POUCHDB_OPTIONS.remote : POUCHDB_OPTIONS.local);
    if (remote && meta) {
      // Don't create user DBs remotely, we do this ourselves in /api/services/user-db:create,
      // which is called in routing when a user tries to access the DB
      clone.skip_setup = false;
    }
    if (remote && usersMeta) {
      clone.skip_setup = false;
    }
    return clone;
  }

  private wrapMethods(db) {
    for (const method in this.POUCHDB_METHODS) {
      if (this.POUCHDB_METHODS[method]) {
        db[method] = this.POUCHDB_METHODS[method](db[method], db);
      }
    }
    return db;
  }

  get({ remote=this.isOnlineOnly, meta=false, usersMeta=false }={}) {
    const name = this.getDbName(remote, meta, usersMeta);
    if (!this.cache[name]) {
      const db = window.PouchDB(name, this.getParams(remote, meta, usersMeta));
      this.cache[name] = this.wrapMethods(db);
    }
    return this.cache[name];
  }
}
