import { 
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  Input,
  ViewContainerRef,
} from '@angular/core';
import { NgIf, NgForOf, NgTemplateOutlet, NgSwitch, CommonModule } from '@angular/common';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';

import {MatAccordion, MatExpansionModule} from '@angular/material/expansion';

import { DynamicTemplateRenderer } from './dynamic.component';

import { ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';
import { SimpleDateTimePipe } from '@mm-pipes/date.pipe';
import { ProcessValuePipe } from './processvalue.pipe';

import { DbService } from '@mm-services/db.service';

import * as moment from 'moment';

@Component({
  selector: 'table-content',
  templateUrl: './table.component.html',
  imports: [
    NgIf, 
    NgForOf, 
    NgTemplateOutlet,
    NgSwitch,
    ResourceIconPipe,
    SimpleDateTimePipe,
    ProcessValuePipe,
    MatAccordion,
    MatExpansionModule,
    MatTableModule,
    MatSortModule,
    CommonModule,
  ]
})
export class TableContentComponent implements OnInit, AfterViewInit {
  @Input() config!: TableConfig;

  hasCustomHeader: boolean = false;
  title: string = '';
  descriptionCollapsed: string = '';
  descriptionExpanded: string = '';
  expanded: boolean = false;
  @ViewChild('descriptionExpandedContainer', { read: ViewContainerRef, static: false })
  descriptionExpandedContainer!: ViewContainerRef;

  @ViewChild('pageHeaderContainer', { read: ViewContainerRef, static: false })
  pageHeaderContainer!: ViewContainerRef;

  isLoading = false;
  displayedColumns: Record<string, ColumnConfig> = {};
  // Will contain the value processing function per header key 
  private onProcessFns: Record<string, Function | undefined> = {};

  dataSource = new MatTableDataSource<any>([]);
  @ViewChild(MatSort) sort!: MatSort;

  private onLoadFn: Function | undefined = async () => console.log('The default on load method action');
  private onReloadFn: Function | undefined = async () => console.log('The default on reload method action');

  // TODO: get the screen filter to work here.
  // At the moment we hard code the lookup to 2 months ago. What if we want to check 4 months ago?

  constructor(
    private renderer: DynamicTemplateRenderer,
    private dbService: DbService
  ) {}

  ngOnInit(): void {
    const headers = this.config.table_headers;
    console.log('Configured headers: ', headers);
    this.displayedColumns = headers;

    const pageHeader = (this.config as TableConfig).page_header;
    if (!pageHeader){
      console.log('No header config provided');
      return;
    } else if ('title' in pageHeader && 'description_collapsed' in pageHeader && 'description_expanded' in pageHeader){
      console.log('Is pre-defined header');
      this.title = pageHeader.title;
      this.descriptionCollapsed = pageHeader.description_collapsed;
      this.descriptionExpanded = pageHeader.description_expanded;
      this.expanded = pageHeader.expanded??false;
      this.hasCustomHeader = false;
    } else if ('content' in pageHeader){
      this.hasCustomHeader = true;
    }

    for (const entry of Object.entries(this.displayedColumns)){
      if (entry[1].preprocess_hook){
        this.onProcessFns[entry[0]] = this.createFunctionFromString(
          ['cellValue', 'rowIndex', 'tableRowCount', 'rowData', 'Math'],
          entry[1].preprocess_hook
        );
      }
    }

    console.log('The passed in config: ', this.config);
    // TODO: when the content for these props are set, the fn definition part should be omitted
    // eg: const myFunc = () => {...} or the like
    // In other words, when the content for the "on_screen_load" and "on_reload" config is set 
    // - it should only contain function body content!
    this.onLoadFn = this.createFunctionFromString(
      ['dbService', 'moment', 'ctx'],
      this.asyncWrapCode(this.config.on_screen_load)
    );

    // If the reload function is undefined then we use the load function again
    this.onReloadFn = this.config.on_reload ? this.createFunctionFromString(
      // The loading function is also provided back to the user
      // Just in case they want to do something more than just hit the load code
      ['dbService', 'moment', 'ctx', 'onScreenLoad'],
      this.asyncWrapCode(this.config.on_reload)
    ): this.onLoadFn;

    if (this.onLoadFn) {
      this.isLoading = true;
      // We probably want to limit what the 'this' exposes
      this.onLoadFn(this.dbService, moment, this)
        .then((info) => {
          this.updateTableDataSourceAndSort(info);
          this.isLoading = false;
          console.log('loadData finished');
        })
        .catch(console.error);
    }

    // this.isLoading = true;
    // this.loadData().then((info) => {
    //   this.updateTableDataSourceAndSort(info);
    //   this.isLoading = false;
    // });
  }

  ngAfterViewInit(): void {
    if (!this.hasCustomHeader && this.descriptionExpandedContainer && this.descriptionExpanded){
      this.renderer.render(
        this.descriptionExpandedContainer,
        this.descriptionExpanded,
        { reload: () => this.reload() }
        // extraImports if needed, e.g. [MatTableModule]
      );
    }

    if (this.hasCustomHeader && this.pageHeaderContainer && 'content' in this.config.page_header){
      this.renderer.render(
        this.pageHeaderContainer,
        this.config.page_header.content,
        { reload: () => this.reload() }
        // extraImports if needed, e.g. [MatTableModule]
      );
    }
  }

  private asyncWrapCode = (code) => {
    return `
        return (async () => {
            ${code}
        })();
    `;
  };

  createFunctionFromString(args: string[], code: string): Function | undefined {
    if (!code) {
      return undefined;
    }
    try {
      return new Function(...args, code);
    } catch (e) {
      console.error('Failed to create function from code string:', e);
      return undefined;
    }
  }
  
  reload = () => {
    if (this.onReloadFn) {
      this.isLoading = true;
      this.onReloadFn(
        this.dbService,
        moment,
        this, // We probably want to limit what the 'this' exposes
        async () => {
          if (!this.onLoadFn) {
            throw new Error('onLoadFn is not defined');
          }
          return this.onLoadFn(this.dbService, moment, this);
        } 
      )
        .then((info) => {
          this.updateTableDataSourceAndSort(info);
          this.isLoading = false;
          console.log('reload finished');
        })
        .catch(console.error);
    }

    // this.isLoading = true;
    // this.loadData().then((info) => {
    //   this.updateTableDataSourceAndSort(info);
    //   this.isLoading = false;
    // });
  };

  // TODO: remove commented code
  // The commented code is kept to make testing easier since cht-conf doesn't consume additional files yet
  
  //   async loadData(){
  //     const startingPoint = moment().subtract(2, 'months'); 
  //     const connectedUsersCutoff = startingPoint.clone().subtract(8, 'months').valueOf();
  
  //     const strict = false;
  //     // Because the connected users are used to filter the telemetry request, and build up the buckets, 
  //     // we want to be able to display users that have been inactive for the past x amount of months.
  //     // To do this we add 8 months to the offset of the interested telemetry records.
  //     // However, there could also be a case where the user wants to see data specific to a certain period. 
  
  //     const medicLogs = this.dbService.get({ remote: true, custom: 'medic-logs' });
  //     const medicLogsInfo = await medicLogs.info();
  //     console.log('Remote medic logs info: ', medicLogsInfo);
  //     const connectedUsersQueryResult = await medicLogs.query('logs/connected_users', { 
  //       reduce: false,
  //       startkey: strict ? startingPoint.valueOf() : connectedUsersCutoff,
  //       endkey: 9999999999999,
  //     });
  //     console.log('Connected users query result: ', connectedUsersQueryResult);
  //     const connectedUsers = connectedUsersQueryResult?.rows?.map((entry) => {
  //       return {name: entry.id.replace(/^connected-user-/, ''), timestamp: entry.key};
  //     });
  //     console.log('Connected users (active this year): ', connectedUsers);
  
  //     const countWeekdaysBetween = function(startDate, endDate) {
  //       const SUNDAY = 0;
  //       const SATURDAY = 6;
  //       let count = 0;
  //       const current = moment(startDate).clone();
  
  //       while (current.isBefore(endDate, 'day')) {
  //         const day = current.day();
  //         if (day !== SUNDAY && day !== SATURDAY) {
  //           count++;
  //         }
  //         current.add(1, 'day');
  //       }
  
  //       return count;
  //     };
  
  //     const adjustedGapExcludingWeekends = function(prevDate: moment.Moment, currentDate: moment.Moment) {
  //       const SUNDAY = 0;
  //       const SATURDAY = 6;
  //       const totalDays = currentDate.diff(prevDate, 'days', true);
  //       if (totalDays <= 0) {
  //         return 0;
  //       }
  
  //       let weekendDays = 0;
  //       const checkDate = prevDate.clone().add(1, 'days'); // start the day after prevDate
  //       while (checkDate.isBefore(currentDate, 'day')) {
  //         const day = checkDate.day();
  //         if (day === SUNDAY || day === SATURDAY) {
  //           weekendDays++;
  //         }
  //         checkDate.add(1, 'days');
  //       }
  
  //       return totalDays - weekendDays;
  //     };
  
  //     // We have a way of determining if the logged in user is an online and/or admin user, 
  //     // but the 'connected_users' does not provide that info.
  //     const getTelemetry = async function(
  //       dbService: DbService, 
  //       yearLowerLimit: number, 
  //       monthLowerLimit, 
  //       connectedUsers: Array<{ name: string, timestamp: number }>
  //     ) {
  //       console.log('Year lower limit: ', yearLowerLimit);
  //       console.log('Month lower limit: ', monthLowerLimit);
  //       // ------------------------------------------------------------------------
  
  //       const medicUsersMeta = dbService.get({ remote: true, custom: 'medic-users-meta' });
  //       let bookmark = null;
  //       let results: Array<any> = [];
  //       const limit = 25;
  //       let response;
  //       do {
  //         const query = {
  //           selector: {
  //             type: 'telemetry',
  //             'metrics.replication:medic:from:ms-since-last-replicated-date': { $exists: true },
  //             // We can't specify the db as the offline users don't use "medic" they use "medic-user-<username>"
  //             // 'dbInfo.db_name': 'medic',
  //             'metadata.year': { $gte: yearLowerLimit },
  //             'metadata.month': { $gte: monthLowerLimit },
  //             // The connected users are reduced to the selection period plus an offset
  //             // The offset is to ensure we display users, within a reasonable period, that are inactive
  //             // All other users are seen as "derelict"
  //             'metadata.user': {
  //               $in: connectedUsers.map((e) => e.name)
  //             }
  //           },
  //           fields: [
  //             'metadata.user',
  //             // When the record was created on the specific user
  //             'metadata.year',
  //             'metadata.month',
  //             'metadata.day',
  //             // When the record was moved over to the aggregate space (usually within 1 day of the creation)
  //             'metadata.aggregate_date',
  //             'metrics.boot_time:2:to_bootstrap',
  //             'metrics.replication:medic:from:ms-since-last-replicated-date',
  //             'metrics.replication:medic:to:ms-since-last-replicated-date',
  //             'dbInfo.doc_count', // The number of docs on the user's local db
  //             'dbInfo.db_name',
  //           ],
  //           limit: limit,
  //           bookmark: bookmark || undefined,
  //           //   sort: ['metadata.aggregate_date'], // Can not seem to sort if not indexed by this field
  //         };
  //         // Telemetry docs should be returned in asc order due to the id
  //         // Eg: telemetry-2025-2-14-testing-c5802ef7-c977-4de8-bde1-d83a7bf34bfc
  
  //         response = await medicUsersMeta.find(query);
  //         results = results.concat(response.docs);
  //         bookmark = response.bookmark;
  
  //         // If less than limit docs returned, we've reached the end
  //       } while (response.docs.length === limit);
  
  //       console.log('Telemetry results: ', results);
  
  //       // TODO: days since last successful up/down ?
        
  //       const data = Object.fromEntries(connectedUsers.map(user => [user.name, {
  //         last_server_connection_date: user.timestamp,
  //         mostRecentTelemetry: -1,
  //         latest_from_sync_date_ms: -1,
  //         latest_to_sync_date_ms: -1,
  //         latest_approximate_device_doc_count: -1, // Syncing is delayed by at least a day. 2/3 over weekends.
  
  //         totalDaysBetweenDownSync: 0,
  //         total_days_between_up_sync: 0,
  //         totalInactiveDays: 0,
  //         entryCount: 0, // We should divide all of the above by the amount of entries returned to get the avg
  //       }]));
  
  //       for (const entry of results ?? []){
  //         console.log('Entry: ', entry);
  //         console.log('username: ', entry.metadata.user);
  //         const bucket = data[entry.metadata.user];
  
  //         if (bucket){
  //           // ------------------------------------------------------------------------------------------
  //           // ms-since-last-replicated-date is not a timestamp — it’s a duration in milliseconds between
  //           // “when this telemetry was recorded” and “the last successful replication.”
  //           // ------------------------------------------------------------------------------------------
  //           const startPeriod = `${entry.metadata.year}-${entry.metadata.month}-${entry.metadata.day}`;
  //           console.log('Start period: ', startPeriod);
  //           const momentStartPeriod = moment(new Date(startPeriod));
  
  //           // The aggregate doc for the previous day is created when the first telemetry item is recorded each day.
  //           // Aggregation can occur days after the actual user side telemetry creation date due to this
  //           // For more info check: https://forum.communityhealthtoolkit.org/t/sync-issues-status-scrutiny/3359/3
  //           const diffInWeekDays = countWeekdaysBetween(startPeriod, moment(new Date(entry.metadata.aggregate_date)));
  //           console.log('Diff in days: ', diffInWeekDays);
  //           bucket.totalInactiveDays += diffInWeekDays;
  //           // const momentAggregateDate = moment(entry.metadata.aggregate_date);
  //           // const diffInDays = momentAggregateDate.diff(momentStartPeriod, 'days');
  //           // console.log('Diff in days: ', diffInDays);
  
  //           // This means that in general our feedback will be between 1 -3 days off (when considering weekends).
  //           // Anything more should be scrutinized. 
  //           // To determine: 
  //           // - network related issues: "Last connected to server" value exposed by the "connected-users" db
  //           // - timeouts - "metadata doc count" value exposed by the "-meta" db
  //           // - severity - "days since last successful sync" and other 
  //           // - device related? - using avg values to determine if frequent issues plague specific devices
  
  //           // Time between a replication attempt and the last successful replication.
  //           // Only recorded for medic database, every time replication is attempted. Added in 3.12.
  //           // https://docs.communityhealthtoolkit.org/technical-overview/data/performance/telemetry/
  //           const msSinceLastRepUpSuccess = entry.metrics['replication:medic:to:ms-since-last-replicated-date'].min;
  //           const msSinceLastRepDownSuccess = entry.metrics['replication:medic:from:ms-since-last-replicated-date'].min;
  //           // We could use the avg between 'min' and 'max' to ensure we don't paint a rosy picture
            
  //           const lastSuccessfulRepUpDate = momentStartPeriod.subtract(msSinceLastRepUpSuccess, 'milliseconds');
  //           const lastSuccessfulRepDownDate = momentStartPeriod.subtract(msSinceLastRepDownSuccess, 'milliseconds');
  
  //           const telemetryTimestamp = momentStartPeriod.valueOf();
  //           if (momentStartPeriod.valueOf() > bucket.mostRecentTelemetry){
  //             console.log('Last up: ', lastSuccessfulRepUpDate.toISOString());
  //             console.log('Last down: ', lastSuccessfulRepDownDate.toISOString());
  
  //             if (bucket.latest_from_sync_date_ms > 0) {
  //               const prevDate = moment(bucket.latest_from_sync_date_ms);
  //               const gapDays = adjustedGapExcludingWeekends(prevDate, lastSuccessfulRepDownDate);
  //               bucket.totalDaysBetweenDownSync += gapDays;
  //             }
  
  //             if (bucket.latest_to_sync_date_ms > 0) {
  //               const prevDate = moment(bucket.latest_to_sync_date_ms);
  //               const gapDays = adjustedGapExcludingWeekends(prevDate, lastSuccessfulRepUpDate);
  //               bucket.total_days_between_up_sync += gapDays;
  //             }
  
  //             bucket.latest_from_sync_date_ms = lastSuccessfulRepDownDate.valueOf();
  //             bucket.latest_to_sync_date_ms = lastSuccessfulRepUpDate.valueOf();
  
  //             bucket.latest_approximate_device_doc_count = entry.dbInfo?.doc_count ?? bucket.latest_approximate_device_doc_count;
  
  //             bucket.mostRecentTelemetry = telemetryTimestamp;
  //           }
  
  //           bucket.entryCount++;
  //         }
  //       }
  
  //       // We can try and load the data error data from a user's device, but it would only be available
  //       // if they have not logged in and performed any action the following day.
  //       // As explained by medic: 
  //       // Sentinel has an automatic nightly task to aggregate all feedback docs 
  //       // from users meta databases into medic-users-meta
  //       // and delete the corresponding docs from the individual users meta databases.
  //       // This is an important background task, if this does not run, when logging in, 
  //       // users will download all of their previous feedback docs.
  //       // https://forum.communityhealthtoolkit.org/t/sync-issues-status-scrutiny/3359/11
  //       //   const username = 'testing';
  //       //   const specificUserMeta = dbService.get({ remote: true, custom: `medic-user-${username}-meta` });
  //       //   const docs = await specificUserMeta.allDocs({ include_docs: true });
  //       //   // const docs = specificUserMeta.allDocs({ keys: ids, include_docs: true });
  //       //   console.log('Specific user meta: ', docs);
        
  //       return data;
  //     };
  
  //     // The month count starts at 0
  //     const info = await getTelemetry(this.dbService, startingPoint.year(), startingPoint.month()+1, connectedUsers);
  //     console.log('Info: ', info);
  //     return info;
  //   };

  processValueFn = (entryKey: string, cellValue: any, rowIndex: number, tableRowCount: number, rowData: any) => {
    const fn = this.onProcessFns[entryKey];
    if (fn) {
      try {
        return fn(cellValue, rowIndex, tableRowCount, rowData, Math);
      } catch (e) {
        console.error(e);
        // Log an error here
      }
    }

    return cellValue;
  };

  isNaN(value: unknown): boolean {
    return Number.isNaN(value);
  }

  getColumns = () => Object.keys(this.displayedColumns);

  updateTableDataSourceAndSort = (info: Record<string, any>) => {
    console.log('Info returned: ', info);
    const dataArray = Object.entries(info).map(([username, details]) => ({
      username,
      ...details
    }));

    // The new array assignment notifies the sort of changes
    this.dataSource.data = dataArray;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      const value = item[property];
      if (value === 'NA' || item.entryCount === 0) {
        return Number.NEGATIVE_INFINITY; // Always sort "NA" to bottom
      }
      return value;
    };
  };
}

export type TableConfig = {
  page_header: { 
    title: string, 
    description_collapsed: string, 
    description_expanded: string, 
    expanded: boolean 
  } | { 
    content: string 
  },
  table_headers: {[key: string]: ColumnConfig},
  on_screen_load: string,
  on_reload: string
};

type ColumnConfig = {
  can_sort: boolean;
  display_value: string;
  // The cell value, row index, total row count, and row data obj will be fed into this function
  preprocess_hook?: string;
  pipe?: string;
};
