import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

import { SessionService } from '@mm-services/session.service';
import * as purger from '../../js/bootstrapper/purger';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { DbSyncRetryService } from '@mm-services/db-sync-retry.service';
import { DbService } from '@mm-services/db.service';
import { AuthService } from '@mm-services/auth.service';

const LAST_REPLICATED_SEQ_KEY = 'medic-last-replicated-seq';
const LAST_REPLICATED_DATE_KEY = 'medic-last-replicated-date';
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const META_SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes

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
  ) {}

  private loadFilterFn() {
    if (this.DIRECTIONS[0].options.filter) {
      return Promise.resolve();
    }

    return this.dbService.get().get('_design/medic-client').then(ddoc => {
      this.DIRECTIONS[0].options.filter = new Function(`return ${ddoc.filters.db_sync}`)();
    });
  }

  private readonly DIRECTIONS = [
    {
      name: 'to',
      options: {
        filter: undefined,
        checkpoint: 'source',
      },
      allowed: () => this.authService.has('can_edit'),
      onDenied: (err?) => this.dbSyncRetryService.retryForbiddenFailure(err),
    },
    {
      name: 'from',
      options: {
        heartbeat: 10000, // 10 seconds
        timeout: 1000 * 60 * 10, // 10 minutes
      },
      allowed: () => Promise.resolve(true),
      onChange: (replicationResult?) => this.rulesEngineService.monitorExternalChanges(replicationResult),
    }
  ];

  private inProgressSync;
  private knownOnlineState = true; // assume the user is online
  private syncIsRecent = false; // true when a replication has succeeded within one interval
  private readonly intervalPromises = {
    sync: undefined,
    meta: undefined,
  };
  private readonly observable = new Subject();

  isEnabled() {
    return !this.sessionService.isOnlineOnly();
  }

  private replicate (direction, { batchSize=100 }={}) {
    const remote = this.dbService.get({ remote: true });
    const options = Object.assign({}, direction.options, { batch_size: batchSize });
    return this.dbService.get()
      .replicate[direction.name](remote, options)
      .on('change', replicationResult => {
        if (direction.onChange) {
          direction.onChange(replicationResult);
        }
      })
      .on('denied', (err) => {
        console.error(`Denied replicating ${direction.name} remote server`, err);
        if (direction.onDenied) {
          direction.onDenied(err);
        }
      })
      .on('error', (err) => {
        console.error(`Error replicating ${direction.name} remote server`, err);
      })
      .then(info => {
        console.debug(`Replication ${direction.name} successful`, info);
        return;
      })
      .catch(err => {
        if (err.code === 413 && direction.name === 'to' && batchSize > 1) {
          batchSize = Math.floor(batchSize / 2);
          console.warn('Error attempting to replicate too much data to the server. ' +
            `Trying again with batch size of ${batchSize}`);
          return this.replicate(direction, { batchSize });
        }
        console.error(`Error replicating ${direction.name} remote server`, err);
        return direction.name;
      });
  }

  private replicateIfAllowed(direction) {
    return direction.allowed().then(allowed => {
      if (!allowed) {
        // not authorized to replicate - that's ok, skip silently
        return;
      }
      return this.replicate(direction);
    });
  }

  private getCurrentSeq() {
    return this.dbService.get().info().then(info => info.update_seq + '');
  }
  private getLastReplicatedSeq() {
    return window.localStorage.getItem(LAST_REPLICATED_SEQ_KEY);
  }

  private syncMedic(force?) {
    if (!this.knownOnlineState && !force) {
      return Promise.resolve();
    }

    if (!this.inProgressSync) {
      this.inProgressSync = this
        .loadFilterFn()
        .then(() => Promise.all(this.DIRECTIONS.map(direction => this.replicateIfAllowed(direction))))
        .then(errs => {
          return this.getCurrentSeq().then(currentSeq => {
            errs = errs.filter(err => err);
            let update:any = { to: 'success', from: 'success' };
            if (!errs.length) {
              // no errors
              this.syncIsRecent = true;
              window.localStorage.setItem(LAST_REPLICATED_SEQ_KEY, currentSeq);
            } else if (currentSeq === this.getLastReplicatedSeq()) {
              // no changes to send, but may have some to receive
              update = { state: 'unknown' };
            } else {
              // definitely need to sync something
              errs.forEach(err => {
                update[err] = 'required';
              });
            }
            if (update.to === 'success') {
              window.localStorage.setItem(LAST_REPLICATED_DATE_KEY, Date.now() + '');
            }
            this.sendUpdate(update);
          });
        })
        .finally(() => {
          this.inProgressSync = undefined;
        });
    }

    this.sendUpdate({ state: 'inProgress' });
    return this.inProgressSync;
  }

  private syncMeta() {
    const remote = this.dbService.get({ meta: true, remote: true });
    const local = this.dbService.get({ meta: true });
    let currentSeq;
    return local
      .info()
      .then(info => currentSeq = info.update_seq)
      .then(() => local.sync(remote))
      .then(() => this.ngZone.runOutsideAngular(() => purger.writePurgeMetaCheckpoint(local, currentSeq)));
  }

  private sendUpdate(update) {
    this.observable.next(update);
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

  subscribe(listener) {
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

  /**
  * Synchronize the local database with the remote database.
  *
  * @returns Promise which resolves when both directions of the replication complete.
  */
  sync(force?) {
    if (!this.isEnabled()) {
      this.sendUpdate({ state: 'disabled' });
      return Promise.resolve();
    }

    if (!this.intervalPromises.meta) {
      this.intervalPromises.meta = setInterval(this.syncMeta.bind(this), META_SYNC_INTERVAL);
      this.syncMeta();
    }

    this.resetSyncInterval();
    return this.syncMedic(force);
  }
}
