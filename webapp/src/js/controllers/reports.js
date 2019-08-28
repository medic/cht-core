const _ = require('underscore'),
  scrollLoader = require('../modules/scroll-loader'),
  lineageFactory = require('@medic/lineage');

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
    $translate,
    AddReadStatus,
    Auth,
    Changes,
    DB,
    Export,
    GlobalActions,
    LiveList,
    MarkRead,
    Modal,
    PlaceHierarchy,
    ReportViewModelGenerator,
    ReportsActions,
    Search,
    SearchFilters,
    Selectors,
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
      return Object.assign({}, globalActions, reportsActions);
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    var lineage = lineageFactory();

    // Render the facilities hierarchy as the user is scrolling through the list
    // Initially, don't load/render any
    $scope.totalFacilitiesDisplayed = 0;
    ctrl.setFacilities([]);

    // Load the facilities hierarchy and render one district hospital
    // when the user clicks on the filter dropdown
    $scope.monitorFacilityDropdown = () => {
      PlaceHierarchy()
        .then(function(hierarchy) {
          ctrl.setFacilities(hierarchy);
          $scope.totalFacilitiesDisplayed += 1;
        })
        .catch(function(err) {
          $log.error('Error loading facilities', err);
        });

      $('#facilityDropdown span.dropdown-menu > ul').scroll((event) => {
        // visible height + pixel scrolled >= total height - 100
        if (event.target.offsetHeight + event.target.scrollTop >= event.target.scrollHeight - 100) {
          $timeout(() => $scope.totalFacilitiesDisplayed += 1);
        }
      });
    };

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
    LiveList.$init($scope, 'reports', 'report-search');

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

    var setSelected = function(model) {
      ctrl.setSelected(model);
      if (ctrl.selectMode) {
        return;
      }
      var listModel = _.findWhere(liveList.getList(), { _id: model._id });
      if (listModel && !listModel.read) {
        ctrl.updateUnreadCount({ report: ctrl.unreadCount.report - 1 });
        listModel.read = true;
        LiveList.reports.update(listModel);
        LiveList['report-search'].update(listModel);
      }
      MarkRead([model.doc])
        .catch(function(err) {
          $log.error('Error marking read', err);
        });
    };

    var fetchFormattedReport = function(report) {
      var id = _.isString(report) ? report : report._id;
      return ReportViewModelGenerator(id);
    };

    $scope.refreshReportSilently = function(report) {
      return fetchFormattedReport(report)
        .then(function(model) {
          setSelected(model);
        })
        .catch(function(err) {
          $log.error('Error fetching formatted report', err);
        });
    };

    var removeSelectedReport = function(id) {
      ctrl.removeSelectedReport(id);
      var index = _.findIndex(ctrl.selectedReports, function(s) {
        return s._id === id;
      });
      if (index !== -1) {
        ctrl.setRightActionBar();
      }
    };

    $scope.deselectReport = function(report) {
      const reportId = report._id || report;
      removeSelectedReport(reportId);
      $(`#reports-list li[data-record-id="${reportId}"] input[type="checkbox"]`).prop('checked', false);
      ctrl.settingSelected(true);
    };

    $scope.selectReport = function(report) {
      if (!report) {
        $scope.clearSelected();
        return;
      }
      $scope.setLoadingContent(report);
      fetchFormattedReport(report)
        .then(function(model) {
          if (model) {
            $timeout(function() {
              setSelected(model);
              initScroll();
            });
          }
        })
        .catch(function(err) {
          $scope.clearSelected();
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
        if (ctrl.selectedReports.length && $scope.isMobile()) {
          $scope.selectReport();
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
            !$scope.isMobile() &&
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
      if ($scope.isMobile() && ctrl.showContent) {
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

    $scope.$on('ToggleVerifyingReport', function() {
      ctrl.setVerifyingReport(!ctrl.verifyingReport);
      ctrl.setRightActionBar();
    });

    $scope.$on('EditReport', function() {
      Modal({
        templateUrl: 'templates/modals/edit_report.html',
        controller: 'EditReportCtrl',
        controllerAs: 'editReportCtrl',
        model: { report: ctrl.selectedReports[0].doc },
      });
    });

    $scope.$on('VerifyReport', function(e, reportIsValid) {
      if (!ctrl.selectedReports[0].doc.form) {
        return;
      }

      ctrl.setLoadingSubActionBar(true);

      const promptUserToConfirmVerification = () => {
        const verificationTranslationKey = reportIsValid ? 'reports.verify.valid' : 'reports.verify.invalid';
        return Modal({
          templateUrl: 'templates/modals/verify_confirm.html',
          controller: 'VerifyReportModalCtrl',
          model: {
            proposedVerificationState: $translate.instant(verificationTranslationKey),
          },
        })
        .then(() => true)
        .catch(() => false);
      };

      const shouldReportBeVerified = function (canUserEdit) {
        // verify if user verifications are allowed
        if (canUserEdit) {
          return true;
        }

        // don't verify if user can't edit and this is an edit
        const docHasExistingResult = ctrl.selectedReports[0].doc.verified !== undefined;
        if (docHasExistingResult) {
          return false;
        }

        // verify if this is not an edit and the user accepts  prompt
        return promptUserToConfirmVerification();
      };

      const writeVerificationToDoc = function() {
        if (ctrl.selectedReports[0].doc.contact) {
          const minifiedContact = lineage.minifyLineage(ctrl.selectedReports[0].doc.contact);
          ctrl.setFirstSelectedReportDocProperty({ contact: minifiedContact });
        }

        const clearVerification = ctrl.selectedReports[0].doc.verified === reportIsValid;
        if (clearVerification) {
          ctrl.setFirstSelectedReportDocProperty({
            verified: undefined,
            verified_date: undefined,
          });
        } else {
          ctrl.setFirstSelectedReportDocProperty({
            verified: reportIsValid,
            verified_date: Date.now(),
          });
        }
        ctrl.setLastChangedDoc(ctrl.selectedReports[0].doc);

        return DB()
          .get(ctrl.selectedReports[0].doc._id)
          .then(function(existingRecord) {
            ctrl.setFirstSelectedReportDocProperty({ _rev: existingRecord._rev });
            return DB().post(ctrl.selectedReports[0].doc);
          })
          .catch(function(err) {
            $log.error('Error verifying message', err);
          })
          .finally(function () {
            $scope.$broadcast('VerifiedReport', reportIsValid);
            ctrl.setLoadingSubActionBar(false);
          });
      };

      ctrl.setLoadingSubActionBar(true);
      Auth('can_edit_verification')
        .then(() => true)
        .catch(() => false)
        .then(canUserEditVerifications => shouldReportBeVerified(canUserEditVerifications))
        .then(function(shouldVerify) {
          if (!shouldVerify) {
            return;
          }

          return writeVerificationToDoc();
        })
        .catch(err => $log.error(`Error verifying message: ${err}`))
        .finally(() => ctrl.setLoadingSubActionBar(false));
    });

    var initScroll = function() {
      scrollLoader.init(function() {
        if (!ctrl.loading && ctrl.moreItems) {
          query({ skip: true });
        }
      });
    };

    if (!$state.params.id) {
      $scope.selectReport();
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

    if (ctrl.forms) {
      // if forms are already loaded
      ctrl.search();
    } else {
      // otherwise wait for loading to complete
      ctrl.loading = true;
      $scope.$on('formLoadingComplete', function() {
        ctrl.search();
        var doc =
          ctrl.selectedReports && ctrl.selectedReports[0] && ctrl.selectedReports[0].doc;
        if (doc) {
          ctrl.setTitle(doc);
        }
      });
    }

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
            removeSelectedReport(reportId);
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

    $scope.$on('SelectAll', function() {
      ctrl.setLoadingShowContent(true);
      Search('reports', ctrl.filters, { limit: 500, hydrateContactNames: true })
        .then(function(summaries) {
          var selected = summaries.map(function(summary) {
            return {
              _id: summary._id,
              summary: summary,
              expanded: false,
              lineage: summary.lineage,
              contact: summary.contact,
            };
          });
          ctrl.setSelectedReports(selected);
          ctrl.settingSelected(true);
          ctrl.setRightActionBar();
          $('#reports-list input[type="checkbox"]').prop('checked', true);
        })
        .catch(function(err) {
          $log.error('Error selecting all', err);
        });
    });

    var deselectAll = function() {
      ctrl.setSelectedReports([]);
      ctrl.setRightActionBar();
      $('#reports-list input[type="checkbox"]').prop('checked', false);
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

    $scope.$on('DeselectAll', deselectAll);

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
