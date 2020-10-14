/**
 * Module to listen for database changes.
 *
 * This function combines all the app changes listeners into one
 * db listener so only one connection is required.
 *
 * @param (Object) options
 *   - id (String): Some unique id to stop duplicate registrations
 *   - callback (function): The function to invoke when a change is detected.
 *        The function is given the pouchdb change object as a parameter
 *        including the changed doc.
 *   - filter (function) (optional): A function to invoke to determine if the
 *        callback should be called on the given change object.
 *   - metaDb (boolean) (optional): Watch the meta db instead of the medic db
 * @returns (Object)
 *   - unsubscribe (function): Invoke this function to stop being notified of
 *        any further changes.
 */
import { Injectable, NgZone } from '@angular/core';
import { DbService } from './db.service';
import { SessionService } from './session.service';
import { Store } from '@ngrx/store';
import { Selectors } from "../selectors";
import { ServicesActions } from "../actions/services";
import { Subject } from 'rxjs';

const RETRY_MILLIS = 5000;

@Injectable({
  providedIn: 'root'
})
export class ChangesService {
  private readonly dbs = {
    medic: {
      lastSeq: null,
      callbacks: {},
      watchIncludeDocs: true,
      observable: new Subject(),
      subscriptions: {},
    },
    meta: {
      lastSeq: null,
      callbacks: {},
      watchIncludeDocs: true,
      observable: new Subject(),
      subscriptions: {},
    }
  };
  private watches = [];
  private lastChangedDoc;
  private servicesActions;

  constructor(
    private db: DbService,
    private session: SessionService,
    private store: Store,
    private ngZone: NgZone
  ) {
    this.store.select(Selectors.getLastChangedDoc).subscribe(obj => this.lastChangedDoc = obj);
    this.servicesActions = new ServicesActions(store);

    this.init();
  }

  private watchChanges(meta) {
    console.info(`Initiating changes watch (meta=${meta})`);
    const db = meta ? this.dbs.meta : this.dbs.medic;
    const watch = this.db.get({ meta: meta })
      .changes({
        live: true,
        since: db.lastSeq,
        timeout: false,
        include_docs: db.watchIncludeDocs,
        return_docs: false,
      })
      .on('change', change => {
        this.ngZone.run(() => {
          if (this.lastChangedDoc && this.lastChangedDoc._id === change.id) {
            change.doc = change.doc || this.lastChangedDoc;
            this.servicesActions.setLastChangedDoc(false);
          }

          console.debug('Change notification firing', meta, change);
          db.observable.next(change);
          db.lastSeq = change.seq;
        });
      })
      .on('error', (err) => {
        this.ngZone.run(() => {
          console.error('Error watching for db changes', err);
          console.error('Attempting changes reconnection in ' + (RETRY_MILLIS / 1000) + ' seconds');
          setTimeout(() => {
            this.watchChanges(meta);
          }, RETRY_MILLIS);
        });
      });

    this.watches.push(watch);
  };

  private init() {
    console.info('Initiating changes service');
    this.watches = [];
    return Promise
      .all([
        this.db.get().info(),
        this.db.get({ meta: true }).info()
      ])
      .then((results) => {
        this.dbs.medic.lastSeq = results[0].update_seq;
        this.dbs.meta.lastSeq = results[1].update_seq;
        this.dbs.medic.watchIncludeDocs = !this.session.isOnlineOnly();
        this.watchChanges(false);
        this.watchChanges(true);
      })
      .catch((err) => {
        console.error('Error initialising watching for db changes', err);
        console.error('Attempting changes initialisation in ' + (RETRY_MILLIS / 1000) + ' seconds');
        setTimeout(this.init, RETRY_MILLIS);
      });
  };

  subscribe(options) {
    const db = options.metaDb ? this.dbs.meta : this.dbs.medic;
    if (db.subscriptions[options.key]) {
      db.subscriptions[options.key].unsubscribe();
    }

    const subscription = db.observable.subscribe(change => {
      try {
        if (!options.filter || options.filter(change)) {
          options.callback(change);
        }
      } catch(e) {
        console.error(new Error('Error executing changes callback: ' + options.key), e);
      }
    });
    db.subscriptions[options.key] = subscription;
    return subscription;
  }
}

/*
angular.module('inboxServices').factory('ChangesService',
  function(
    $log,
    $ngRedux,
    $q,
    $timeout,
    DB,
    Selectors,
    ServicesActions,
    SessionService
  ) {

    'use strict';
    'ngInject';

    const self = this;
    const mapStateToTarget = (state) => ({
      lastChangedDoc: Selectors.getLastChangedDoc(state),
    });
    const mapDispatchToTarget = (dispatch) => {
      const servicesActions = ServicesActions(dispatch);
      return {
        setLastChangedDoc: servicesActions.setLastChangedDoc
      };
    };

    $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(self);

    service.killWatchers = function() {
      watches.forEach(function(watch) {
        watch.cancel();
      });
    };

    return service;
  }
);*/
