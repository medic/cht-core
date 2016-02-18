var _ = require('underscore'),
    modal = require('../modules/modal'),
    scrollLoader = require('../modules/scroll-loader');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ReportsCtrl', 
    ['$scope', '$rootScope', '$state', '$stateParams', '$timeout', 'translateFilter', 'LiveList', 'Settings', 'MarkRead', 'Search', 'EditGroup', 'FormatDataRecord', 'DB', 'Verified',
    function ($scope, $rootScope, $state, $stateParams, $timeout, translateFilter, LiveList, Settings, MarkRead, Search, EditGroup, FormatDataRecord, DB, Verified) {

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
            pane.done(translateFilter('Error updating group'), err);
          });
      };

      $scope.update = function(updated) {
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
            console.log(err);
          });
      };

      var setTitle = function(doc) {
        var form = _.findWhere($scope.forms, { code: doc.form });
        $scope.setTitle((form && form.name) || doc.form);
      };

      var updateDisplayFields = function(report) {
        // calculate fields to display
        var keys = Object.keys(report.fields);
        report.display_fields = {};
        _.each(keys, function(k) {
          if(!(report.hidden_fields && _.contains(report.hidden_fields, k))) {
            report.display_fields[k] = report.fields[k];
          }
        });
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

      $scope.selectReport = function(id) {
        if ($scope.selected && $scope.selected._id && $scope.selected._id === id) {
          return;
        }
        $scope.clearSelected();
        if (id && liveList.initialised()) {
          $scope.setLoadingContent(id);
          var report = _.findWhere(liveList.getList(), { _id: id });
          if (report) {
            _setSelected(report);
          } else {
            DB.get()
              .get(id)
              .then(FormatDataRecord)
              .then(function(doc) {
                if (doc) {
                  _setSelected(doc[0]);
                  _initScroll();
                }
              })
              .catch(function(err) {
                $scope.clearSelected();
                console.error(err);
              });
          }
        }
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
            return console.log('Error loading messages', err);
          }

          $scope.moreItems = liveList.moreItems = data.length >= options.limit;

          FormatDataRecord(data)
            .then(function(data) {
              $scope.loading = false;
              $scope.appending = false;
              $scope.error = false;
              $scope.errorSyntax = false;
              $scope.update(data);
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
              console.log('Error formatting record', err);
            });
        });
      };

      $scope.$on('query', function() {
        if ($scope.filterModel.type !== 'reports') {
          liveList.clearSelected();
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
      });

      $scope.$on('VerifyReport', function(e, verify) {
        if ($scope.selected.form) {
          Verified($scope.selected._id, verify, function(err) {
            if (err) {
              console.log('Error verifying message', err);
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
