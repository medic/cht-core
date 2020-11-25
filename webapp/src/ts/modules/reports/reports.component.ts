import { find as _find, assignIn as _assignIn } from 'lodash-es';
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';

import { isMobile } from '@mm-providers/responsive.provider';
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

const PAGE_SIZE = 50;

@Component({
  templateUrl: './reports.component.html'
})
export class ReportsComponent implements OnInit, OnDestroy {
  subscription: Subscription = new Subscription();

  private globalActions;
  private reportsActions;
  private servicesActions;
  private listContains;

  reportsList;
  filteredReportsList;
  selectedReports;
  forms;
  error;
  errorSyntax;
  loading;
  appending;
  moreItems;
  filters:any = {};
  hasReports;
  selectMode;
  filtered;
  verifyingReport;
  showContent;
  enketoEdited;

  constructor(
    private store:Store,
    private route: ActivatedRoute,
    private router:Router,
    private changesService:ChangesService,
    private searchService:SearchService,
    private translateService:TranslateService,
    private tourService: TourService,
    private addReadStatusService:AddReadStatusService,
    private exportService:ExportService,
    private ngZone:NgZone,
    private scrollLoaderProvider: ScrollLoaderProvider,
  ) {
    this.globalActions = new GlobalActions(store);
    this.reportsActions = new ReportsActions(store);
    this.servicesActions = new ServicesActions(store);
  }

  ngOnInit() {
    const reduxSubscription = combineLatest(
      this.store.select(Selectors.getReportsList),
      this.store.select(Selectors.getSelectedReports),
      this.store.select(Selectors.listContains),
      this.store.select(Selectors.getForms),
      this.store.select(Selectors.getFilters),
      this.store.select(Selectors.getShowContent),
      this.store.select(Selectors.getEnketoEditedStatus),
      this.store.select(Selectors.getSelectMode),
    ).subscribe(([
      reportsList,
      selectedReports,
      listContains,
      forms,
      filters,
      showContent,
      enketoEdited,
      selectMode,
    ]) => {
      this.reportsList = reportsList;
      // selected objects have the form
      //    { _id: 'abc', summary: { ... }, report: { ... }, expanded: false }
      // where the summary is the data required for the collapsed view,
      // report is the db doc, and expanded is whether to how the details
      // or just the summary in the content pane.
      this.selectedReports = selectedReports;
      this.listContains = listContains;
      this.forms = forms;
      this.filters = filters;
      this.showContent = showContent;
      this.enketoEdited = enketoEdited;
      this.selectMode = selectMode;
    });
    this.subscription.add(reduxSubscription);

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
    this.reportsActions.setSelectedReports([]);
    this.appending = false;
    this.error = false;
    this.verifyingReport = false;

    this.globalActions.setFilter({ search: this.route.snapshot.queryParams.query || '' });

    this.tourService.startIfNeeded(this.route.snapshot);

    this.search();
    this.setActionBarData();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    // when navigating back from another tab, if there are reports in the state, angular will try to render them
    this.reportsActions.resetReportsList();
    this.reportsActions.setSelectedReports([]);
    this.globalActions.setSelectMode(false);
  }

  private getReportHeading(form, report) {
    if (form && form.subjectKey) {
      return this.translateService.instant(form.subjectKey, report);
    }
    if (report.validSubject) {
      return report.subject.value;
    }
    if (report.subject.name) {
      return report.subject.name;
    }
    return this.translateService.instant('report.subject.unknown');
  }

  private prepareReports(reports) {
    return reports.map(report => {
      const form = _find(this.forms, { code: report.form });
      report.icon = form && form.icon;
      report.heading = this.getReportHeading(form, report);
      report.summary = form ? form.title : report.form;
      report.lineage = report.subject && report.subject.lineage || report.lineage;
      report.unread = !report.read;

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
      if (this.selectedReports?.length && isMobile()) {
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
      .then((updatedReports) => {
        updatedReports = this.prepareReports(updatedReports);

        this.reportsActions.updateReportsList(updatedReports);
        // set action bar data todo

        this.moreItems = updatedReports.length >= options.limit;
        this.hasReports = !!updatedReports.length;
        this.loading = false;
        this.appending = false;
        this.error = false;
        this.errorSyntax = false;

        // set first report selected if conditions todo
        // scrolling todo

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
    if((this.filters.search || Object.keys(this.filters).length > 1) && !this.enketoEdited) {
      this.router.navigate(['reports']);
      this.reportsActions.clearSelection();
    }
    if (!force && isMobile() && this.showContent) {
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
    this.globalActions.setLeftActionBar({
      hasResults: this.hasReports,
      exportFn: (e) => {
        const exportFilters = _assignIn({}, this.filters);
        ['forms', 'facilities'].forEach((type) => {
          if (exportFilters[type]) {
            delete exportFilters[type].options;
          }
        });
        const $link = $(e.target).closest('a');
        $link.addClass('mm-icon-disabled');
        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => {
            $link.removeClass('mm-icon-disabled');
          }, 2000);
        });
        this.exportService.export('reports', exportFilters, { humanReadable: true });
      },
    });
  }

  toggleSelected(report) {
    if (!report?._id) {
      return;
    }

    if (this.selectMode) {
      const isSelected = this.selectedReports?.find(selectedReport => selectedReport._id === report._id);
      if (!isSelected) {
        // use the summary from LHS to set the report as selected quickly (and preserve old functionality)
        // the selectReport action will actually get all details
        this.reportsActions.addSelectedReport(report);
        this.reportsActions.selectReport(report);
      } else {
        this.reportsActions.removeSelectedReport(report);
      }
      return;
    }

    this.router.navigate(['/reports', report._id]);
  }
}
