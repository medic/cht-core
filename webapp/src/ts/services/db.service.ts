// Regex to test for characters that are invalid in db names
// Only lowercase characters (a-z), digits (0-9), and any of the characters _, $, (, ), +, -, and / are allowed.
// https://wiki.apache.org/couchdb/HTTP_database_API#Naming_and_Addressing
const DISALLOWED_CHARS = /[^a-z0-9_$()+/-]/g;
const USER_DB_SUFFIX = 'user';
const META_DB_SUFFIX = 'meta';
const USERS_DB_SUFFIX = 'users';

import { Injectable } from '@angular/core';

import { SessionService } from './session.service'
import { LocationService } from './location.service';
import { POUCHDB_OPTIONS } from '../constants';

@Injectable({
  providedIn: 'root'
})
export class DbService {
  private cache = {}
  private isOnlineOnly;

  constructor(private session:SessionService, private location:LocationService) {
    this.isOnlineOnly = this.session.isOnlineOnly();

    if (!this.isOnlineOnly) {
      // delay the cleanup so it's out of the main startup sequence
      setTimeout(() => {
        this.get().viewCleanup();
        this.get({ meta: true }).viewCleanup();
      }, 1000);
    }
  }

  private getUsername(remote){
    const username = this.session.userCtx().name;
    if (!remote) {
      return username;
    }
    // escape username in case they user invalid characters
    return username.replace(DISALLOWED_CHARS, match => `(${match.charCodeAt(0)})`);
  };

  private getDbName(remote, meta, usersMeta) {
    const parts = [];
    if (remote) {
      parts.push(this.location.url);
    } else {
      parts.push(this.location.dbName);
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
  };

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
  };

  get({ remote=this.isOnlineOnly, meta=false, usersMeta=false }={}) {
    const name = this.getDbName(remote, meta, usersMeta);
    if (!this.cache[name]) {
      this.cache[name] = (<any>window).PouchDB(name, this.getParams(remote, meta, usersMeta));
    }
    return this.cache[name];
  }
}
