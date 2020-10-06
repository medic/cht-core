import * as _ from 'lodash-es';
import { isMobile } from '../../providers/responsive.provider';
import { init as scrollLoaderInit } from '../../providers/scroll-loader.provider';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { GlobalActions } from '../../actions/global';
import { ReportsActions } from '../../actions/reports';
import { ServicesActions } from '../../actions/services';
import { ChangesService } from '../../services/changes.service';
import { SearchService } from '../../services/search.service';
import { Selectors } from '../../selectors';
import { combineLatest, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';

const PAGE_SIZE = 50;

@Component({
  templateUrl: './reports.component.html'
})
export class ReportsComponent implements OnInit, OnDestroy {
  private subscription: Subscription = new Subscription();

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

  enketoEdited = false; //todo

  constructor(
    private store:Store,
    private route: ActivatedRoute,
    private changesService:ChangesService,
    private searchService:SearchService,
    private translateService:TranslateService,
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
      this.store.select(Selectors.getShowContent)
    ).subscribe(([
      reportsList,
      selectedReports,
      listContains,
      forms,
      filters,
      showContent,
    ]) => {
      this.reportsList = reportsList;
      this.selectedReports = selectedReports;
      this.listContains = listContains;
      this.forms = forms;
      this.filters = filters;
      this.showContent = showContent;
    });
    this.subscription.add(reduxSubscription);

    const dbSubscription = this.changesService.subscribe({
      key: 'reports-list',
      callback: (change) => {
        if (change.deleted) {
          this.reportsActions.removeReportFromList({ _id: change.id });
          this.hasReports = this.reportsList.length;
          // setActionBarData(); todo
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
    this.search();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
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
      const form = _.find(this.forms, { code: report.form });
      report.icon = form && form.icon;
      report.heading = this.getReportHeading(form, report);
      report.summary = form ? form.title : report.form;
      report.lineage = report.subject && report.subject.lineage || report.lineage;
      report.unread = !report.read;

      return report;
    });
  }

  listTrackBy(index, report) {
    return report._id + report._rev;
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
        // ctrl.unsetSelected(); todo
      }

      if (options.skip) {
        this.appending = true;
        options.skip = this.reportsList.length;
      } else if (!options.silent) {
        this.reportsActions.resetReportsList();
      }
    }

    return this.searchService
      .search('reports', this.filters, options)
      .then((updatedReports) => {
        // add read status todo
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
    scrollLoaderInit(() => {
      if (!this.loading && this.moreItems) {
        this.query({ skip: true });
      }
    });
  };

  search(force = false) {
    // clears report selection for any text search or filter selection
    // does not clear selection when someone is editing a form
    if((this.filters.search || Object.keys(this.filters).length > 1) && !this.enketoEdited) {
      //$state.go('reports.detail', { id: null }, { notify: false });
      //ctrl.clearSelection();
    }
    if (!force && isMobile() && this.showContent) {
      // leave content shown
      return;
    }
    this.loading = true;

    return this.query(force);
  }
}
/*

angular
  .module('inboxControllers')
  .controller('ReportsCtrl', function(
    $log,
    $ngRedux,
    $scope,
    $state,
    $stateParams,
    $timeout,
    AddReadStatus,
    Changes,
    Export,
    GlobalActions,
    LiveList,
    ReportsActions,
    Search,
    SearchFilters,
    Selectors,
    ServicesActions,
    Tour
  ) {
    'use strict';
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = state => ({
      enketoEdited: Selectors.getEnketoEditedStatus(state),
      filters: Selectors.getFilters(state),
      forms: Selectors.getForms(state),
      selectMode: Selectors.getSelectMode(state),
      selectedReports: Selectors.getSelectedReports(state),
      selectedReportsDocs: Selectors.getSelectedReportsDocs(state),
      showContent: Selectors.getShowContent(state),
      unreadCount: Selectors.getUnreadCount(state),
      verifyingReport: Selectors.getVerifyingReport(state)
    });
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      const reportsActions = ReportsActions(dispatch);
      const servicesActions = ServicesActions(dispatch);
      return Object.assign({}, globalActions, servicesActions, reportsActions);
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    // selected objects have the form
    //    { _id: 'abc', summary: { ... }, report: { ... }, expanded: false }
    // where the summary is the data required for the collapsed view,
    // report is the db doc, and expanded is whether to how the details
    // or just the summary in the content pane.





    const updateLiveList = function(updated) {
      return AddReadStatus.reports(updated).then(function() {
        updated.forEach(function(report) {
          liveList.update(report);
        });
        ctrl.hasReports = liveList.count() > 0;
        liveList.refresh();
        if ($state.params.id) {
          liveList.setSelected($state.params.id);
        }
        setActionBarData();
        return updated;
      });
    };

    const query = function(opts) {
      const options = Object.assign({ limit: PAGE_SIZE, hydrateContactNames: true }, opts);
      if (options.limit < PAGE_SIZE) {
        options.limit = PAGE_SIZE;
      }
      if (!options.silent) {
        ctrl.error = false;
        ctrl.errorSyntax = false;
        ctrl.loading = true;
        if (ctrl.selectedReports.length && responsive.isMobile()) {
          ctrl.unsetSelected();
        }
      }
      if (options.skip) {
        ctrl.appending = true;
        options.skip = liveList.count();
      } else if (!options.silent) {
        liveList.set([]);
      }

      Search('reports', ctrl.filters, options)
        .then(updateLiveList)
        .then(function(data) {
          ctrl.moreItems = liveList.moreItems = data.length >= options.limit;
          ctrl.loading = false;
          ctrl.appending = false;
          ctrl.error = false;
          ctrl.errorSyntax = false;
          if (
            !$state.params.id &&
            !responsive.isMobile() &&
            !ctrl.selectedReports &&
            !ctrl.selectMode &&
            $state.is('reports.detail')
          ) {
            $timeout(function() {
              const id = $('.inbox-items li')
                .first()
                .attr('data-record-id');
              $state.go('reports.detail', { id: id }, { location: 'replace' });
            });
          }
          syncCheckboxes();
          initScroll();
        })
        .catch(function(err) {
          ctrl.error = true;
          ctrl.loading = false;
          if (
            ctrl.filters.search &&
            err.reason &&
            err.reason.toLowerCase().indexOf('bad query syntax') !== -1
          ) {
            // invalid freetext filter query
            ctrl.errorSyntax = true;
          }
          $log.error('Error loading messages', err);
        });
    };

    /!**
     * @param {Boolean} force Show list even if viewing the content on mobile
     *!/
    ctrl.search = function(force) {
      // clears report selection for any text search or filter selection
      // does not clear selection when someone is editing a form
      if((ctrl.filters.search || Object.keys(ctrl.filters).length > 1) && !ctrl.enketoEdited) {
        $state.go('reports.detail', { id: null }, { notify: false });
        ctrl.clearSelection();
      }
      if (!force && responsive.isMobile() && ctrl.showContent) {
        // leave content shown
        return;
      }
      ctrl.loading = true;
      if (
        ctrl.filters.search ||
        (ctrl.filters.forms &&
          ctrl.filters.forms.selected &&
          ctrl.filters.forms.selected.length) ||
        (ctrl.filters.facilities &&
          ctrl.filters.facilities.selected &&
          ctrl.filters.facilities.selected.length) ||
        (ctrl.filters.date &&
          (ctrl.filters.date.to || ctrl.filters.date.from)) ||
        (ctrl.filters.valid === true || ctrl.filters.valid === false) ||
        (ctrl.filters.verified && ctrl.filters.verified.length)
      ) {
        ctrl.filtered = true;
        liveList = LiveList['report-search'];
      } else {
        ctrl.filtered = false;
        liveList = LiveList.reports;
      }
      query();
    };

    const initScroll = function() {
      scrollLoader.init(function() {
        if (!ctrl.loading && ctrl.moreItems) {
          query({ skip: true });
        }
      });
    };

    if (!$state.params.id) {
      ctrl.unsetSelected();
    }

    if ($stateParams.tour) {
      Tour.start($stateParams.tour);
    }



    ctrl.search();

    $('.inbox').on('click', '#reports-list .content-row', function(e) {
      if (ctrl.selectMode) {
        e.preventDefault();
        e.stopPropagation();
        const target = $(e.target).closest('li[data-record-id]');
        const reportId = target.attr('data-record-id');
        const checkbox = target.find('input[type="checkbox"]');
        const alreadySelected = _.find(ctrl.selectedReports, { _id: reportId });
        // timeout so if the user clicked the checkbox it has time to
        // register before we set it to the correct value.
        $timeout(function() {
          checkbox.prop('checked', !alreadySelected);
          if (!alreadySelected) {
            ctrl.selectReport(reportId);
          } else {
            ctrl.removeSelectedReport(reportId);
          }
        });
      }
    });

    const syncCheckboxes = function() {
      $('#reports-list li').each(function() {
        const id = $(this).attr('data-record-id');
        const found = _.find(ctrl.selectedReports, { _id: id });
        $(this)
          .find('input[type="checkbox"]')
          .prop('checked', found);
      });
    };

    const setActionBarData = function() {
      ctrl.setLeftActionBar({
        hasResults: ctrl.hasReports,
        exportFn: function(e) {
          const exportFilters = _.assignIn({}, ctrl.filters);
          ['forms', 'facilities'].forEach(function(type) {
            if (exportFilters[type]) {
              delete exportFilters[type].options;
            }
          });
          const $link = $(e.target).closest('a');
          $link.addClass('mm-icon-disabled');
          $timeout(function() {
            $link.removeClass('mm-icon-disabled');
          }, 2000);

          Export('reports', exportFilters, { humanReadable: true });
        },
      });
    };

    setActionBarData();

    $scope.$on('$destroy', function() {
      unsubscribe();
      changeListener.unsubscribe();
      if (!$state.includes('reports')) {
        SearchFilters.destroy();
        LiveList.$reset('reports', 'report-search');
        $('.inbox').off('click', '#reports-list .content-row');
      }
    });
  });
*/
