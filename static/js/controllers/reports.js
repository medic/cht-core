var _ = require('underscore'),
    modal = require('../modules/modal'),
    scrollLoader = require('../modules/scroll-loader');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ReportsCtrl', 
    ['$scope', '$rootScope', '$state', '$stateParams', '$timeout', 'translateFilter', 'LiveList', 'Settings', 'MarkRead', 'Search', 'Changes', 'EditGroup', 'FormatDataRecord', 'DB', 'Verified',
    function ($scope, $rootScope, $state, $stateParams, $timeout, translateFilter, LiveList, Settings, MarkRead, Search, Changes, EditGroup, FormatDataRecord, DB, Verified) {

      $scope.filterModel.type = 'reports';
      $scope.selectedGroup = null;
      $scope.selected = null;

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

      var _merge = function(to, from) {
        if (from._rev !== to._rev) {
          for (var prop in from) {
            if (from.hasOwnProperty(prop)) {
              to[prop] = from[prop];
            }
          }
        }
      };

      $scope.update = function(updated) {
        _.each(updated, function(newReport) {
          if ($scope.selected && $scope.selected._id === newReport._id) {
            _merge($scope.selected, newReport);
          }
          var oldReport = _.findWhere(LiveList.reports.getList(), { _id: newReport._id });
          if (oldReport) {
            _merge(oldReport, newReport);
            if (!$scope.selected && $stateParams.id === oldReport._id) {
              _setSelected(oldReport);
            }
          } else {
            LiveList.reports.insert(newReport);
          }
        });
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
        if (id && LiveList.reports.initialised()) {
          $scope.setLoadingContent(id);
          var report = _.findWhere(LiveList.reports.getList(), { _id: id });
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
          options.skip = LiveList.reports.count();
        } else if (!options.silent) {
          LiveList.reports.set([]);
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
          delete LiveList.reports.scope;
          return;
        }
        $scope.loading = true;
        LiveList.reports.scope = $scope;
        if (LiveList.reports.initialised()) {
          $timeout(function() {
            $scope.loading = false;
            LiveList.reports.refresh();
            $scope.moreItems = LiveList.reports.moreItems;
            _initScroll();
          });
        } else {
          $scope.query();
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
            $timeout(function() {
              $scope.query({ skip: true });
            });
          }
        });
      };

      Changes({
        key: 'reports-list',
        callback: function(change) {
          if (change.deleted) {
            LiveList.reports.remove({ _id: change.id });
            return;
          }

          DB.get().get(change.id)
            .then(function(doc) {
              if (change.newDoc) {
                LiveList.reports.insert(doc);
              } else {
                LiveList.reports.update(doc);
              }
            });
        },
        filter: function(change) {
          if (change.newDoc) {
            return change.newDoc.form;
          }
          return LiveList.reports.contains({ _id: change.id });
        }
      });

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
