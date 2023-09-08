import { Injectable, OnDestroy } from '@angular/core';
import { find as _find } from 'lodash-es';
import { Subscription } from 'rxjs';

import { DbService } from '@mm-services/db.service';
import { ChangesService } from '@mm-services/changes.service';
import { SessionService } from '@mm-services/session.service';
import { ReadDocsProvider } from '@mm-providers/read-docs.provider';
import { DBSyncService } from '@mm-services/db-sync.service';

@Injectable({
  providedIn: 'root'
})
export class UnreadRecordsService implements OnDestroy {
  subscriptions: Subscription = new Subscription();
  private readonly TYPES = [ 'report', 'message' ];
  private callback;

  constructor(
    private dbService: DbService,
    private dbSyncService: DBSyncService,
    private changesService: ChangesService,
    private sessionService: SessionService,
    private readDocsProvider: ReadDocsProvider
  ) { }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private getTotal() {
    return this.dbService
      .get()
      .query('medic-client/data_records_by_type', { group: true });
  }

  private getRead() {
    return this.dbService
      .get({ meta: true })
      .query('medic-user/read', { group: true })
      .catch(err => {
        if (err.status !== 404) {
          throw err;
        }
      });
  }

  private getRowValueForType(type, response:any = {}) {
    const result = _find(response.rows, { key: type });
    return (result && result.value) || 0;
  }

  private getCount(callback) {
    return Promise
      .all([
        this.getTotal(),
        this.getRead()
      ])
      .then(([total, read]) => {
        const result = this.TYPES.reduce((countMap, type) => {
          countMap[type] = this.getRowValueForType(type, total) - this.getRowValueForType(type, read);
          return countMap;
        }, {});

        if (callback) {
          callback(null, result);
        }
      })
      .catch(error => {
        if (callback) {
          callback(error);
        }
      });
  }

  private updateReadDocs(change) {
    // update the meta db if a doc is deleted by a non-admin
    // admin dbs are updated by sentinel instead
    if (!change.deleted || this.sessionService.isOnlineOnly()) {
      return Promise.resolve();
    }

    const metaDb = this.dbService.get({ meta: true });

    return metaDb
      .get(this.readDocsProvider.getId(change.doc))
      .then((doc) => {
        doc._deleted = true;
        return metaDb.put(doc);
      })
      .catch((err) => {
        if (err.status !== 404) {
          // the doc hasn't been read yet
          throw err;
        }
      });
  }

  private changeHandler(change, callback) {
    return this
      .updateReadDocs(change)
      .then(() => this.getCount(callback));
  }

  init(callback) {
    this.callback = callback;
    // wait for meta db sync to avoid querying meta view before the ddoc was synced from the server
    this.dbSyncService
      .syncMeta()
      .then(() => {
        // get the initial count
        this.getCount(this.callback);

        // listen for changes in the medic db and update the count
        const statusMedicSubscription = this.changesService.subscribe({
          key: 'read-status-medic',
          debounce: 500, // Reacting once all consecutive changes are done (example: after replication of docs)
          filter: (change) => change.doc && change.doc.type === 'data_record',
          callback: (change) => this.changeHandler(change, this.callback)
        });
        this.subscriptions.add(statusMedicSubscription);

        // listen for changes in the meta db and update the count
        const statusMetaSubscription = this.changesService.subscribe({
          metaDb: true,
          key: 'read-status-meta',
          debounce: 500, // Reacting once all consecutive changes are done (example: after replication of docs
          callback: () => this.getCount(this.callback)
        });
        this.subscriptions.add(statusMetaSubscription);
      });
  }

  count() {
    return this.getCount(this.callback);
  }

}
