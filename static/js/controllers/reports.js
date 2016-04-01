var _ = require('underscore'),
    modal = require('../modules/modal'),
    scrollLoader = require('../modules/scroll-loader');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ReportsCtrl',
    ['$scope', '$rootScope', '$state', '$stateParams', '$timeout', '$translate', '$log', 'TranslateFrom', 'LiveList', 'Settings', 'MarkRead', 'Search', 'EditGroup', 'FormatDataRecord', 'DB', 'Verified',
    function ($scope, $rootScope, $state, $stateParams, $timeout, $translate, $log, TranslateFrom, LiveList, Settings, MarkRead, Search, EditGroup, FormatDataRecord, DB, Verified) {

      $scope.filterModel.type = 'reports';
      $scope.selectedGroup = null;
      $scope.selected = null;

      var liveList = LiveList.reports;

      $scope.setSelectedGroup = function(group) {
        $scope.selectedGroup = angular.copy(group);
      };

      $scope.updateGroup = function(group) {
        var pane = modal.start($('#edit-message-group'));
        EditGroup($scope.selected._id, group)
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

      var updateDisplayFields = function(report) {
        // calculate fields to display
        var label = 'report.' + report.form;
        var fields = getFields([], report.fields, label, 0);
        var hide = report.hidden_fields || [];
        hide.push('inputs');
        fields = _.reject(fields, function(field) {
          return _.some(hide, function(h) {
            return field.label.indexOf(label + '.' + h) === 0;
          });
        });
        $scope.displayFields = fields;
      };

      $scope.setSelected = function(doc) {
        if (doc.fields) {
          updateDisplayFields(doc);
        }

        liveList.setSelected(doc._id);

        var refreshing = doc && $scope.selected && $scope.selected.id === doc._id;
        $scope.selected = doc;
        setTitle(doc);
        $scope.setActionBar({
          _id: doc._id,
          verified: doc.verified,
          type: doc.content_type,
          sendTo: doc
        });
        $scope.settingSelected(refreshing);
      };

      var _fetchFormattedReport = function(report) {
        if (_.isString(report)) {
          // id only - fetch the full doc
          return DB.get()
            .get(report)
            .then(FormatDataRecord);
        } else {
          return FormatDataRecord(report);
        }
      };

      $scope.refreshReportSilently = function(report) {
        _fetchFormattedReport(report)
          .then(function(doc) {
              _setSelected(doc[0]);
            })
          .catch(function(err) {
            $log.error('Error fetching formatted report', err);
          });
      };

      $scope.selectReport = function(report) {
        if (!report || !liveList.initialised()) {
          $scope.clearSelected();
          return;
        }

        $scope.clearSelected();
        $scope.setLoadingContent(report);

        _fetchFormattedReport(report)
          .then(function(doc) {
            if (doc) {
              _setSelected(doc[0]);
              _initScroll();
            }
          })
          .catch(function(err) {
            $scope.clearSelected();
            $log.error('Error selecting report', err);
          });
      };

      $scope.query = function(options) {
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

        Search($scope, options, function(err, data) {
          if (err) {
            $scope.error = true;
            $scope.loading = false;
            if ($scope.filterQuery.value &&
                err.reason &&
                err.reason.toLowerCase().indexOf('bad query syntax') !== -1) {
              // invalid freetext filter query
              $scope.errorSyntax = true;
            }
            return $log.error('Error loading messages', err);
          }

          $scope.moreItems = liveList.moreItems = data.length >= options.limit;

          FormatDataRecord(data)
            .then(function(data) {
              $scope.loading = false;
              $scope.appending = false;
              $scope.error = false;
              $scope.errorSyntax = false;
              _updateLiveList(data);
              var curr = _.findWhere(data, { _id: $state.params.id });
              if (curr) {
                $scope.setSelected(curr);
              } else if (!$scope.isMobile() &&
                         !$scope.selected &&
                         $state.is('reports.detail')) {
                $timeout(function() {
                  var id = $('.inbox-items li').first().attr('data-record-id');
                  $state.go('reports.detail', { id: id }, { location: 'replace' });
                });
              }
              _initScroll();
            })
            .catch(function(err) {
              $scope.error = true;
              $log.error('Error formatting record', err);
            });
        });
      };

      $scope.$on('query', function() {
        if ($scope.filterModel.type !== 'reports') {
          // not viewing reports tab
          liveList.clearSelected();
          return;
        }
        if ($scope.isMobile() && $scope.showContent) {
          // leave content shown
          return;
        }
        $scope.loading = true;

        if (($scope.filterQuery && $scope.filterQuery.value) ||
            ($scope.filterModel && (
              ($scope.filterModel.contactTypes && $scope.filterModel.contactTypes.length) ||
              $scope.filterModel.facilities.length ||
              $scope.filterModel.forms.length ||
              ($scope.filterModel.date && ($scope.filterModel.date.from || $scope.filterModel.date.to)) ||
              (typeof $scope.filterModel.valid !== 'undefined') ||
              (typeof $scope.filterModel.verified !== 'undefined')))) {

          $scope.filtered = true;

          liveList = LiveList['report-search'];
          liveList.set([]);

          $scope.query();
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
            $scope.query();
          }
        }

      });

      $scope.$on('ClearSelected', function() {
        $scope.selected = null;
        liveList.clearSelected();
      });

      $scope.$on('VerifyReport', function(e, verify) {
        if ($scope.selected.form) {
          Verified($scope.selected._id, verify, function(err) {
            if (err) {
              $log.error('Error verifying message', err);
            }
          });
        }
      });

      $scope.$on('EditReport', function() {
        var val = ($scope.selected.contact && $scope.selected.contact._id) || '';
        $('#edit-report [name=id]').val($scope.selected._id);
        $('#edit-report [name=facility]').select2('val', val);
        $('#edit-report').modal('show');
      });

      var _initScroll = function() {
        scrollLoader.init(function() {
          if (!$scope.loading && $scope.moreItems) {
            $scope.query({ skip: true });
          }
        });
      };

      if (!$stateParams.id) {
        $scope.selectReport();
      }

      $scope.setFilterQuery($stateParams.query);

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
        $scope.setSelectedGroup(group);
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

    }
  ]);

}());
