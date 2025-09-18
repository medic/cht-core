import { 
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  Input,
  ViewContainerRef
} from '@angular/core';
import { NgIf, NgTemplateOutlet, NgSwitch, CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatExpansionModule } from '@angular/material/expansion';

import { DynamicRenderer } from './dynamic-renderer';

import { ProcessValuePipe } from './processvalue.pipe';
import { DynamicPipe } from './dynamic.pipe';

import { context, PluginContext } from './plugin';

@Component({
  selector: 'table-content',
  templateUrl: './table.component.html',
  imports: [
    NgIf,
    NgTemplateOutlet,
    NgSwitch,
    DynamicPipe,
    ProcessValuePipe,
    MatExpansionModule,
    MatTableModule,
    MatSortModule,
    CommonModule,
  ]
})
export class TableContentComponent implements OnInit, AfterViewInit {
  @Input() config!: TableConfig;
  public pipes: any[];
  private moment: any;
  private readonly dbService;

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

  constructor(
    private renderer: DynamicRenderer,
  ) {
    const ctx = context as PluginContext;
    this.pipes = ctx.pipes;
    this.moment = ctx.moment;
    console.log('We can access the surfaced db methods here', ctx.db);
    this.dbService = ctx.db;
    // Currently, we hardcode the lookup to 2 months ago. What if we want to check 4 months ago or further back?
    // We could accept the CHT built-in filter data.
  }

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
      this.onLoadFn(this.dbService, this.moment, this)
        .then((info) => {
          this.updateTableDataSourceAndSort(info);
          this.isLoading = false;
          console.log('loadData finished');
        })
        .catch(console.error);
    }
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
        this.moment,
        this, // We probably want to limit what the 'this' exposes
        async () => {
          if (!this.onLoadFn) {
            throw new Error('onLoadFn is not defined');
          }
          return this.onLoadFn(this.dbService, this.moment, this);
        } 
      )
        .then((info) => {
          this.updateTableDataSourceAndSort(info);
          this.isLoading = false;
          console.log('reload finished');
        })
        .catch(console.error);
    }
  };

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
