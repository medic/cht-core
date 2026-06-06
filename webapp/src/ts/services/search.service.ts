import { Injectable, NgZone } from '@angular/core';
import * as _ from 'lodash-es';
import * as moment from 'moment';
import * as Search from '@medic/search';
import * as CalendarInterval from '@medic/calendar-interval';

import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { GetDataRecordsService } from '@mm-services/get-data-records.service';
import { PerformanceService } from '@mm-services/performance.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';

@Injectable({
  providedIn: 'root'
})
export class SearchFactoryService {
  private searchFn?: Function;

  constructor() {}

  async get(dbService: DbService, datasourceService: CHTDatasourceService): Promise<Function> {
    if (!this.searchFn) {
      const dataContext = await datasourceService.getDataContext();
      this.searchFn = Search(dbService.get(), dataContext) as Function;
    }

    return this.searchFn;
  }
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  constructor(
    private readonly datasourceService: CHTDatasourceService,
    private readonly dbService:DbService,
    private readonly sessionService:SessionService,
    private readonly getDataRecordsService:GetDataRecordsService,
    private readonly searchFactoryService:SearchFactoryService,
    private readonly performanceService: PerformanceService,
    private readonly ngZone:NgZone,
  ) { }

  private _currentQuery: any = {};

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

  private async getTaskCounts(householdIds: string[]) {
    if (!householdIds?.length) {
      return [];
    }

    const parentKeys = householdIds.map(id => [id, 'person']);
    const personResult = await this.dbService
      .get()
      .query('medic-client/contacts_by_parent', { keys: parentKeys });

    const householdToPersonIds: Map<string, string[]> = new Map();
    const allPersonIds: string[] = [];
    personResult.rows.forEach(row => {
      const householdId = row.key[0];
      const personId = row.id;
      if (!householdToPersonIds.has(householdId)) {
        householdToPersonIds.set(householdId, []);
      }
      householdToPersonIds.get(householdId)!.push(personId);
      allPersonIds.push(personId);
    });

    const taskCountByPerson: Map<string, number> = new Map();
    if (allPersonIds.length) {
      const ownerKeys = allPersonIds.map(id => `owner-${id}`);
      const taskResult = await this.dbService
        .get()
        .query('medic-client/tasks_by_contact', { keys: ownerKeys });
      taskResult.rows.forEach(row => {
        const personId = (row.key as string).replace(/^owner-/, '');
        taskCountByPerson.set(personId, (taskCountByPerson.get(personId) || 0) + 1);
      });
    }

    return householdIds.map(householdId => {
      const personIds = householdToPersonIds.get(householdId) || [];
      const taskCount = personIds.reduce((sum, personId) => {
        return sum + (taskCountByPerson.get(personId) || 0);
      }, 0);
      return { key: householdId, value: { taskCount } };
    });
  }

  private async enrichSearchResults(dataRecordsPromise, searchResults, options) {
    const { displayLastVisitedDate, visitCountSettings, displayTaskCount, sortByTaskCount, extensions } = options;

    const lastVisitedDatePromise = displayLastVisitedDate
      ? this.getLastVisitedDates(searchResults.docIds, searchResults.queryResultsCache, visitCountSettings)
      : Promise.resolve([]);

    const taskCountPromise = displayTaskCount
      ? this.getTaskCounts(searchResults.docIds)
      : Promise.resolve([]);

    const [dataRecords, lastVisitedDates, taskCounts] = await Promise.all([
      dataRecordsPromise,
      lastVisitedDatePromise,
      taskCountPromise,
    ]);

    lastVisitedDates.forEach((dateResult) => {
      const relevantDataRecord = dataRecords.find(r => r._id === dateResult.key);
      if (relevantDataRecord) {
        Object.assign(relevantDataRecord, dateResult.value);
        relevantDataRecord.sortByLastVisitedDate = extensions.sortByLastVisitedDate;
      }
    });

    taskCounts.forEach((taskResult) => {
      const relevantDataRecord = dataRecords.find(r => r._id === taskResult.key);
      if (relevantDataRecord) {
        Object.assign(relevantDataRecord, taskResult.value);
        relevantDataRecord.sortByTaskCount = sortByTaskCount;
      }
    });

    return dataRecords;
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

  search(type, filters: Filter, options:SearchOptions = {}) {
    return this.ngZone.runOutsideAngular(() => this._search(type, filters, options));
  }

  private async _search(
    type,
    filters,
    {
      sortByLastVisitedDate,
      hydrateContactNames,
      displayLastVisitedDate,
      visitCountSettings,
      displayTaskCount,
      sortByTaskCount,
      additionalDocIds = [],
      ...options
    }: SearchOptions
  ) {
    const extensions = { sortByLastVisitedDate };
    console.debug('Doing Search', type, filters, options, extensions);

    _.defaults(options, {
      limit: 50,
      skip: 0
    });

    if (!options.force && this.debounce(type, filters, options)) {
      return Promise.resolve([]);
    }
    const trackPerformance = this.performanceService.track();
    const searchFn = await this.searchFactoryService.get(this.dbService, this.datasourceService);
    try {
      const searchResults = await searchFn(type, filters, options, extensions);

      const filterKeys = Object.keys(filters).filter(f => filters[f]).sort();
      // Will end up with entries like:
      //   search:reports:search                      <-- text search of reports
      //   search:reports:date:search:valid:verified  <-- maximum selected search of reports with text search
      //   search:contacts:search                     <-- text search of contacts
      //   search:contacts:types                      <-- default viewing of contact list
      trackPerformance?.stop({ name: [ 'search', type, ...filterKeys ].join(':') });

      additionalDocIds
        .filter(docId => searchResults.docIds.indexOf(docId) === -1)
        .forEach(docId => searchResults.docIds.push(docId));
      const dataRecordsPromise = this.getDataRecordsService.get(
        searchResults.docIds,
        { hydrateContactNames, include_docs: options.include_docs }
      );

      if (!displayLastVisitedDate && !displayTaskCount) {
        return dataRecordsPromise;
      }

      return this.enrichSearchResults(
        dataRecordsPromise,
        searchResults,
        { displayLastVisitedDate, visitCountSettings, displayTaskCount, sortByTaskCount, extensions }
      );
    } finally {
      this._currentQuery = {};
    }
  }
}

export interface Filter {
  types?: { selected: string };
  search?: string;
  parent?: string;
  subjectIds?: string[];
}

interface SearchOptions {
  force?: boolean,
  limit?: number,
  skip?: number,
  hydrateContactNames?: boolean,
  include_docs?: boolean,
  sortByLastVisitedDate?: boolean,
  displayLastVisitedDate?: boolean,
  visitCountSettings?: Record<string, unknown>,
  displayTaskCount?: boolean,
  sortByTaskCount?: boolean,
  additionalDocIds?: string[]
}
