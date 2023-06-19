import { Injectable, NgZone } from '@angular/core';
import { lastValueFrom, Subject } from 'rxjs';
import { Store } from '@ngrx/store';

import { SessionService } from '@mm-services/session.service';
import * as purger from '../../js/bootstrapper/purger';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { DbSyncRetryService } from '@mm-services/db-sync-retry.service';
import { DbService } from '@mm-services/db.service';
import { AuthService } from '@mm-services/auth.service';
import { CheckDateService } from '@mm-services/check-date.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { GlobalActions } from '@mm-actions/global';
import { TranslateService } from '@mm-services/translate.service';
import { MigrationsService } from '@mm-services/migrations.service';
import { HttpClient } from '@angular/common/http';

const READ_ONLY_TYPES = ['form', 'translations'];
const READ_ONLY_IDS = ['resources', 'branding', 'service-worker-meta', 'zscore-charts', 'settings', 'partners'];
const DDOC_PREFIX = ['_design/'];
const LAST_REPLICATED_SEQ_KEY = 'medic-last-replicated-seq';
const LAST_REPLICATED_DATE_KEY = 'medic-last-replicated-date';
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const META_SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes
const BATCH_SIZE = 100;

const readOnlyFilter = function(doc) {
  // Never replicate "purged" documents upwards
  const keys = Object.keys(doc);
  if (keys.length === 4 &&
    keys.includes('_id') &&
    keys.includes('_rev') &&
    keys.includes('_deleted') &&
    keys.includes('purged')) {
    return false;
  }

  // don't try to replicate read only docs back to the server
  return (
    READ_ONLY_TYPES.indexOf(doc.type) === -1 &&
    READ_ONLY_IDS.indexOf(doc._id) === -1 &&
    doc._id.indexOf(DDOC_PREFIX) !== 0
  );
};
// PouchDB uses this value to generate a replication id. Because of non-deterministic minification, there's a high risk
// of invalidating existent replication checkpointers after upgrade, causing users to restart upwards replication.
readOnlyFilter.toString = () => '';

export enum SyncStatus {
  Unknown = 'unknown',
  Disabled = 'disabled',
  InProgress = 'inProgress',
  Success = 'success',
  Required = 'required',
}

type SyncState = {
  state?: SyncStatus;
  to?: SyncStatus;
  from?: SyncStatus;
};

type SyncStateListener = Parameters<Subject<SyncState>['subscribe']>[0];

@Injectable({
  providedIn: 'root'
})
export class DBSyncService {
  constructor(
    private dbService:DbService,
    private sessionService:SessionService,
    private authService:AuthService,
    private rulesEngineService:RulesEngineService,
    private dbSyncRetryService:DbSyncRetryService,
    private ngZone:NgZone,
    private checkDateService:CheckDateService,
    private telemetryService:TelemetryService,
    private store:Store,
    private translateService:TranslateService,
    private migrationsService:MigrationsService,
    private http:HttpClient,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  private globalActions: GlobalActions;
  private inProgressSync;
  private knownOnlineState = window.navigator.onLine;
  private syncIsRecent = false; // true when a replication has succeeded within one interval
  private readonly intervalPromises = {
    sync: undefined,
    meta: undefined,
  };

  private readonly observable = new Subject<SyncState>();

  isEnabled() {
    return !this.sessionService.isOnlineOnly();
  }

  private replicateToRetry({ batchSize=BATCH_SIZE }={}) {
    const telemetryEntry = new DbSyncTelemetry(
      this.telemetryService,
      'medic',
      'to',
      this.getLastReplicationDate(),
    );

    const options = {
      filter: readOnlyFilter,
      batch_size: batchSize
    };

    const remote = this.dbService.get({ remote: true });
    return this.dbService.get()
      .replicate
      .to(remote, options)
      .on('denied', (err) => {
        console.error(`Denied replicating to remote server`, err);
        this.dbSyncRetryService.retryForbiddenFailure(err);
        telemetryEntry.recordDenied();
      })
      .on('error', (err) => {
        console.error(`Error replicating to remote server`, err);
        telemetryEntry.recordFailure(err, this.knownOnlineState);
      })
      .then(info => {
        console.debug(`Replication to successful`, info);
        telemetryEntry.recordSuccess(info);
      })
      .catch(err => {
        if (err.code === 413 && batchSize > 1) {
          batchSize = Math.floor(batchSize / 2);
          console.warn('Error attempting to replicate too much data to the server. ' +
            `Trying again with batch size of ${batchSize}`);
          return this.replicateToRetry({ batchSize });
        }
        console.error(`Error replicating to remote server`, err);
        throw err;
      });
  }

  private async replicateTo() {
    if (!await this.authService.has('can_edit')) {
      // not authorized to replicate - that's ok, skip silently
      return;
    }

    try {
      await this.replicateToRetry();
    } catch (err) {
      return err;
    }
  }

  private async downloadDocsBatch (batch) {
    if (!batch.length) {
      return;
    }

    const res = await this.dbService.get({ remote: true }).bulkGet({ docs: batch, attachments: true });
    const docs = res.results
      .map(result => result.docs && result.docs[0] && result.docs[0].ok)
      .filter(doc => doc);
    await this.dbService.get().bulkDocs(docs, { new_edits: false });
  }

  private async replicateFrom() {
    try {
      const remoteDocIdsRevs = await this.getRemoteDocs();
      const localDocs = await this.dbService.get().allDocs();

      const localIdRevMap = Object.assign({}, ...localDocs.rows.map(row => ({ [row.id]: row.value?.rev })));
      const remoteIdRevMap = Object.assign({}, ...remoteDocIdsRevs.map(({ id, rev }) => ({ [id]: rev })));

      await this.getMissingDocs(localIdRevMap, remoteDocIdsRevs);
      await this.getDeletesAndPurges(localIdRevMap, remoteIdRevMap);
    } catch (err) {
      return err;
    }
  }

  private async getRemoteDocs() {
    const getIdsReq = this.http.get<{ doc_ids_revs: { id; rev }[]}>(
      '/api/v1/replication/get-ids',
      { responseType: 'json' }
    );
    const response = await lastValueFrom(getIdsReq);
    return response.doc_ids_revs;
  }

  private async getMissingDocs(localIdRevMap, remoteDocIdsRevs) {
    const docIdRevsToDownload = remoteDocIdsRevs
      .filter(({ id, rev }) => !localIdRevMap[id] || localIdRevMap[id] !== rev);

    do {
      const batch = docIdRevsToDownload.splice(0, BATCH_SIZE);
      await this.downloadDocsBatch(batch);
    } while (docIdRevsToDownload.length > 0);
  }

  private async getDeletesAndPurges(localIdRevMap, remoteIdRevMap) {
    const missingRemoteIds = Object.keys(localIdRevMap).filter(id => !remoteIdRevMap[id]);

    const getDeleteListReq =  this.http.post<{ doc_ids: []}>(
      '/api/v1/replication/get-deletes',
      { doc_ids: missingRemoteIds },
      { responseType: 'json' }
    );
    const localIdsToDelete = (await lastValueFrom(getDeleteListReq)).doc_ids;
    const deleteDocs = localIdsToDelete.map(id => ({ _id: id, _rev: localIdRevMap[id], _deleted: true, purged: true }));
    await this.dbService.get().bulkDocs(deleteDocs);
  }

  private getCurrentSeq() {
    return this.dbService.get().info().then(info => info.update_seq + '');
  }

  private getLastReplicatedSeq() {
    return window.localStorage.getItem(LAST_REPLICATED_SEQ_KEY);
  }

  private getLastReplicationDate() {
    return window.localStorage.getItem(LAST_REPLICATED_DATE_KEY);
  }

  private async syncMedic(force?, quick?) {
    if (!this.knownOnlineState && !force) {
      return Promise.resolve();
    }

    await this.checkDateService.check();

    if (this.inProgressSync) {
      this.sendUpdate({ state: SyncStatus.InProgress });
      return this.inProgressSync;
    }

    try {
      this.sendUpdate({ state: SyncStatus.InProgress });
      this.inProgressSync = true;

      const replicationErrors = { to: null, from: null };
      replicationErrors.to = await this.replicateTo();

      if (force || !quick) {
        replicationErrors.from = await this.replicateFrom();
      }

      const currentSeq = await this.getCurrentSeq();
      let syncState: SyncState = { to: SyncStatus.Success, from: SyncStatus.Success };
      if (!replicationErrors.to && !replicationErrors.from) {
        this.syncIsRecent = true;
        window.localStorage.setItem(LAST_REPLICATED_SEQ_KEY, currentSeq);
      } else if (currentSeq === this.getLastReplicatedSeq()) {
        // no changes to send, but may have some to receive
        syncState = { state: SyncStatus.Unknown };
      } else {
        // definitely need to sync something
        Object.keys(replicationErrors).forEach((directionName: 'to' | 'from') => {
          syncState[directionName] = SyncStatus.Required;
        });
      }
      if (syncState.to === SyncStatus.Success) {
        window.localStorage.setItem(LAST_REPLICATED_DATE_KEY, Date.now() + '');
      }

      if (force) {
        this.displayUserFeedback(syncState);
      }
      this.sendUpdate(syncState);
    } finally {
      this.inProgressSync = undefined;
    }
  }

  private syncMeta() {
    const telemetryEntry = new DbSyncTelemetry(this.telemetryService, 'meta', 'sync');
    const remote = this.dbService.get({ meta: true, remote: true });
    const local = this.dbService.get({ meta: true });
    let currentSeq;
    return local
      .info()
      .then(info => currentSeq = info.update_seq)
      .then(() => Promise.all([
        local.replicate.to(remote),
        local.replicate.from(remote),
      ]))
      .then(([ push, pull ]) => {
        telemetryEntry.recordSuccess({ push, pull });
      })
      .catch(err => {
        telemetryEntry.recordFailure(err, this.knownOnlineState);
      })
      .then(() => this.ngZone.runOutsideAngular(() => {
        purger.writeMetaPurgeLog(local, { syncedSeq: currentSeq });
      }));
  }

  private sendUpdate(syncState: SyncState) {
    this.observable.next(syncState);
  }

  private resetSyncInterval() {
    if (this.intervalPromises.sync) {
      clearInterval(this.intervalPromises.sync);
      this.intervalPromises.sync = undefined;
    }

    this.intervalPromises.sync = setInterval(() => {
      this.syncIsRecent = false;
      this.sync();
    }, SYNC_INTERVAL);
  }

  private displayUserFeedback(syncState: SyncState) {
    if (syncState.to === SyncStatus.Success && syncState.from === SyncStatus.Success) {
      this.globalActions.setSnackbarContent(this.translateService.instant('sync.status.not_required'));
      return;
    }

    this.globalActions.setSnackbarContent(
      this.translateService.instant('sync.feedback.failure.unknown'),
      {
        label: this.translateService.instant('sync.retry'),
        onClick: () => this.sync(true),
      },
    );
  }

  subscribe(listener: SyncStateListener) {
    return this.observable.subscribe(listener);
  }

  /**
  * Boolean representing if sync is currently in progress
  */
  isSyncInProgress() {
    return !!this.inProgressSync;
  }

  /**
  * Set the current user's online status to control when replications will be attempted.
  *
  * @param newOnlineState {Boolean} The current online state of the user.
  */
  setOnlineStatus(onlineStatus) {
    if (this.knownOnlineState !== onlineStatus) {
      this.knownOnlineState = !!onlineStatus;

      if (this.knownOnlineState && !this.syncIsRecent) {
        this.resetSyncInterval();
        return this.syncMedic();
      }
    }
  }

  private async migrateDb() {
    try {
      await this.migrationsService.runMigrations();
    } catch (err) {
      if (this.knownOnlineState) {
        console.error('Error while running DB migrations', err);
      }
      this.sendUpdate({ state: SyncStatus.Unknown });
      throw err;
    }
  }

  /**
  * Synchronize the local database with the remote database.
  *
  * @returns Promise which resolves when both directions of the replication complete.
  */
  async sync(force?, quick?) {
    if (!this.isEnabled()) {
      this.sendUpdate({ state: SyncStatus.Disabled });
      return Promise.resolve();
    }

    await this.migrateDb();

    if (force) {
      this.globalActions.setSnackbarContent(this.translateService.instant('sync.status.in_progress'));
      this.telemetryService.record('replication:user-initiated');
    }

    if (!this.intervalPromises.meta || force) {
      this.intervalPromises.meta = setInterval(this.syncMeta.bind(this), META_SYNC_INTERVAL);
      this.syncMeta();
    }

    this.resetSyncInterval();
    return this.syncMedic(force, quick);
  }
}

class DbSyncTelemetry {
  private readonly telemetryKeyword = 'replication';
  private readonly failedToFetch = 'Failed to fetch';
  private readonly failedToParse = 'Unexpected token';
  private readonly database;
  private readonly direction;
  private readonly start;
  private readonly lastReplicated;
  private readonly key;
  private end;

  constructor(
    public telemetryService:TelemetryService,
    database,
    direction,
    lastReplicated?,
  ) {
    this.database = database;
    this.direction = direction;
    this.start = Date.now();
    this.lastReplicated = lastReplicated;
    this.key = `${this.telemetryKeyword}:${this.database}:${this.direction}`;
  }

  private getSuccessKey() {
    return `${this.key}:success`;
  }

  private getFailureKey() {
    return `${this.key}:failure`;
  }

  private getDocsKey() {
    return `${this.key}:docs`;
  }

  private getErrorKey() {
    return `${this.getFailureKey()}:reason:error`;
  }

  private getDeniedKey() {
    return `${this.key}:denied`;
  }

  private getOfflineKey(service) {
    return `${this.getFailureKey()}:reason:offline:${service}`;
  }

  private getLastReplicatedKey() {
    return `${this.key}:ms-since-last-replicated-date`;
  }

  private async record(key) {
    this.end = Date.now();
    await this.telemetryService.record(key, this.end - this.start);
    if (this.lastReplicated) {
      await this.telemetryService.record(this.getLastReplicatedKey(), this.start - this.lastReplicated);
    }
  }

  private recordInfo(info?) {
    if (info) {
      const nbrDocs = info.push ?
        (info.push?.docs_read + info.pull?.docs_read) : // result of .sync contains info for push and pull
        info.docs_read; // result of .replicate contains info for just one direction
      return this.telemetryService.record(this.getDocsKey(), nbrDocs);
    }
    return Promise.resolve();
  }

  private isOfflineError(error) {
    if (!error || typeof error.message !== 'string') {
      return false;
    }

    return error.message.startsWith(this.failedToFetch) ||
      error.message.startsWith(this.failedToParse);
  }

  async recordSuccess(info?) {
    await this.record(this.getSuccessKey());
    await this.recordInfo(info);
  }

  async recordFailure(error, knownOnlineState) {
    await this.record(this.getFailureKey());
    await this.recordInfo(error?.result);

    if (this.isOfflineError(error)) {
      const offlineService = knownOnlineState ? 'server' : 'client';
      await this.telemetryService.record(this.getOfflineKey(offlineService));
    } else {
      await this.telemetryService.record(this.getErrorKey());
    }
  }

  async recordDenied() {
    await this.telemetryService.record(this.getDeniedKey());
  }
}
