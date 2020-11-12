import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import * as moment from 'moment';

import { DbService } from './db.service';
import { SessionService } from './session.service';

@Injectable({
  providedIn: 'root'
})
/**
 * TelemetryService: Records, aggregates, and submits telemetry data
 */
export class TelemetryService {
  // Intentionally scoped to the whole browser (for this domain). We can then tell if multiple users use the same device
  private readonly DEVICE_ID_KEY = 'medic-telemetry-device-id';
  private DB_ID_KEY;
  private LAST_AGGREGATED_DATE_KEY;

  private queue = Promise.resolve();

  constructor(
    private dbService: DbService,
    private sessionService: SessionService
  ) {
    // Intentionally scoped to the specific user, as they may perform a
    // different role (online vs. offline being being the most obvious) with different performance implications
    this.DB_ID_KEY = ['medic', this.sessionService.userCtx().name, 'telemetry-db'].join('-');
    this.LAST_AGGREGATED_DATE_KEY = ['medic', this.sessionService.userCtx().name, 'telemetry-date'].join('-');
  }

  private getDb() {
    let dbName = window.localStorage.getItem(this.DB_ID_KEY);

    if (!dbName) {
      // We're adding a UUID onto the end of the DB name to make it unique. In
      // the past we've had trouble with PouchDB being able to delete a DB and
      // then instantly create a new DB with the same name.
      dbName = 'medic-user-' + this.sessionService.userCtx().name + '-telemetry-' + uuidv4();
      window.localStorage.setItem(this.DB_ID_KEY, dbName);
    }
    return window.PouchDB(dbName); // avoid angular-pouch as digest isn't necessary here
  }

  private getUniqueDeviceId() {
    let uniqueDeviceId = window.localStorage.getItem(this.DEVICE_ID_KEY);

    if (!uniqueDeviceId) {
      uniqueDeviceId = uuidv4();
      window.localStorage.setItem(this.DEVICE_ID_KEY, uniqueDeviceId);
    }

    return uniqueDeviceId;
  }

  private getLastAggregatedDate() {
    let date = parseInt(window.localStorage.getItem(this.LAST_AGGREGATED_DATE_KEY));

    if (!date) {
      date = Date.now();
      window.localStorage.setItem(this.LAST_AGGREGATED_DATE_KEY, date.toString());
    }

    return date;
  }

  private storeIt(db, key, value) {
    return db.post({
      key: key,
      value: value,
      date_recorded: Date.now(),
    });
  }

  private submitIfNeeded(db) {
    const monthStart = moment().startOf('month');
    const dbDate = moment(this.getLastAggregatedDate());

    if (dbDate.isBefore(monthStart)) {
      return this
        .aggregate(db)
        .then(() => this.reset(db));
    }
  }

  private convertReduceToKeyValues(reduce) {
    const kv = {};

    reduce.rows.forEach(row => kv[row.key] = row.value);

    return kv;
  }

  private generateAggregateDocId(metadata) {
    return [
      'telemetry',
      metadata.year,
      metadata.month,
      metadata.user,
      metadata.deviceId,
    ].join('-');
  }

  private generateMetadataSection() {
    return Promise
      .all([
        this.dbService.get().get('_design/medic-client'),
        this.dbService.get().query('medic-client/doc_by_type', { key: ['form'], include_docs: true })
      ])
      .then(([ddoc, formResults]) => {
        const date = moment(this.getLastAggregatedDate());
        const version = (ddoc.deploy_info && ddoc.deploy_info.version) || 'unknown';
        const forms = formResults.rows.reduce((keyToVersion, row) => {
          keyToVersion[row.doc.internalId] = row.doc._rev;

          return keyToVersion;
        }, {});

        return {
          year: date.year(),
          month: date.month() + 1,
          user: this.sessionService.userCtx().name,
          deviceId: this.getUniqueDeviceId(),
          versions: {
            app: version,
            forms: forms
          }
        };
      });
  }

  private generateDeviceStats() {
    let deviceInfo = {};

    if ((<any>window).medicmobile_android && typeof (<any>window).medicmobile_android.getDeviceInfo === 'function') {
      deviceInfo = JSON.parse((<any>window).medicmobile_android.getDeviceInfo());
    }

    return {
      userAgent: window.navigator.userAgent,
      hardwareConcurrency: window.navigator.hardwareConcurrency,
      screen: {
        width: window.screen.availWidth,
        height: window.screen.availHeight,
      },
      deviceInfo
    };
  }

  // This should never happen (famous last words..), because we should only
  // generate a new document for every month, which is part of the _id.
  private storeConflictedAggregate(aggregateDoc) {
    aggregateDoc.metadata.conflicted = true;
    aggregateDoc._id = [aggregateDoc._id, 'conflicted', Date.now()].join('-');

    return this.dbService
      .get({meta: true})
      .put(aggregateDoc);
  }

  private aggregate(db) {
    const reduceQuery = db.query(
      {
        map: (doc, emit) => emit(doc.key, doc.value),
        reduce: '_stats',
      },
      {
        group: true,
      }
    );

    return Promise
      .all([
        reduceQuery,
        this.dbService.get().info(),
        this.generateMetadataSection()
      ])
      .then(qAll => {
        const reduceResult = qAll[0];
        const infoResult = qAll[1];
        const metadata = qAll[2];

        const aggregateDoc: any = { type: 'telemetry' };

        aggregateDoc.metrics = this.convertReduceToKeyValues(reduceResult);
        aggregateDoc.metadata = metadata;
        aggregateDoc._id = this.generateAggregateDocId(aggregateDoc.metadata);
        aggregateDoc.device = this.generateDeviceStats();
        aggregateDoc.dbInfo = infoResult;

        return this.dbService
          .get({ meta: true })
          .put(aggregateDoc)
          .catch(err => {
            if (err.status === 409) {
              return this.storeConflictedAggregate(aggregateDoc);
            }

            throw err;
          });
      });
  }

  private reset(db) {
    window.localStorage.removeItem(this.DB_ID_KEY);
    window.localStorage.removeItem(this.LAST_AGGREGATED_DATE_KEY);

    return db.destroy();
  }

  /**
   * Records a piece of telemetry.
   *
   * Specifically, a unique key that will be aggregated against, and if you
   * are recording a timing (as opposed to an event) a value.
   *
   * The first time this API is called each month, the telemetry recording
   * is followed by an aggregation of all of the previous months data.
   * Aggregation is done using the `_stats` reduce function, which
   * generates data like so:
   *
   * {
   *   metric_a:  { sum: 492, min: 123, max: 123, count: 4, sumsqr: 60516 },
   *   metric_b:  { sum: -16, min: -4, max: -4, count: 4, sumsqr: 64 }
   * }
   *
   * See: https://wiki.apache.org/couchdb/Built-In_Reduce_Functions#A_stats
   *
   * This single month aggregate document is of type 'telemetry', and is
   * stored in the user's meta DB (which replicates up to the main server)
   *
   * To collect the aggregate data execute: ./scripts/get_users_meta_docs.js
   *
   * NOTE: While this function returns a promise, this is primarily for
   * testing. It is not recommended you hold on to this promise and wait
   * for it to resolve, for performance reasons.
   *
   * @param      {String}   key     a unique key that will be aggregated
   *                                against later
   * @param      {Number}   value   number to be aggregated. Defaults to 1.
   * @returns    {Promise}  resolves once the data has been recorded and
   *                        aggregated if required
   * @memberof Telemetry
   */
  record(key, value?) {
    if (value === undefined) {
      value = 1;
    }

    let db;
    this.queue = this.queue
      .then(() => db = this.getDb())
      .then(() => this.storeIt(db, key, value))
      .then(() => this.submitIfNeeded(db))
      .catch(err => console.error('Error in telemetry service', err))
      .finally(() => {
        if (!db || db._destroyed || db._closed) {
          return;
        }

        try {
          db.close();
        } catch (err) {
          console.error('Error closing telemetry DB', err);
        }
      });

    return this.queue;
  }
}
