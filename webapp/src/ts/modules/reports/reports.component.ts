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
import { FastAction, FastActionButtonService } from '@mm-services/fast-action-button.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';

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
  private destroyed: boolean;

  subscription: Subscription = new Subscription();
  reportsList;
  selectedReport;
  selectedReports;
  forms;
  error: boolean;
  errorSyntax: boolean;
  loading = true;
  appending = false;
  moreItems: boolean;
  filters:any = {};
  hasReports: boolean;
  selectMode = false;
  selectModeAvailable = false;
  showContent: boolean;
  enketoEdited: boolean;
  useSidebarFilter = true;
  isSidebarFilterOpen = false;
  isExporting = false;
  currentLevel;
  fastActionList: FastAction[];

  LIMIT_SELECT_ALL_REPORTS = 500;

  constructor(
    private store:Store,
    private route:ActivatedRoute,
    private router:Router,
    private authService:AuthService,
    private changesService:ChangesService,
    private searchService:SearchService,
    private translateService:TranslateService,
    private addReadStatusService:AddReadStatusService,
    private exportService:ExportService,
    private ngZone:NgZone,
    private userContactService:UserContactService,
    private sessionService:SessionService,
    private scrollLoaderProvider:ScrollLoaderProvider,
    private responsiveService:ResponsiveService,
    private modalService:ModalService,
    private fastActionButtonService:FastActionButtonService,
    private xmlFormsService:XmlFormsService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.reportsActions = new ReportsActions(store);
    this.servicesActions = new ServicesActions(store);
  }

  ngOnInit() {
    this.subscribeToStore();
    this.subscribeToXmlFormsService();
    this.watchReportList();
    this.reportsActions.setSelectedReports([]);
    this.appending = false;
    this.error = false;

    this.globalActions.setFilter({ search: this.route.snapshot.queryParams.query || '' });
    this.setActionBarData();

    this.currentLevel = this.authService.online(true) ? Promise.resolve() : this.getCurrentLineageLevel();
  }

  async ngAfterViewInit() {
    this.checkPermissions();
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

  private async checkPermissions() {
    this.selectModeAvailable = await this.authService.has(['can_edit', 'can_bulk_delete_reports']);
    const isDisabled = !this.sessionService.isDbAdmin() && await this.authService.has(OLD_REPORTS_FILTER_PERMISSION);
    this.useSidebarFilter = !isDisabled;
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

  private subscribeToXmlFormsService() {
    this.xmlFormsService.subscribe(
      'AddReportMenu',
      { reportForms: true },
      async (error, xForms) => {
        if (error) {
          return console.error('Error fetching form definitions', error);
        }

        const xmlReportForms = xForms.map((xForm) => ({
          id: xForm._id,
          code: xForm.internalId,
          icon: xForm.icon,
          title: xForm.title,
          titleKey: xForm.translation_key,
        }));

        this.fastActionList = await this.fastActionButtonService.getReportLeftSideActions({ xmlReportForms });
      });
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

  private async prepareReports(reports, isContent=false) {
    const userLineageLevel = await this.currentLevel;

    return reports.map(report => {
      const form = _find(this.forms, { code: report.form });
      const subTitle = form ? form.title : report.form;
      report.summary = isContent ? { ...report } : subTitle;
      report.expanded = false;
      report.icon = form && form.icon;
      report.heading = this.getReportHeading(form, report);
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

  private query(opts?) {
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
    const scrollCallback = () => {
      if (!this.loading && this.moreItems) {
        this.query({ skip: true });
      }
    };

    this.scrollLoaderProvider.init(scrollCallback);
  }

  search() {
    // clears report selection for any text search or filter selection
    // does not clear selection when someone is editing a form
    if ((this.filters.search || Object.keys(this.filters).length > 1) && !this.enketoEdited) {
      this.router.navigate(['reports']);
      this.reportsActions.clearSelection();
    }

    this.loading = true;
    return this.query();
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
      exportFn: () => this.exportReports(),
      hasResults: this.hasReports,
    });
  }

  exportReports() {
    if (this.isExporting) {
      return;
    }

    const exportFilters = _cloneDeep(this.filters);
    ['forms', 'facilities'].forEach((type) => {
      if (exportFilters[type]) {
        delete exportFilters[type].options;
      }
    });

    // TODO: Improve debounce or make a way to determine when the export has finished.
    this.isExporting = true;
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => this.isExporting = false, 2000);
    });

    this.exportService.export('reports', exportFilters, { humanReadable: true });
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

  selectReportRow(report) {
    if (this.responsiveService.isMobile() || !this.selectMode) {
      return;
    }
    this.selectReport(report);
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

  async selectAllReports() {
    if (this.areAllReportsSelected()) {
      return;
    }

    try {
      if (this.isSidebarFilterOpen) {
        this.toggleFilter();
      }

      this.globalActions.setLoadingContent(true);

      const reports = await this.searchService.search(
        'reports',
        this.filters,
        { limit: this.LIMIT_SELECT_ALL_REPORTS, hydrateContactNames: true }
      );

      const preparedReports = await this.prepareReports(reports, true);
      this.reportsActions.setSelectedReports(preparedReports);
      this.globalActions.unsetComponents();

    } catch(error) {
      console.error('Error selecting all', error);
    }
  }

  deselectAllReports() {
    this.reportsActions.setSelectedReports([]);
    this.globalActions.unsetComponents();
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

    // The report might not have the doc ready at this point of time, but we can use the summary.
    const docs = this.selectedReports
      .map(report => report.doc || report.summary)
      .filter(report => !!report);
    this.modalService
      .show(BulkDeleteConfirmComponent, { initialState: { model: { docs, type: 'reports' } } })
      .catch(() => {});
  }

  /**
   * Checks if some (but not all) reports are selected.
   */
  areSomeReportsSelected() {
    if (!this.selectMode || !this.selectedReports?.length) {
      return false;
    }

    const isMaxReportsSelected = this.selectedReports?.length >= this.LIMIT_SELECT_ALL_REPORTS;
    return !isMaxReportsSelected && this.reportsList?.length !== this.selectedReports?.length;
  }

  areAllReportsSelected() {
    if (!this.selectMode || !this.selectedReports?.length) {
      return false;
    }

    const isMaxReportsSelected = this.selectedReports?.length >= this.LIMIT_SELECT_ALL_REPORTS;
    return isMaxReportsSelected || this.reportsList?.length === this.selectedReports?.length;
  }

  private getCurrentLineageLevel() {
    return this.userContactService.get().then(user => user?.parent?.name);
  }

  getFastActionButtonType() {
    return this.fastActionButtonService.getButtonTypeForContentList();
  }
}
