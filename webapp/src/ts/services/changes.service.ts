/**
 * Service to listen for database changes.
 */
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { Selectors } from '@mm-selectors/index';
import { ServicesActions } from '@mm-actions/services';

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

  private watches: any[] = [];

  private lastChangedDoc;
  private servicesActions;

  constructor(
    private db:DbService,
    private session:SessionService,
    private store:Store,
  ) {
    this.store.select(Selectors.getLastChangedDoc).subscribe(obj => this.lastChangedDoc = obj);
    this.servicesActions = new ServicesActions(store);

    this.init();
  }

  private onChangeHandler(db, meta, change) {
    if (this.lastChangedDoc && this.lastChangedDoc._id === change.id) {
      change.doc = change.doc || this.lastChangedDoc;
      this.servicesActions.setLastChangedDoc(false);
    }

    console.debug('Change notification firing', meta, change);
    db.observable.next(change);
    db.lastSeq = change.seq;
  }

  private onErrorHandler(err, meta) {
    console.error('Error watching for db changes', err);
    console.error('Attempting changes reconnection in ' + (RETRY_MILLIS / 1000) + ' seconds');
    setTimeout(() => {
      this.watchChanges(meta);
    }, RETRY_MILLIS);
  }

  private watchChanges(meta) {
    console.info(`Initiating changes watch (meta=${meta})`);
    const db = meta ? this.dbs.meta : this.dbs.medic;
    const watch = this.db
      .get({ meta: meta })
      .changes({
        live: true,
        since: db.lastSeq,
        timeout: false,
        include_docs: db.watchIncludeDocs,
        return_docs: false,
      })
      .on('change', (change) => this.onChangeHandler(db, meta, change))
      .on('error', (err) => this.onErrorHandler(err, meta));

    this.watches.push(watch);
  }

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
        setTimeout(() => this.init(), RETRY_MILLIS);
      });
  }

  /**
   * This function combines all the app changes listeners into one db listener so only one connection is required.
   * @param options (Object)
   *   - key (String)(Required): Some unique id to stop duplicate registrations
   *   - debounce (Number)(Optional): Milliseconds to wait between emissions of value before executing filter & callback
   *   - callback (function)(Required): The function to invoke when a change is detected.
   *        The function is given the pouchdb change object as a parameter
   *        including the changed doc.
   *   - filter (function)(optional): A function to invoke to determine if the
   *        callback should be called on the given change object.
   *   - metaDb (boolean)(optional): Watch the meta db instead of the medic db
   * @returns (Object)
   *   - unsubscribe (function): Invoke this function to stop being notified of
   *        any further changes.
   */
  subscribe(options) {
    const db = options.metaDb ? this.dbs.meta : this.dbs.medic;
    if (db.subscriptions[options.key]) {
      db.subscriptions[options.key].unsubscribe();
    }

    const observable = options.debounce ? db.observable.pipe(debounceTime(options.debounce)) : db.observable;
    db.subscriptions[options.key] = observable.subscribe(change => {
      try {
        if (!options.filter || options.filter(change)) {
          options.callback(change);
        }
      } catch(e) {
        console.error(new Error('Error executing changes callback: ' + options.key), e);
      }
    });

    return {
      unsubscribe: () => {
        db.subscriptions[options.key].unsubscribe();
        delete db.subscriptions[options.key];
      }
    };
  }

  killWatchers() {
    this.watches.forEach(watch => {
      watch.cancel();
    });
    this.watches = [];
  }
}
