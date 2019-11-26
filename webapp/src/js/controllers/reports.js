const _ = require('underscore');
const responsive = require('../modules/responsive');
const scrollLoader = require('../modules/scroll-loader');

const PAGE_SIZE = 50;

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
    Modal,
    ReportViewModelGenerator,
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
    ctrl.setSelectedReports([]);
    ctrl.appending = false;
    ctrl.error = false;
    ctrl.setFilters({
      search: $stateParams.query,
    });
    ctrl.verifyingReport = false;

    var liveList = LiveList.reports;

    var updateLiveList = function(updated) {
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

    var fetchFormattedReport = function(report) {
      var id = _.isString(report) ? report : report._id;
      return ReportViewModelGenerator(id);
    };

    $scope.refreshReportSilently = function(report) {
      return fetchFormattedReport(report)
        .then(model => ctrl.setSelected(model))
        .catch(err => $log.error('Error fetching formatted report', err));
    };

    $scope.selectReport = function(report) {
      if (!report) {
        return;
      }
      ctrl.setLoadingShowContent(report);
      fetchFormattedReport(report)
        .then(function(model) {
          if (model) {
            $timeout(function() {
              ctrl.setSelected(model);
              initScroll();
            });
          }
        })
        .catch(function(err) {
          ctrl.unsetSelected();
          $log.error('Error selecting report', err);
        });
    };

    var query = function(opts) {
      const options = _.extend({ limit: PAGE_SIZE, hydrateContactNames: true }, opts);
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
              var id = $('.inbox-items li')
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

    ctrl.search = function() {
      // clears report selection for any text search or filter selection
      // does not clear selection when someone is editing a form
      if((ctrl.filters.search || Object.keys(ctrl.filters).length > 1) && !ctrl.enketoEdited) {
        $state.go('reports.detail', { id: null }, { notify: false });
        ctrl.clearSelection();
      }
      if (responsive.isMobile() && ctrl.showContent) {
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

    var initScroll = function() {
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

    $scope.edit = function(report, group) {
      Modal({
        templateUrl: 'templates/modals/edit_message_group.html',
        controller: 'EditMessageGroupCtrl',
        controllerAs: 'editMessageGroupCtrl',
        model: {
          report: report,
          group: angular.copy(group),
        },
      });
    };

    ctrl.resetFilterModel = function() {
      if (ctrl.selectMode && ctrl.selectedReports && ctrl.selectedReports.length) {
        // can't filter when in select mode
        return;
      }
      ctrl.clearFilters();
      SearchFilters.reset();
      ctrl.search();
    };

    ctrl.search();

    $('.inbox').on('click', '#reports-list .content-row', function(e) {
      if (ctrl.selectMode) {
        e.preventDefault();
        e.stopPropagation();
        var target = $(e.target).closest('li[data-record-id]');
        var reportId = target.attr('data-record-id');
        var checkbox = target.find('input[type="checkbox"]');
        var alreadySelected = _.findWhere(ctrl.selectedReports, { _id: reportId });
        // timeout so if the user clicked the checkbox it has time to
        // register before we set it to the correct value.
        $timeout(function() {
          checkbox.prop('checked', !alreadySelected);
          if (!alreadySelected) {
            $scope.selectReport(reportId);
          } else {
            ctrl.removeSelectedReport(reportId);
          }
        });
      }
    });

    var syncCheckboxes = function() {
      $('#reports-list li').each(function() {
        var id = $(this).attr('data-record-id');
        var found = _.findWhere(ctrl.selectedReports, { _id: id });
        $(this)
          .find('input[type="checkbox"]')
          .prop('checked', found);
      });
    };

    var setActionBarData = function() {
      ctrl.setLeftActionBar({
        hasResults: ctrl.hasReports,
        exportFn: function(e) {
          var exportFilters = _.extendOwn({}, ctrl.filters);
          ['forms', 'facilities'].forEach(function(type) {
            if (exportFilters[type]) {
              delete exportFilters[type].options;
            }
          });
          var $link = $(e.target).closest('a');
          $link.addClass('mm-icon-disabled');
          $timeout(function() {
            $link.removeClass('mm-icon-disabled');
          }, 2000);

          Export('reports', exportFilters, { humanReadable: true });
        },
      });
    };

    setActionBarData();

    var changeListener = Changes({
      key: 'reports-list',
      callback: function(change) {
        if (change.deleted) {
          liveList.remove(change.id);
          ctrl.hasReports = liveList.count() > 0;
          setActionBarData();
        } else {
          query({ silent: true, limit: liveList.count() });
        }
      },
      filter: function(change) {
        return change.doc && change.doc.form || liveList.contains(change.id);
      },
    });

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
