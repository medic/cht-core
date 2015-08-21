var _ = require('underscore'),
    modal = require('../modules/modal'),
    scrollLoader = require('../modules/scroll-loader');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ReportsCtrl', 
    ['$scope', '$rootScope', '$state', '$stateParams', '$timeout', 'translateFilter', 'Settings', 'MarkRead', 'Search', 'Changes', 'EditGroup', 'FormatDataRecord', 'DB',
    function ($scope, $rootScope, $state, $stateParams, $timeout, translateFilter, Settings, MarkRead, Search, Changes, EditGroup, FormatDataRecord, DB) {

      $scope.filterModel.type = 'reports';
      $scope.selectedGroup = undefined;
      $scope.setReports();

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
        _.each(updated, function(newMsg) {
          if ($scope.selected && $scope.selected._id === newMsg._id) {
            _merge($scope.selected, newMsg);
          }
          var oldMsg = _.findWhere($scope.items, { _id: newMsg._id });
          if (oldMsg) {
            _merge(oldMsg, newMsg);
            if (!$scope.selected && $stateParams.id === oldMsg._id) {
              _setSelected(oldMsg);
            }
          } else {
            $scope.items.push(newMsg);
          }
        });
      };

      var _setSelected = function(message) {
        $scope.setSelected(message);
        if (!$scope.isRead(message)) {
          $scope.readStatus.forms--;
        }
        MarkRead(message._id, true).catch(function(err) {
          console.log(err);
        });
      };

      $scope.selectMessage = function(id) {
        if ($scope.selected && $scope.selected._id && $scope.selected._id === id) {
          return;
        }
        $scope.setSelected();
        if (id && $scope.items) {
          $scope.setLoadingContent(id);
          var message = _.findWhere($scope.items, { _id: id });
          if (message) {
            _setSelected(message);
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
                return console.log(err);
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
          if ($('#back').is(':visible')) {
            $scope.selectMessage();
          }
        }
        if (options.skip) {
          $scope.appending = true;
          options.skip = $scope.items.length;
        } else if (!options.silent) {
          $scope.setReports([]);
        }

        Search($scope, options, function(err, data) {
          if (err) {
            $scope.error = true;
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
              var curr = _.find(data, function(result) {
                return result._id === $state.params.id;
              });
              if (curr) {
                $scope.setSelected(curr);
              } else if (!$('#back').is(':visible') && !options.changes) {
                $timeout(function() {
                  var id = $('.inbox-items li').first().attr('data-record-id');
                  $state.go('reports.detail', { id: id });
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
        $scope.query();
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

      Changes('reports-list', function(change) {
        if ($scope.filterModel.type === 'reports' &&
            _.findWhere($scope.items, { _id: change.id })) {
          $scope.query({ silent: true, changes: true });
        }
      });

      if (!$stateParams.id) {
        $scope.selectMessage();
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
          Settings(function(err, res) {
            if (!err) {
              $('#edit-message-group .datepicker').daterangepicker({
                singleDatePicker: true,
                timePicker: true,
                applyClass: 'btn-primary',
                cancelClass: 'btn-link',
                parentEl: '#edit-message-group .modal-dialog .modal-content',
                format: res.reported_date_format,
                minDate: getNextHalfHour()
              },
              function(date) {
                var i = this.element.closest('fieldset').attr('data-index');
                $scope.selectedGroup.rows[i].due = date.toISOString();
              });
            }
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