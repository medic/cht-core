import { Injectable, NgZone } from '@angular/core';
import * as _ from 'lodash-es';
import * as moment from 'moment';
import * as Search from '@medic/search';
import * as CalendarInterval from '@medic/calendar-interval';

import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { GetDataRecordsService } from '@mm-services/get-data-records.service';
import { TelemetryService } from '@mm-services/telemetry.service';

@Injectable({
  providedIn: 'root'
})
export class SearchFactoryService {
  constructor() {}

  get(dbService) {
    return Search(Promise, dbService.get());
  }
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private searchFactory;
  constructor(
    private dbService:DbService,
    private sessionService:SessionService,
    private getDataRecordsService:GetDataRecordsService,
    private searchFactoryService:SearchFactoryService,
    private telemetryService:TelemetryService,
    private ngZone:NgZone,
  ) {
    this.searchFactory = this.searchFactoryService.get(this.dbService);
  }

  private _currentQuery:any = {};

  // Silently cancel repeated queries.
  private debounce(type, filters, options) {
    if (type === this._currentQuery.type &&
      _.isEqual(filters, this._currentQuery.filters) &&
      _.isEqual(options, this._currentQuery.options)) {
      return true;
    }
    this._currentQuery.type = type;
    this._currentQuery.filters = Object.assign({}, filters);
    this._currentQuery.options = Object.assign({}, options);
    return false;
  }

  private getLastVisitedDates(searchResults, searchResultsCache, settings) {
    settings = settings || {};
    const interval = CalendarInterval.getCurrent(settings.monthStartDate);
    const visitStats = {};

    searchResults.forEach((id) => {
      visitStats[id] = { lastVisitedDate: -1, visitDates: [] };
    });

    const getVisitsInInterval = () => {
      return this.dbService
        .get()
        .query('medic-client/visits_by_date', { start_key: interval.start, end_key: interval.end })
        .then((result) => {
          result.rows.forEach((row) => {
            if (visitStats[row.value]) {
              visitStats[row.value].visitDates.push(moment(row.key).startOf('day').valueOf());
            }
          });
        });
    };

    const setLastVisitedDate = (rows) => {
      rows.forEach((row) => {
        if (visitStats[row.key]) {
          visitStats[row.key].lastVisitedDate = _.isObject(row.value) ? row.value.max : row.value;
        }
      });
    };

    const getLastVisited = () => {
      if (searchResultsCache) {
        // when sorting by last visited date, we receive the data from Search library
        return setLastVisitedDate(searchResultsCache);
      }

      let query;
      if (this.sessionService.isOnlineOnly()) {
        query = this.dbService.get().query(
          'medic-client/contacts_by_last_visited',
          { reduce: true, group: true, keys: searchResults }
        );
      } else {
        // querying with keys in PouchDB is very unoptimal
        query = this.dbService.get().query(
          'medic-client/contacts_by_last_visited',
          { reduce: true, group: true }
        );
      }

      return query.then((result) => {
        setLastVisitedDate(result.rows);
      });
    };

    return getVisitsInInterval()
      .then(getLastVisited)
      .then(() => {
        return Object.keys(visitStats)?.map((key) => {
          return {
            key: key,
            value: {
              lastVisitedDate: visitStats[key].lastVisitedDate,
              visitCount: _.uniq(visitStats[key].visitDates).length,
              visitCountGoal: settings.visitCountGoal
            }
          };
        });
      });
  }

  search(type, filters, options:any = {}, extensions:any = {}, docIds: any[] | undefined = undefined) {
    return this.ngZone.runOutsideAngular(() => this._search(type, filters, options, extensions, docIds));
  }

  private _search(type, filters, options:any = {}, extensions:any = {}, docIds: any[] | undefined = undefined) {
    console.debug('Doing Search', type, filters, options, extensions);

    _.defaults(options, {
      limit: 50,
      skip: 0
    });

    if (!options.force && this.debounce(type, filters, options)) {
      return Promise.resolve([]);
    }
    const before = performance.now();
    return this
      .searchFactory(type, filters, options, extensions)
      .then((searchResults) => {
        const timing = performance.now() - before;
        const filterKeys = Object.keys(filters).filter(f => filters[f]).sort();
        const telemetryKey = ['search', type, ...filterKeys].join(':');
        // Will end up with entries like:
        //   search:reports:search                      <-- text search of reports
        //   search:reports:date:search:valid:verified  <-- maximum selected search of reports with text search
        //   search:contacts:search                     <-- text search of contacts
        //   search:contacts:types                      <-- default viewing of contact list
        this.telemetryService.record(telemetryKey, timing);

        if (docIds && docIds.length) {
          docIds.forEach((docId) => {
            if (searchResults.docIds.indexOf(docId) === -1) {
              searchResults.docIds.push(docId);
            }
          });
        }
        const dataRecordsPromise = this.getDataRecordsService.get(searchResults.docIds, options);

        if (!extensions.displayLastVisitedDate) {
          return dataRecordsPromise;
        }


        const lastVisitedDatePromise = this.getLastVisitedDates(
          searchResults.docIds,
          searchResults.queryResultsCache,
          extensions.visitCountSettings
        );

        return Promise
          .all([
            dataRecordsPromise,
            lastVisitedDatePromise
          ])
          .then(([dataRecords, lastVisitedDates]) => {
            lastVisitedDates.forEach((dateResult) => {
              const relevantDataRecord = dataRecords.find((dataRecord) => {
                return dataRecord._id === dateResult.key;
              });

              if (relevantDataRecord) {
                Object.assign(relevantDataRecord, dateResult.value);
                relevantDataRecord.sortByLastVisitedDate = extensions.sortByLastVisitedDate;
              }
            });

            return dataRecords;
          });
      })
      .then((results) => {
        this._currentQuery = {};
        return results;
      })
      .catch((err) => {
        this._currentQuery = {};
        throw err;
      });
  }
}
