/**
 * Service to listen for database changes.
 */
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { DbService } from '@admin-tool-services/db.service';

const RETRY_MILLIS = 5000;

@Injectable({
  providedIn: 'root'
})
export class ChangesService {
  private readonly db = {
    lastSeq: null as any,
    callbacks: {} as Record<string, any>,
    watchIncludeDocs: false,
    observable: new Subject<any>(),
    subscriptions: {} as Record<string, any>,
  };

  private watches: any[] = [];

  constructor(private dbService: DbService) {
    this.init();
  }

  private onChangeHandler(change) {
    console.debug('Change notification firing', change);
    this.db.observable.next(change);
    this.db.lastSeq = change.seq;
  }

  private onErrorHandler(err) {
    console.error('Error watching for db changes', err);
    console.error('Attempting changes reconnection in ' + (RETRY_MILLIS / 1000) + ' seconds');
    setTimeout(() => this.watchChanges(), RETRY_MILLIS);
  }

  private watchChanges() {
    console.info('Initiating changes watch');
    const watch = this.dbService
      .get()
      .changes({
        live: true,
        since: this.db.lastSeq,
        timeout: false,
        include_docs: this.db.watchIncludeDocs,
        return_docs: false,
      })
      .on('change', (change) => this.onChangeHandler(change))
      .on('error', (err) => this.onErrorHandler(err));

    this.watches.push(watch);
  }

  private init() {
    console.info('Initiating changes service');
    this.watches = [];
    return this.dbService
      .get()
      .info()
      .then((result) => {
        this.db.lastSeq = result.update_seq;
        this.watchChanges();
      })
      .catch((err) => {
        console.error('Error initialising watching for db changes', err);
        console.error('Attempting changes initialisation in ' + (RETRY_MILLIS / 1000) + ' seconds');
        setTimeout(() => this.init(), RETRY_MILLIS);
      });
  }

  /**
   * Combines all change listeners into one db connection.
   * @param options
   *   - key (string, required): Unique id to prevent duplicate registrations
   *   - debounce (number, optional): ms to wait between emissions before executing filter & callback
   *   - callback (function, required): Invoked with the pouchdb change object
   *   - filter (function, optional): Predicate to decide if callback should run for a given change
   * @returns { unsubscribe: () => void }
   */
  subscribe(options: {
    key: string;
    debounce?: number;
    callback: (change: any) => void;
    filter?: (change: any) => boolean;
  }) {
    if (this.db.subscriptions[options.key]) {
      this.db.subscriptions[options.key].unsubscribe();
    }

    const observable = options.debounce
      ? this.db.observable.pipe(debounceTime(options.debounce))
      : this.db.observable;

    this.db.subscriptions[options.key] = observable.subscribe(change => {
      try {
        if (!options.filter || options.filter(change)) {
          options.callback(change);
        }
      } catch (e) {
        console.error(new Error('Error executing changes callback: ' + options.key), e);
      }
    });

    return {
      unsubscribe: () => {
        this.db.subscriptions[options.key].unsubscribe();
        delete this.db.subscriptions[options.key];
      }
    };
  }

  killWatchers() {
    this.watches.forEach(watch => watch.cancel());
    this.watches = [];
  }
}
