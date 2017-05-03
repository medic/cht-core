var _ = require('underscore'),
    scrollLoader = require('../modules/scroll-loader');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ReportsCtrl',
    function (
      $log,
      $scope,
      $state,
      $stateParams,
      $timeout,
      Changes,
      DB,
      Export,
      LiveList,
      MarkRead,
      Modal,
      ReportViewModelGenerator,
      Search,
      SearchFilters,
      Tour,
      TranslateFrom
    ) {
      'ngInject';

      // selected objects have the form
      //    { _id: 'abc', summary: { ... }, report: { ... }, expanded: false }
      // where the summary is the data required for the collapsed view,
      // report is the db doc, and expanded is whether to how the details
      // or just the summary in the content pane.
      $scope.selected = [];
      $scope.filters = {
        search: $stateParams.query
      };

      var liveList = LiveList.reports;

      var updateLiveList = function(updated) {
        _.each(updated, function(report) {
          liveList.update(report);
        });
        $scope.hasReports = liveList.count() > 0;
        liveList.refresh();
        if ($state.params.id) {
          liveList.setSelected($state.params.id);
        }
      };

      var setSelected = function(model) {
        $scope.setSelected(model);
        if ($scope.selectMode) {
          return;
        }
        if (!$scope.isRead(model.doc)) {
          $scope.readStatus.forms--;
        }
        MarkRead(model.doc._id, true)
          .then($scope.updateReadStatus)
          .catch(function(err) {
            $log.error('Error marking read', err);
          });
      };

      var setTitle = function(model) {
        var name = model.form;
        var form = _.findWhere($scope.forms, { code: model.form });
        if (form) {
          name = form.name || form.title;
        }
        $scope.setTitle(TranslateFrom(name));
      };

      var setRightActionBar = function() {
        var model = {};
        model.selected = $scope.selected.map(function(s) {
          return s.doc || s.summary;
        });
        console.log('setting rhs', model);
        var doc = !$scope.selectMode &&
                  model.selected &&
                  model.selected.length === 1 &&
                  model.selected[0];
        if (doc) {
          model.verified = doc.verified;
          model.type = doc.content_type;
          if (doc.contact && doc.contact._id) {
            DB().get(doc.contact._id).then(function(contact) {
              model.sendTo = contact;
              $scope.setRightActionBar(model);
            });
          } else {
            $scope.setRightActionBar(model);
          }
        } else {
          $scope.setRightActionBar(model);
        }
      };

      $scope.setSelected = function(model) {
        var refreshing = true;
        if ($scope.selectMode) {
          var existing = _.findWhere($scope.selected, { _id: model.doc._id });
          if (existing) {
            _.extend(existing, model);
          } else {
            model.expanded = false;
            $scope.selected.push(model);
          }
        } else {
          if (liveList.initialised()) {
            liveList.setSelected(model.doc && model.doc._id);
          }
          refreshing = model.doc &&
                       $scope.selected.length &&
                       $scope.selected[0]._id === model.doc._id;
          model.expanded = true;
          $scope.selected = [ model ];
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

      var spliceSelected = function(id) {
        var index = _.findIndex($scope.selected, function(s) {
          return s._id === id;
        });
        if (index !== -1) {
          $scope.selected.splice(index, 1);
          setRightActionBar();
        }
      };

      $scope.deselectReport = function(report) {
        spliceSelected(report._id);
        $('#reports-list li[data-record-id="' + report._id + '"] input[type="checkbox"]')
          .prop('checked', false);
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
            console.log('model', model);
            if (model) {
              setSelected(model);
              initScroll();
            }
          })
          .catch(function(err) {
            $scope.clearSelected();
            $log.error('Error selecting report', err);
          });
      };

      var query = function(options) {
        options = options || {};
        options.limit = options.limit || 50;
        if (!options.silent) {
          $scope.error = false;
          $scope.errorSyntax = false;
          $scope.loading = true;
          if ($scope.selected.length && $scope.isMobile()) {
            $scope.selectReport();
          }
        }
        if (options.skip) {
          $scope.appending = true;
          options.skip = liveList.count();
        } else if (!options.silent) {
          liveList.set([]);
        }

        Search('reports', $scope.filters, options)
          .then(function(data) {
            $scope.moreItems = liveList.moreItems = data.length >= options.limit;
            $scope.loading = false;
            $scope.appending = false;
            $scope.error = false;
            $scope.errorSyntax = false;
            updateLiveList(data);
            if (!$state.params.id &&
                !$scope.isMobile() &&
                !$scope.selected &&
                !$scope.selectMode &&
                $state.is('reports.detail')) {
              $timeout(function() {
                var id = $('.inbox-items li').first().attr('data-record-id');
                $state.go('reports.detail', { id: id }, { location: 'replace' });
              });
            }
            syncCheckboxes();
            initScroll();
          })
          .catch(function(err) {
            $scope.error = true;
            $scope.loading = false;
            if ($scope.filters.search &&
                err.reason &&
                err.reason.toLowerCase().indexOf('bad query syntax') !== -1) {
              // invalid freetext filter query
              $scope.errorSyntax = true;
            }
            $log.error('Error loading messages', err);
          });
      };

      $scope.search = function() {
        if ($scope.isMobile() && $scope.showContent) {
          // leave content shown
          return;
        }
        $scope.loading = true;

        if ($scope.filters.search ||
            ($scope.filters.forms && $scope.filters.forms.selected && $scope.filters.forms.selected.length) ||
            ($scope.filters.facilities && $scope.filters.facilities.selected && $scope.filters.facilities.selected.length) ||
            ($scope.filters.date && ($scope.filters.date.to || $scope.filters.date.from)) ||
            ($scope.filters.valid === true || $scope.filters.valid === false) ||
            ($scope.filters.verified === true || $scope.filters.verified === false)
           ) {
          $scope.filtered = true;
          liveList = LiveList['report-search'];
        } else {
          $scope.filtered = false;
          liveList = LiveList.reports;
        }
        query();
      };

      $scope.$on('ClearSelected', function() {
        $scope.selected = [];
        $('#reports-list input[type="checkbox"]')
          .prop('checked', false);
        LiveList.reports.clearSelected();
        LiveList['report-search'].clearSelected();
      });

      $scope.$on('VerifyReport', function(e, verify) {
        if ($scope.selected[0].doc.form) {
          DB().get($scope.selected[0]._id)
            .then(function(message) {
              message.verified = verify;
              return DB().post(message);
            })
            .catch(function(err) {
              $log.error('Error verifying message', err);
            });
        }
      });

      $scope.$on('EditReport', function() {
        Modal({
          templateUrl: 'templates/modals/edit_report.html',
          controller: 'EditReportCtrl',
          model: { report: $scope.selected[0].doc }
        });
      });

      var initScroll = function() {
        scrollLoader.init(function() {
          if (!$scope.loading && $scope.moreItems) {
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
            group: angular.copy(group)
          }
        });
      };

      $scope.setupSearchFreetext = function() {
        SearchFilters.freetext($scope.search);
      };
      $scope.setupSearchFormType = function() {
        SearchFilters.formType(function(forms) {
          $scope.filters.forms = forms;
          $scope.search();
        });
      };
      $scope.setupSearchStatus = function() {
        SearchFilters.status(function(status) {
          $scope.filters.valid = status.valid;
          $scope.filters.verified = status.verified;
          $scope.search();
        });
      };
      $scope.setupSearchFacility = function() {
        SearchFilters.facility(function(facilities) {
          $scope.filters.facilities = facilities;
          $scope.search();
        });
      };
      $scope.setupSearchDate = function() {
        SearchFilters.date(function(date) {
          $scope.filters.date = date;
          $scope.search();
        });
      };
      $scope.resetFilterModel = function() {
        if ($scope.selectMode && $scope.selected && $scope.selected.length) {
          // can't filter when in select mode
          return;
        }
        $scope.filters = {};
        SearchFilters.reset();
        $scope.search();
      };

      if ($scope.forms) { // if forms are already loaded
        $scope.search();
      } else { // otherwise wait for loading to complete
        $scope.loading = true;
        $scope.$on('formLoadingComplete', function() {
          $scope.search();
          var doc = $scope.selected &&
                    $scope.selected[0] &&
                    $scope.selected[0].doc;
          if (doc) {
            setTitle(doc);
          }
        });
      }

      $('.inbox').on('click', '#reports-list .message-wrapper', function(e) {
        if ($scope.selectMode) {
          e.preventDefault();
          e.stopPropagation();
          var target = $(e.target).closest('li[data-record-id]');
          var reportId = target.attr('data-record-id');
          var checkbox = target.find('input[type="checkbox"]');
          var alreadySelected = _.findWhere($scope.selected, { _id: reportId });
          // timeout so if the user clicked the checkbox it has time to
          // register before we set it to the correct value.
          $timeout(function() {
            checkbox.prop('checked', !alreadySelected);
            if (!alreadySelected) {
              $scope.selectReport(reportId);
            } else {
              spliceSelected(reportId);
            }
          });
        }
      });

      var syncCheckboxes = function() {
        $('#reports-list li').each(function() {
          var id = $(this).attr('data-record-id');
          var found = _.findWhere($scope.selected, { _id: id });
          $(this).find('input[type="checkbox"]').prop('checked', found);
        });
      };

      $scope.$on('SelectAll', function() {
        $scope.setLoadingContent(true);
        Search('reports', $scope.filters, { limit: 10000 })
          .then(function(summaries) {
            summaries.forEach(function(summary) {
              summary.expanded = false;
            });
            $scope.selected = summaries;
            $scope.settingSelected(true);
            setRightActionBar();
            $('#reports-list input[type="checkbox"]').prop('checked', true);
          })
          .catch(function(err) {
            $log.error('Error selecting all', err);
          });
      });

      var deselectAll = function() {
        $scope.selected = [];
        setRightActionBar();
        $('#reports-list input[type="checkbox"]').prop('checked', false);
      };

      $scope.setLeftActionBar({
        exportFn: function() {
          Export($scope.filters, 'reports');
        }
      });

      $scope.$on('DeselectAll', deselectAll);

      $scope.$on('$stateChangeStart', function(event, toState) {
        if (toState.name.indexOf('reports') === -1) {
          $scope.unsetSelected();
        }
      });

      var changeListener = Changes({
        key: 'reports-list',
        callback: function(change) {
          if (change.deleted) {
            liveList.remove(change.doc);
            $scope.hasReports = liveList.count() > 0;
          } else {
            query({ silent: true, limit: liveList.count() });
          }
        },
        filter: function(change) {
          return change.doc.form;
        }
      });

      $scope.$on('$destroy', changeListener.unsubscribe);
    }
  );

}());
