import { cloneDeep as _cloneDeep, find as _find } from 'lodash-es';
import { AfterViewInit, Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { ScrollLoaderProvider } from '@mm-providers/scroll-loader.provider';
import { GlobalActions } from '@mm-actions/global';
import { ReportsActions } from '@mm-actions/reports';
import { ServicesActions } from '@mm-actions/services';
import { ChangesService } from '@mm-services/changes.service';
import { SearchService } from '@mm-services/search.service';
import { TourService } from '@mm-services/tour.service';
import { Selectors } from '@mm-selectors/index';
import { AddReadStatusService } from '@mm-services/add-read-status.service';
import { ExportService } from '@mm-services/export.service';
import { ResponsiveService } from '@mm-services/responsive.service';
import { TranslateService } from '@mm-services/translate.service';
import { ReportsSidebarFilterComponent } from '@mm-modules/reports/reports-sidebar-filter.component';
import { AuthService } from '@mm-services/auth.service';
import { OLD_REPORTS_FILTER_PERMISSION } from '@mm-modules/reports/reports-filters.component';
import { UserContactService } from '@mm-services/user-contact.service';
import { SessionService } from '@mm-services/session.service';
import { BulkDeleteConfirmComponent } from '@mm-modals/bulk-delete-confirm/bulk-delete-confirm.component';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';

const PAGE_SIZE = 50;

@Component({
  templateUrl: './reports.component.html'
})
export class ReportsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(ReportsSidebarFilterComponent) reportsSidebarFilter: ReportsSidebarFilterComponent;

  private globalActions: GlobalActions;
  private reportsActions: ReportsActions;
  private servicesActions: ServicesActions;
  private listContains;
  private destroyed;

  subscription: Subscription = new Subscription();
  reportsList;
  selectedReport;
  selectedReports;
  forms;
  error;
  errorSyntax;
  loading = true;
  appending = false;
  moreItems;
  filters:any = {};
  hasReports;
  selectMode = false;
  selectModeAvailable = false;
  verifyingReport;
  showContent;
  enketoEdited;
  useSidebarFilter = true;
  isSidebarFilterOpen = false;
  currentLevel;

  constructor(
    private store:Store,
    private route:ActivatedRoute,
    private router:Router,
    private authService:AuthService,
    private changesService:ChangesService,
    private searchService:SearchService,
    private translateService:TranslateService,
    private tourService:TourService,
    private addReadStatusService:AddReadStatusService,
    private exportService:ExportService,
    private ngZone:NgZone,
    private userContactService:UserContactService,
    private sessionService:SessionService,
    private scrollLoaderProvider:ScrollLoaderProvider,
    private responsiveService:ResponsiveService,
    private modalService:ModalService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.reportsActions = new ReportsActions(store);
    this.servicesActions = new ServicesActions(store);
  }

  ngOnInit() {
    this.subscribeToStore();
    this.watchReportList();

    this.reportsActions.setSelectedReports([]);
    this.appending = false;
    this.error = false;
    this.verifyingReport = false;

    this.globalActions.setFilter({ search: this.route.snapshot.queryParams.query || '' });
    this.tourService.startIfNeeded(this.route.snapshot);
    this.setActionBarData();

    this.currentLevel = this.sessionService.isOnlineOnly() ? Promise.resolve() : this.getCurrentLineageLevel();
  }

  async ngAfterViewInit() {
    this.selectModeAvailable = await this.authService.has(['can_edit', 'can_bulk_delete_reports']);
    const isDisabled = !this.sessionService.isDbAdmin() && await this.authService.has(OLD_REPORTS_FILTER_PERMISSION);
    this.useSidebarFilter = !isDisabled;
    this.search();
    this.subscribeSidebarFilter();
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.subscription.unsubscribe();
    // when navigating back from another tab, if there are reports in the state, angular will try to render them
    this.reportsActions.resetReportsList();
    this.reportsActions.setSelectedReports([]);
    this.globalActions.setSelectMode(false);
    this.globalActions.unsetSelected();
    this.globalActions.setLeftActionBar({});
  }

  private subscribeToStore() {
    const storeSubscription = combineLatest(
      this.store.select(Selectors.getReportsList),
      this.store.select(Selectors.listContains),
      this.store.select(Selectors.getForms),
      this.store.select(Selectors.getFilters),
      this.store.select(Selectors.getShowContent),
      this.store.select(Selectors.getEnketoEditedStatus),
    ).subscribe(([
      reportsList,
      listContains,
      forms,
      filters,
      showContent,
      enketoEdited,
    ]) => {
      this.reportsList = reportsList;
      this.listContains = listContains;
      this.forms = forms;
      this.filters = filters;
      this.showContent = showContent;
      this.enketoEdited = enketoEdited;
    });
    this.subscription.add(storeSubscription);

    const selectSubscription = combineLatest(
      this.store.select(Selectors.getSelectedReport),
      this.store.select(Selectors.getSelectedReports),
      this.store.select(Selectors.getSelectMode),
    ).subscribe(([
      selectedReport,
      selectedReports,
      selectMode,
    ]) => {
      // selected objects have the form
      //    { _id: 'abc', summary: { ... }, report: { ... }, expanded: false }
      // where the summary is the data required for the collapsed view,
      // report is the db doc, and expanded is whether to show the details or just the summary in the content pane.
      this.selectedReport = selectedReport;
      this.selectedReports = selectedReports;
      this.selectMode = selectMode;
      this.setSelectMode();
    });
    this.subscription.add(selectSubscription);
  }

  private subscribeSidebarFilter() {
    if (!this.useSidebarFilter) {
      return;
    }

    const subscription = this.store
      .select(Selectors.getSidebarFilter)
      .subscribe(({ isOpen }) => this.isSidebarFilterOpen = !!isOpen);
    this.subscription.add(subscription);
  }

  private watchReportList() {
    const dbSubscription = this.changesService.subscribe({
      key: 'reports-list',
      callback: (change) => {
        if (change.deleted) {
          this.reportsActions.removeReportFromList({ _id: change.id });
          this.hasReports = this.reportsList.length;
          this.setActionBarData();
        } else {
          this.query({ silent: true, limit: this.reportsList.length });
        }
      },
      filter: (change) => {
        return change.doc && change.doc.form || this.listContains(change.id);
      },
    });
    this.subscription.add(dbSubscription);
  }

  private getReportHeading(form, report) {
    if (form && form.subjectKey) {
      return this.translateService.instant(form.subjectKey, report);
    }
    if (report.validSubject) {
      return report.subject.value;
    }
    if (report.subject?.name) {
      return report.subject.name;
    }
    return this.translateService.instant('report.subject.unknown');
  }

  private async prepareReports(reports) {
    const userLineageLevel = await this.currentLevel;

    return reports.map(report => {
      const form = _find(this.forms, { code: report.form });
      report.icon = form && form.icon;
      report.heading = this.getReportHeading(form, report);
      report.summary = form ? form.title : report.form;
      report.lineage = report.subject && report.subject.lineage || report.lineage;
      report.unread = !report.read;

      // remove the lineage level that belongs to the offline logged-in user
      if (userLineageLevel && report?.lineage?.length) {
        report.lineage = report.lineage.filter(level => level);
        const item = report.lineage[report.lineage.length -1];
        if (item === userLineageLevel) {
          report.lineage.pop();
        }
      }

      return report;
    });
  }

  private query(opts) {
    const options = Object.assign({ limit: PAGE_SIZE, hydrateContactNames: true }, opts);
    if (options.limit < PAGE_SIZE) {
      options.limit = PAGE_SIZE;
    }

    if (!options.silent) {
      this.error = false;
      this.errorSyntax = false;
      this.loading = true;
      if (this.selectedReports?.length && this.responsiveService.isMobile()) {
        this.globalActions.unsetSelected();
      }

      if (options.skip) {
        this.appending = true;
        options.skip = this.reportsList?.length;
      } else if (!options.silent) {
        this.reportsActions.resetReportsList();
      }
    }

    return this.searchService
      .search('reports', this.filters, options)
      .then((reports) => this.addReadStatusService.updateReports(reports))
      .then(updatedReports => this.prepareReports(updatedReports))
      .then(updatedReports => {
        this.reportsActions.updateReportsList(updatedReports);

        this.moreItems = updatedReports.length >= options.limit;
        this.hasReports = !!updatedReports.length;
        this.loading = false;
        this.appending = false;
        this.error = false;
        this.errorSyntax = false;

        this.initScroll();
        this.setActionBarData();
      })
      .catch(err => {
        this.error = true;
        this.loading = false;
        if (
          this.filters.search &&
          err.reason &&
          err.reason.toLowerCase().indexOf('bad query syntax') !== -1
        ) {
          // invalid freetext filter query
          this.errorSyntax = true;
        }
        console.error('Error loading messages', err);
      });
  }

  private initScroll() {
    this.scrollLoaderProvider.init(() => {
      if (!this.loading && this.moreItems) {
        this.query({ skip: true });
      }
    });
  }

  search(force = false) {
    // clears report selection for any text search or filter selection
    // does not clear selection when someone is editing a form
    if ((this.filters.search || Object.keys(this.filters).length > 1) && !this.enketoEdited) {
      this.router.navigate(['reports']);
      this.reportsActions.clearSelection();
    }
    if (!force && this.responsiveService.isMobile() && this.showContent) {
      // leave content shown
      return;
    }
    this.loading = true;

    return this.query(force);
  }

  listTrackBy(index, report) {
    return report._id + report._rev + report.read + report.selected;
  }

  private setActionBarData() {
    if (this.destroyed) {
      // don't update the actionbar if the component has already been destroyed
      // this callback can be queued up and persist even after component destruction
      return;
    }

    this.globalActions.setLeftActionBar({
      hasResults: this.hasReports,
      exportFn: this.exportFn.bind({}, this.ngZone, this.exportService, this.filters),
    });
  }

  private exportFn(ngZone, exportService, filters, e) {
    const exportFilters = _cloneDeep(filters);
    ['forms', 'facilities'].forEach((type) => {
      if (exportFilters[type]) {
        delete exportFilters[type].options;
      }
    });

    const $link = $(e.target).closest('a');
    $link.addClass('mm-icon-disabled');
    ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        $link.removeClass('mm-icon-disabled');
      }, 2000);
    });

    exportService.export('reports', exportFilters, { humanReadable: true });
  }

  private setSelectMode() {
    if (this.selectMode && !this.selectedReports?.length) {
      this.globalActions.setSelectMode(false);
      return;
    }

    if (!this.selectMode && this.selectedReports?.length >= 1) {
      this.globalActions.setSelectMode(true);
      this.globalActions.unsetComponents();
      this.router.navigate(['/reports']);
      return;
    }
  }

  selectReport(report) {
    if (!report?._id) {
      return;
    }

    if (this.isSidebarFilterOpen) {
      this.toggleFilter();
    }

    const isSelected = this.selectedReports?.find(selectedReport => selectedReport._id === report._id);
    if (isSelected) {
      this.reportsActions.removeSelectedReport(report);
      return;
    }

    // Use the summary from LHS to set the report as selected quickly (and preserve old functionality)
    // the selectReport action will actually get all details
    this.reportsActions.addSelectedReport(report);
    this.reportsActions.selectReport(report);
  }

  selectAllReports() {
    if (this.reportsList?.length === this.selectedReports?.length) {
      return;
    }

    this.reportsActions.selectAll();

    if (this.isSidebarFilterOpen) {
      this.toggleFilter();
    }
  }

  deselectAllReports() {
    this.reportsActions.deselectAll();
  }

  toggleFilter() {
    this.reportsSidebarFilter?.toggleSidebarFilter();
  }

  resetFilter() {
    this.reportsSidebarFilter?.resetFilters();
  }

  bulkDeleteReports() {
    if (!this.selectedReports?.length) {
      return;
    }

    this.modalService
      .show(BulkDeleteConfirmComponent, { initialState: { model: { docs: this.selectedReports, type: 'reports' } } })
      .catch(() => {});
  }

  verifyMultiselect(someSelected = false) {
    if (!this.selectMode || !this.selectedReports?.length) {
      return false;
    }

    if (someSelected) {
      return this.reportsList?.length !== this.selectedReports?.length;
    }

    // Verify all are selected.
    return this.reportsList?.length === this.selectedReports?.length;
  }

  private getCurrentLineageLevel() {
    return this.userContactService.get().then(user => user?.parent?.name);
  }
}
