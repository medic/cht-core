var _ = require('underscore'),
    moment = require('moment'),
    modal = require('../modules/modal'),
    scrollLoader = require('../modules/scroll-loader'),
    ajaxDownload = require('../modules/ajax-download');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ReportsCtrl',
    function (
      $http,
      $log,
      $rootScope,
      $scope,
      $state,
      $stateParams,
      $timeout,
      $translate,
      DB,
      DownloadUrl,
      EditGroup,
      FormatDataRecord,
      LiveList,
      MarkRead,
      Search,
      SearchFilters,
      Settings,
      TranslateFrom,
      Verified
    ) {
      'ngInject';

      // selected objects have the form
      //    { report: { ... }, expanded: false }
      // where the report is the db doc and expanded is whether to
      // show the details or just the summary in the content pane.
      $scope.selected = [];
      $scope.selectedGroup = null;
      $scope.filters = {
        search: $stateParams.query
      };

      var liveList = LiveList.reports;

      var _setSelectedGroup = function(group) {
        $scope.selectedGroup = angular.copy(group);
      };

      $scope.updateGroup = function(group) {
        var pane = modal.start($('#edit-message-group'));
        EditGroup($scope.selected[0]._id, group)
          .then(function() {
            pane.done();
          })
          .catch(function(err) {
            $translate('Error updating group').then(function(text) {
              pane.done(text, err);
            });
          });
      };

      var _updateLiveList = function(updated) {
        _.each(updated, function(report) {
          liveList.update(report, false);
        });
        $scope.hasReports = liveList.count() > 0;
        liveList.refresh();
      };

      var _setSelected = function(report) {
        $scope.setSelected(report);
        if (!$scope.isRead(report)) {
          $scope.readStatus.forms--;
        }
        MarkRead(report._id, true)
          .then($scope.updateReadStatus)
          .catch(function(err) {
            $log.error('Error marking read', err);
          });
      };

      var setTitle = function(doc) {
        var name = doc.form;
        var form = _.findWhere($scope.forms, { code: doc.form });
        if (form) {
          name = form.name || form.title;
        }
        $scope.setTitle(TranslateFrom(name));
      };

      var getFields = function(results, values, labelPrefix, depth) {
        if (depth > 3) {
          depth = 3;
        }
        Object.keys(values).forEach(function(key) {
          var value = values[key];
          var label = labelPrefix + '.' + key;
          if (_.isObject(value)) {
            results.push({
              label: label,
              depth: depth
            });
            getFields(results, value, label, depth + 1);
          } else {
            results.push({
              label: label,
              value: value,
              depth: depth
            });
          }
        });
        return results;
      };

      var getDisplayFields = function(report) {
        // calculate fields to display
        if (!report.fields) {
          return [];
        }
        var label = 'report.' + report.form;
        var fields = getFields([], report.fields, label, 0);
        var hide = report.hidden_fields || [];
        hide.push('inputs');
        return _.reject(fields, function(field) {
          return _.some(hide, function(h) {
            return field.label.indexOf(label + '.' + h) === 0;
          });
        });
      };

      var setActionBar = function() {
        var model = {};
        model.selected = $scope.selected.map(function(s) {
          return s.report || s.summary;
        });
        if (!$scope.selectMode &&
            model.selected &&
            model.selected.length === 1) {
          var doc = model.selected[0];
          model.verified = doc.verified;
          model.type = doc.content_type;
          model.sendTo = doc;
        }
        $scope.setActionBar(model);
      };

      $scope.setSelected = function(doc) {
        var refreshing = true;
        var displayFields = getDisplayFields(doc);
        if ($scope.selectMode) {
          var existing = _.findWhere($scope.selected, { _id: doc._id });
          if (existing) {
            existing.report = doc;
            existing.displayFields = displayFields;
          } else {
            $scope.selected.push({
              _id: doc._id,
              report: doc,
              expanded: false,
              displayFields: displayFields
            });
          }
        } else {
          liveList.setSelected(doc._id);
          refreshing = doc &&
                       $scope.selected.length &&
                       $scope.selected[0]._id === doc._id;
          $scope.selected = [ {
            _id: doc._id,
            report: doc,
            expanded: true,
            displayFields: displayFields
          } ];
          setTitle(doc);
        }
        setActionBar();
        $scope.settingSelected(refreshing);
      };

      var _fetchFormattedReport = function(report) {
        if (_.isString(report)) {
          // id only - fetch the full doc
          return DB.get()
            .get(report)
            .then(FormatDataRecord);
        }
        return FormatDataRecord(report);
      };

      $scope.refreshReportSilently = function(report) {
        return _fetchFormattedReport(report)
          .then(function(doc) {
            _setSelected(doc[0]);
          })
          .catch(function(err) {
            $log.error('Error fetching formatted report', err);
          });
      };

      $scope.deselectReport = function(report) {
        for (var i = 0; i < $scope.selected.length; i++) {
          if ($scope.selected[i]._id === report._id) {
            $scope.selected.splice(i, 1);
          }
        }
        $('#reports-list li[data-record-id="' + report._id + '"] input[type="checkbox"]')
          .prop('checked', false);
        $scope.settingSelected(true);
        setActionBar();
      };

      $scope.handleDeletedReport = function(report) {
        if ($scope.selectMode) {
          // remove just this one item
          liveList.remove(report);
          $scope.deselectReport(report);
        } else {
          // clear all
          $scope.selectReport();
        }
      };

      $scope.selectReport = function(report) {
        if (!report || !liveList.initialised()) {
          $scope.clearSelected();
          return;
        }
        $scope.setLoadingContent(report);
        if (!$scope.selectMode) {
          // in selected mode we append to the list so don't clear it
          $scope.clearSelected();
        }
        _fetchFormattedReport(report)
          .then(function(formatted) {
            return formatted && formatted.length && formatted[0];
          })
          .then(function(doc) {
            if (doc) {
              _setSelected(doc);
              _initScroll();
            }
          })
          .catch(function(err) {
            $scope.clearSelected();
            $log.error('Error selecting report', err);
          });
      };

      var _query = function(options) {
        options = options || {};
        options.limit = 50;
        if (!options.silent) {
          $scope.error = false;
          $scope.errorSyntax = false;
          $scope.loading = true;
          if ($scope.isMobile()) {
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
            _updateLiveList(data);
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
            _initScroll();
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
          liveList.set([]);
          _query();
        } else {
          $scope.filtered = false;
          liveList = LiveList.reports;
          if (liveList.initialised()) {
            $timeout(function() {
              $scope.loading = false;
              liveList.refresh();
              $scope.hasReports = liveList.count() > 0;
              $scope.moreItems = liveList.moreItems;
              _initScroll();
            });
          } else {
            _query();
          }
        }
      };

      $scope.$on('ClearSelected', function() {
        $scope.selected = [];
        $('#reports-list input[type="checkbox"]')
          .prop('checked', false);
        liveList.clearSelected();
      });

      $scope.$on('VerifyReport', function(e, verify) {
        if ($scope.selected[0].report.form) {
          Verified($scope.selected[0]._id, verify, function(err) {
            if (err) {
              $log.error('Error verifying message', err);
            }
          });
        }
      });

      $scope.$on('EditReport', function() {
        var val = ($scope.selected[0].report.contact && $scope.selected[0].report.contact._id) || '';
        $('#edit-report [name=id]').val($scope.selected[0]._id);
        $('#edit-report [name=facility]').select2('val', val);
        $('#edit-report').modal('show');
      });

      var _initScroll = function() {
        scrollLoader.init(function() {
          if (!$scope.loading && $scope.moreItems) {
            _query({ skip: true });
          }
        });
      };

      if (!$stateParams.id) {
        $scope.selectReport();
      }

      if ($stateParams.tour) {
        $rootScope.$broadcast('TourStart', $stateParams.tour);
      }

      var getNextHalfHour = function() {
        var time = moment().second(0).millisecond(0);
        if (time.minute() < 30) {
          time.minute(30);
        } else {
          time.minute(0);
          time.add(1, 'hours');
        }
        return time;
      };

      var initEditMessageModal = function() {
        $timeout(function() {
          Settings()
            .then(function(settings) {
              $('#edit-message-group .datepicker').daterangepicker({
                singleDatePicker: true,
                timePicker: true,
                applyClass: 'btn-primary',
                cancelClass: 'btn-link',
                parentEl: '#edit-message-group .modal-dialog .modal-content',
                format: settings.reported_date_format,
                minDate: getNextHalfHour()
              },
              function(date) {
                var i = this.element.closest('fieldset').attr('data-index');
                $scope.selectedGroup.rows[i].due = date.toISOString();
              });
            });
        });
      };

      $scope.edit = function(group) {
        _setSelectedGroup(group);
        $('#edit-message-group').modal('show');
        initEditMessageModal();
      };

      $scope.addTask = function(group) {
        group.rows.push({
          due: moment(),
          added: true,
          group: group.number,
          state: 'scheduled',
          messages: [ { message: '' } ]
        });
        initEditMessageModal();
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

      $scope.search();

      $('.inbox').on('click', '#reports-list .message-wrapper', function(e) {
        if ($scope.selectMode) {
          e.preventDefault();
          e.stopPropagation();
          var target = $(e.target).closest('li');
          var reportId = target.attr('data-record-id');
          var checkbox = target.find('input[type="checkbox"]');
          var alreadySelected = _.findWhere($scope.selected, { _id: reportId });
          $timeout(function() {
            checkbox.prop('checked', !alreadySelected);
            if (!alreadySelected) {
              $scope.selectReport(reportId);
            } else {
              for (var i = 0; i < $scope.selected.length; i++) {
                if ($scope.selected[i]._id === reportId) {
                  $scope.selected.splice(i, 1);
                  setActionBar();
                  return;
                }
              }
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
            $scope.selected = summaries.map(function(summary) {
              return {
                _id: summary._id,
                summary: summary,
                expanded: false
              };
            });
            $scope.settingSelected(true);
            setActionBar();
            $('#reports-list input[type="checkbox"]').prop('checked', true);
          })
          .catch(function(err) {
            $log.error('Error selecting all', err);
          });
      });

      var deselectAll = function() {
        $scope.selected = [];
        setActionBar();
        $('#reports-list input[type="checkbox"]').prop('checked', false);
      };

      $scope.$on('DeselectAll', deselectAll);

      $scope.$on('export', function() {
        if ($scope.currentTab === 'reports') {
          DownloadUrl($scope.filters, 'reports', function(err, url) {
            if (err) {
              return $log.error(err);
            }
            $http.post(url)
              .then(ajaxDownload.download)
              .catch(function(err) {
                $log.error('Error downloading', err);
              });
          });
        }
      });

      $scope.$on('$destroy', function() {
        if (!$state.includes('reports')) {
          $scope.setTitle();
          $scope.clearSelected();
        }
      });
    }
  );

}());
