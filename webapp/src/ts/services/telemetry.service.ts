import { Inject, Injectable, NgZone } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { v4 as uuidv4 } from 'uuid';

import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { IndexedDbService } from '@mm-services/indexed-db.service';

@Injectable({
  providedIn: 'root'
})
export class TelemetryService {
  private readonly TELEMETRY_PREFIX = 'telemetry';
  private readonly POUCH_PREFIX = '_pouch_';
  private readonly NAME_DIVIDER = '-';
  // Intentionally scoped to the whole browser (for this domain). We can then tell if multiple users use the same device
  private readonly DEVICE_ID_KEY = 'medic-telemetry-device-id';
  private isAggregationRunning = false;
  private hasTransitionFinished = false;
  private windowRef;

  constructor(
    private dbService:DbService,
    private sessionService:SessionService,
    private ngZone:NgZone,
    private indexedDbService:IndexedDbService,
    @Inject(DOCUMENT) private document:Document,
  ) {
    this.windowRef = this.document.defaultView;
  }

  getUniqueDeviceId() {
    let uniqueDeviceId = this.windowRef.localStorage.getItem(this.DEVICE_ID_KEY);

    if (!uniqueDeviceId) {
      uniqueDeviceId = uuidv4();
      this.windowRef.localStorage.setItem(this.DEVICE_ID_KEY, uniqueDeviceId!);
    }

    return uniqueDeviceId;
  }

  private convertReduceToKeyValues(reduce) {
    const kv = {};

    reduce.rows.forEach(row => kv[row.key] = row.value);

    return kv;
  }

  private generateAggregateDocId(metadata) {
    return [
      this.TELEMETRY_PREFIX,
      metadata.year,
      metadata.month,
      metadata.day,
      metadata.user,
      metadata.deviceId,
    ].join(this.NAME_DIVIDER);
  }

  private generateTelemetryDBName(today: TodayMoment): string {
    return [
      this.TELEMETRY_PREFIX,
      today.formatted,
      // Scoped by user as they may perform a different role (online vs offline) with different performance implications
      this.sessionService.userCtx().name,
    ].join(this.NAME_DIVIDER);
  }

  private generateMetadataSection(dbName) {
    return Promise
      .all([
        this.dbService.get().get('_design/medic-client'),
        this.dbService.get().query('medic-client/doc_by_type', { key: ['form'], include_docs: true }),
        this.dbService.get().allDocs({ key: 'settings' })
      ])
      .then(([ ddoc, formResults, settingsResults ]) => {
        const date = this.getDBDate(dbName);
        const version = ddoc?.build_info?.version || 'unknown';
        const forms = formResults.rows.reduce((keyToVersion, row) => {
          keyToVersion[row.doc.internalId] = row.doc._rev;

          return keyToVersion;
        }, {});

        return {
          year: date.year,
          month: date.month,
          day: date.date,
          aggregate_date: new Date().toISOString(),
          user: this.sessionService.userCtx().name,
          deviceId: this.getUniqueDeviceId(),
          versions: {
            app: version,
            forms: forms,
            settings: settingsResults?.rows?.[0].value?.rev,
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

  private isValidTelemetryDBName(dbName): boolean {
    const expression = new RegExp(`^${this.TELEMETRY_PREFIX}-[0-9]{4}-[0-1]?[0-9]-[0-3]?[0-9].*`, 'g');
    return expression.test(dbName);
  }

  private async getTelemetryDBs(databaseNames): Promise<undefined|string[]> {
    return databaseNames
      ?.map(dbName => dbName?.replace(this.POUCH_PREFIX, '') || '')
      .filter(dbName => this.isValidTelemetryDBName(dbName));
  }

  /**
   * This should never happen (famous last words..), because we should only
   * generate a new document for every month, which is part of the _id.
   */
  private storeConflictedAggregate(aggregateDoc) {
    aggregateDoc.metadata.conflicted = true;
    aggregateDoc._id = [ aggregateDoc._id, 'conflicted', Date.now() ].join(this.NAME_DIVIDER);

    return this.dbService
      .get({meta: true})
      .put(aggregateDoc);
  }

  private getDBDate(dbName) {
    const parts = dbName.split(this.NAME_DIVIDER);
    return {
      year: Number(parts[1]),
      month: Number(parts[2]),
      date: Number(parts[3]),
    };
  }

  /**
   * Emit the value of the doc.
   * Skip over values that aren't numeric because they will cause an Error in the "_stats" reduce function.
   * Exposed for unit testing.
   * @param doc The db doc to map.
   * @param emit A function called with the key and value to map the doc to.
   */
  _aggregateMap(doc, emit) {
    const val = doc.value;
    if (typeof val === 'number' && !Number.isNaN(val)) {
      emit(doc.key, val);
    }
  }

  private aggregateMapReduce(db) {
    return db.query(
      {
        map: this._aggregateMap,
        reduce: '_stats',
      },
      { group: true }
    );
  }

  private async aggregate(db, dbName) {
    const [ metadata, dbInfo, reduceResult ] = await Promise.all([
      this.generateMetadataSection(dbName),
      this.dbService.get().info(),
      this.aggregateMapReduce(db),
    ]);

    const aggregateDoc = {
      _id: this.generateAggregateDocId(metadata),
      type: this.TELEMETRY_PREFIX,
      metrics: this.convertReduceToKeyValues(reduceResult),
      device: this.generateDeviceStats(),
      metadata,
      dbInfo,
    };

    try {
      await this.dbService
        .get({ meta: true })
        .put(aggregateDoc);
    } catch (error) {
      if (error.status === 409) {
        return this.storeConflictedAggregate(aggregateDoc);
      }
      throw error;
    }
  }

  /**
   * Moment when the aggregation starts (i.e. the beginning of the current day)
   */
  private getToday(): TodayMoment {
    const today = new Date();
    return {
      today,
      formatted: `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`,
    };
  }

  private async getCurrentTelemetryDB(today: TodayMoment, telemetryDBs) {
    let currentDB = telemetryDBs?.find(db => db.includes(today.formatted));

    if (!currentDB) {
      currentDB = this.generateTelemetryDBName(today);
    }

    await this.indexedDbService.saveDatabaseName(currentDB); // Firefox support.
    return this.windowRef.PouchDB(currentDB); // Avoid angular-pouch as digest isn't necessary here
  }

  private storeIt(db, key, value) {
    return db.post({
      key: key,
      value: value,
      date_recorded: Date.now(),
    });
  }

  private async submitIfNeeded(today: TodayMoment, telemetryDBs: string[] = []) {
    if (this.isAggregationRunning) {
      // Avoid multiple calls of the telemetry record function to prevent from doing duplicate aggregation work.
      // It can throw "Failed to execute transaction on IDBDatabase" exception.
      return;
    }

    for (const dbName of telemetryDBs) {
      if (dbName.includes(today.formatted)) {
        // Don't submit today's telemetry records
        continue;
      }

      try {
        this.isAggregationRunning = true;
        const db = this.windowRef.PouchDB(dbName);
        await this.aggregate(db, dbName);
        await db.destroy();
        await this.indexedDbService.deleteDatabaseName(dbName); // Firefox support.
      } catch (error) {
        console.error('Error when aggregating the telemetry records', error);
      } finally {
        this.isAggregationRunning = false;
      }
    }
  }

  private closeDataBase(db) {
    if (!db || db?._destroyed || db?._closed) {
      return;
    }

    try {
      db.close();
    } catch (error) {
      console.error('Error closing telemetry DB', error);
    }
  }

  /**
   * Records a piece of telemetry.
   *
   * Specifically, a unique key that will be aggregated against, and if you
   * are recording a timing (as opposed to an event) a value.
   *
   * The first time this API is called each month, the telemetry recording
   * is followed by an aggregation of all the previous months' data.
   * Aggregation is done using the `_stats` reduce function, which
   * generates data like so:
   *
   * {
   *   metric_a:  { sum: 492, min: 123, max: 123, count: 4, sumsqr: 60516 },
   *   metric_b:  { sum: -16, min: -4, max: -4, count: 4, sumsqr: 64 }
   * }
   *
   * See: https://docs.couchdb.org/en/stable/ddocs/ddocs.html#_stats
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
  record (key, value?) {
    return this.ngZone.runOutsideAngular(() => this._record(key, value));
  }

  private async _record(key, value?) {
    if (value === undefined) {
      value = 1;
    }
    if (typeof value !== 'number' || Number.isNaN(value)) {
      console.error(new Error(`Invalid telemetry value "${value}" for key "${key}"`));
      return;
    }

    try {
      const today = this.getToday();
      const databaseNames = await this.indexedDbService.getDatabaseNames();
      await this.deleteDeprecatedTelemetryDB(databaseNames);
      const telemetryDBs = await this.getTelemetryDBs(databaseNames);
      await this.submitIfNeeded(today, telemetryDBs);
      const currentDB = await this.getCurrentTelemetryDB(today, telemetryDBs);
      await this
        .storeIt(currentDB, key, value)
        .finally(() => this.closeDataBase(currentDB));
    } catch (error) {
      console.error('Error in telemetry service', error);
    }
  }

  /**
   * ToDo: Remove this function in a future release: https://github.com/medic/cht-core/issues/8657
   * The way telemetry was stored in the client side changed (https://github.com/medic/cht-core/pull/8555),
   * this function contains all the transition code where it deletes the old Telemetry DB from the DB.
   * It was decided to not aggregate the DB content.
   * @private
   */
  private async deleteDeprecatedTelemetryDB(databaseNames) { //NOSONAR
    if (this.hasTransitionFinished) {
      return;
    }

    databaseNames?.forEach(dbName => {
      const nameNoPrefix = dbName?.replace(this.POUCH_PREFIX, '') || '';

      // Skips new Telemetry DB, then matches malformed or the old deprecated Telemetry DB.
      if (!this.isValidTelemetryDBName(nameNoPrefix)
        && nameNoPrefix.includes(this.TELEMETRY_PREFIX)
        && nameNoPrefix.includes(this.sessionService.userCtx().name)) {
        console.warn(`Invalid telemetry database name, deleting database. Name: ${nameNoPrefix}`);
        this.windowRef?.indexedDB.deleteDatabase(dbName);
      }
    });

    Object
      .keys(this.windowRef?.localStorage)
      .forEach(key => {
        if (key.includes('telemetry-date') || key.includes('telemetry-db')) {
          this.windowRef?.localStorage.removeItem(key);
        }
      });

    this.hasTransitionFinished = true;
  }
}

type TodayMoment = {
  today: Record<string, any>;
  formatted: string;
}
