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
      selectMode: Selectors.getSelectMode(state),
      selectedReports: Selectors.getSelectedReports(state),
      showContent: Selectors.getShowContent(state)
    });
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      const reportsActions = ReportsActions(dispatch);
      return {
        addSelectedReport: reportsActions.addSelectedReport,
        removeSelectedReport: reportsActions.removeSelectedReport,
        setFacilities: globalActions.setFacilities,
        setFirstSelectedReportDocProperty: reportsActions.setFirstSelectedReportDocProperty,
        setLastChangedDoc: globalActions.setLastChangedDoc,
        setLoadingSubActionBar: globalActions.setLoadingSubActionBar,
        setSelectedReports: reportsActions.setSelectedReports
      };
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
    $scope.filters = {
      search: $stateParams.query,
    };
    $scope.verifyingReport = false;

    var liveList = LiveList.reports;
    LiveList.$init($scope, 'reports', 'report-search');

    var updateLiveList = function(updated) {
      return AddReadStatus.reports(updated).then(function() {
        updated.forEach(function(report) {
          liveList.update(report);
        });
        $scope.hasReports = liveList.count() > 0;
        liveList.refresh();
        if ($state.params.id) {
          liveList.setSelected($state.params.id);
        }
        setActionBarData();
        return updated;
      });
    };

    var setSelected = function(model) {
      $scope.setSelected(model);
      if (ctrl.selectMode) {
        return;
      }
      var listModel = _.findWhere(liveList.getList(), { _id: model._id });
      if (listModel && !listModel.read) {
        $scope.unreadCount.report--;
        listModel.read = true;
        LiveList.reports.update(listModel);
        LiveList['report-search'].update(listModel);
      }
      MarkRead([model.doc])
        .then($scope.updateUnreadCount)
        .catch(function(err) {
          $log.error('Error marking read', err);
        });
    };

    var setTitle = function(model) {
      var formInternalId = model.formInternalId || model.form;
      var form = _.findWhere($scope.forms, { code: formInternalId });
      var name = (form && form.name) || (form && form.title) || model.form;
      $scope.setTitle(name);
    };

    var setRightActionBar = function() {
      var model = {};
      model.selected = ctrl.selectedReports.map(function(s) {
        return s.doc || s.summary;
      });
      var doc =
        !ctrl.selectMode &&
        model.selected &&
        model.selected.length === 1 &&
        model.selected[0];
      if (!doc) {
        return $scope.setRightActionBar(model);
      }
      model.verified = doc.verified;
      model.type = doc.content_type;
      model.verifyingReport = $scope.verifyingReport;
      if (!doc.contact || !doc.contact._id) {
        return $scope.setRightActionBar(model);
      }

      DB()
        .get(doc.contact._id)
        .then(function(contact) {
          model.sendTo = contact;
          $scope.setRightActionBar(model);
        })
        .catch(function(err) {
          $scope.setRightActionBar(model);
          throw err;
        });
    };

    $scope.setSelected = function(model) {
      var refreshing = true;
      if (ctrl.selectMode) {
        var existing = _.findWhere(ctrl.selectedReports, { _id: model.doc._id });
        if (existing) {
          _.extend(existing, model);
        } else {
          model.expanded = false;
          ctrl.addSelectedReport(model);
        }
      } else {
        if (liveList.initialised()) {
          liveList.setSelected(model.doc && model.doc._id);
        }
        refreshing =
          model.doc &&
          ctrl.selectedReports.length &&
          ctrl.selectedReports[0]._id === model.doc._id;
        if (!refreshing) {
          $scope.verifyingReport = false;
        }

        model.expanded = true;
        ctrl.setSelectedReports([model]);
        setTitle(model);
      }
      setRightActionBar();
      $scope.settingSelected(refreshing);
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
        setRightActionBar();
      }
    };

    $scope.deselectReport = function(report) {
      const reportId = report._id || report;
      removeSelectedReport(reportId);
      $(`#reports-list li[data-record-id="${reportId}"] input[type="checkbox"]`).prop('checked', false);
      $scope.settingSelected(true);
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

      Search('reports', $scope.filters, options)
        .then(updateLiveList)
        .then(function(data) {
          $scope.moreItems = liveList.moreItems = data.length >= options.limit;
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
            $scope.filters.search &&
            err.reason &&
            err.reason.toLowerCase().indexOf('bad query syntax') !== -1
          ) {
            // invalid freetext filter query
            ctrl.errorSyntax = true;
          }
          $log.error('Error loading messages', err);
        });
    };

    $scope.search = function() {
      // clears report selection for any text search or filter selection
      // does not clear selection when someone is editing a form
      if(($scope.filters.search || Object.keys($scope.filters).length > 1) && !ctrl.enketoEdited) {
        $state.go('reports.detail', { id: null }, { notify: false });
        clearSelection();
      }
      if ($scope.isMobile() && ctrl.showContent) {
        // leave content shown
        return;
      }
      ctrl.loading = true;
      if (
        $scope.filters.search ||
        ($scope.filters.forms &&
          $scope.filters.forms.selected &&
          $scope.filters.forms.selected.length) ||
        ($scope.filters.facilities &&
          $scope.filters.facilities.selected &&
          $scope.filters.facilities.selected.length) ||
        ($scope.filters.date &&
          ($scope.filters.date.to || $scope.filters.date.from)) ||
        ($scope.filters.valid === true || $scope.filters.valid === false) ||
        ($scope.filters.verified && $scope.filters.verified.length)
      ) {
        $scope.filtered = true;
        liveList = LiveList['report-search'];
      } else {
        $scope.filtered = false;
        liveList = LiveList.reports;
      }
      query();
    };

    $scope.$on('ToggleVerifyingReport', function() {
      $scope.verifyingReport = !$scope.verifyingReport;
      setRightActionBar();
    });

    const clearSelection = () => {
      ctrl.setSelectedReports([]);
      LiveList.reports.clearSelected();
      LiveList['report-search'].clearSelected();
      $('#reports-list input[type="checkbox"]').prop('checked', false);
      $scope.verifyingReport = false;
    };

    $scope.$on('ClearSelected', function() {
      clearSelection();
    });

    $scope.$on('EditReport', function() {
      Modal({
        templateUrl: 'templates/modals/edit_report.html',
        controller: 'EditReportCtrl',
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
        if (!ctrl.loading && $scope.moreItems) {
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
        model: {
          report: report,
          group: angular.copy(group),
        },
      });
    };

    $scope.resetFilterModel = function() {
      if (ctrl.selectMode && ctrl.selectedReports && ctrl.selectedReports.length) {
        // can't filter when in select mode
        return;
      }
      $scope.filters = {};
      SearchFilters.reset();
      $scope.search();
    };

    if ($scope.forms) {
      // if forms are already loaded
      $scope.search();
    } else {
      // otherwise wait for loading to complete
      ctrl.loading = true;
      $scope.$on('formLoadingComplete', function() {
        $scope.search();
        var doc =
          ctrl.selectedReports && ctrl.selectedReports[0] && ctrl.selectedReports[0].doc;
        if (doc) {
          setTitle(doc);
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
      $scope.setLoadingContent(true);
      Search('reports', $scope.filters, { limit: 500, hydrateContactNames: true })
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
          $scope.settingSelected(true);
          setRightActionBar();
          $('#reports-list input[type="checkbox"]').prop('checked', true);
        })
        .catch(function(err) {
          $log.error('Error selecting all', err);
        });
    });

    var deselectAll = function() {
      ctrl.setSelectedReports([]);
      setRightActionBar();
      $('#reports-list input[type="checkbox"]').prop('checked', false);
    };

    var setActionBarData = function() {
      $scope.setLeftActionBar({
        hasResults: $scope.hasReports,
        exportFn: function(e) {
          var exportFilters = _.extendOwn({}, $scope.filters);
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
          $scope.hasReports = liveList.count() > 0;
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
