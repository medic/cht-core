import { Inject, Injectable, NgZone } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { v4 as uuidv4 } from 'uuid';
import * as moment from 'moment';

import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';

@Injectable({
  providedIn: 'root'
})
export class TelemetryService {
  private readonly TELEMETRY_PREFIX = 'telemetry';
  private readonly POUCH_PREFIX = '_pouch_';
  private readonly NAME_DIVIDER = '-';
  // Intentionally scoped to the whole browser (for this domain). We can then tell if multiple users use the same device
  private readonly DEVICE_ID_KEY = 'medic-telemetry-device-id';
  private windowRef;

  constructor(
    private dbService:DbService,
    private sessionService:SessionService,
    private ngZone:NgZone,
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

  private async getTelemetryDBs(): Promise<undefined|string[]> {
    const databases = await this.document.defaultView?.indexedDB?.databases();

    if (!databases?.length) {
      return;
    }

    return databases
      .map(db => db.name?.replace(this.POUCH_PREFIX, '') || '')
      .filter(dbName => dbName?.startsWith(this.TELEMETRY_PREFIX));
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
      year: parts[1],
      month: parts[2],
      date: parts[3],
    };
  }

  private async aggregate(db, dbName) {
    const metadata = await this.generateMetadataSection(dbName);
    const dbInfo = await this.dbService.get().info();
    const reduceResult = await db.query(
      { reduce: '_stats', map: (doc, emit) => emit(doc.key, doc.value) },
      { group: true }
    );

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
    const today = moment().startOf('day');
    return {
      today,
      formatted: today.format('YYYY-MM-DD'),
    };
  }

  private async getCurrentTelemetryDB(today: TodayMoment) {
    const telemetryDBs = await this.getTelemetryDBs();
    let currentDB = telemetryDBs?.find(db => db.includes(today.formatted));

    if (!currentDB) {
      currentDB = this.generateTelemetryDBName(today);
    }

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
    for (const dbName of telemetryDBs) {
      if (dbName.includes(today.formatted)) {
        // Don't submit today's telemetry records
        return;
      }

      const db = this.windowRef.PouchDB(dbName);
      await this.aggregate(db, dbName);
      db.destroy();
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

    let currentDB;
    try {
      const today = this.getToday();
      const telemetryDBs = await this.getTelemetryDBs();
      await this.submitIfNeeded(today, telemetryDBs);
      currentDB = await this.getCurrentTelemetryDB(today);
      await this.storeIt(currentDB, key, value);
    } catch (error) {
      console.error('Error in telemetry service', error);
    }

    if (!currentDB || currentDB?._destroyed || currentDB?._closed) {
      return;
    }

    try {
      currentDB.close();
    } catch (error) {
      console.error('Error closing telemetry DB', error);
    }
  }
}

type TodayMoment = {
  today: Record<string, any>;
  formatted: string;
}
