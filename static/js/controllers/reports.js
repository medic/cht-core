var _ = require('underscore'),
    modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ReportsCtrl', 
    ['$scope', '$route', '$location', '$animate', 'db', 'UserDistrict', 'UserCtxService', 'MarkRead', 'GenerateSearchQuery', 'Search', 'Verified', 'DeleteMessage', 'UpdateFacility',
    function ($scope, $route, $location, $animate, db, UserDistrict, UserCtxService, MarkRead, GenerateSearchQuery, Search, Verified, DeleteMessage, UpdateFacility) {

      $scope.filterModel.type = 'reports';

      UserDistrict().then(function() {
        $scope.$watch('filterModel', function(prev, curr) {
          if (prev !== curr) {
            $scope.query();
          }
        }, true);
      });

      $scope.update = function(updated) {
        _.each(updated, function(newMsg) {
          var oldMsg = _.findWhere($scope.messages, { _id: newMsg._id });
          if (oldMsg) {
            if (newMsg._rev !== oldMsg._rev) {
              for (var prop in newMsg) {
                if (newMsg.hasOwnProperty(prop)) {
                  oldMsg[prop] = newMsg[prop];
                }
              }
            }
          } else {
            $scope.messages.push(newMsg);
          }
        });
      };

      $scope.selectMessage = function(id) {
        if (!id) {
          $scope.setSelected();
          return;
        }
        if ($scope.selected && $scope.selected._id === id) {
          return;
        }
        _selectedDoc = id;
        $scope.setSelected();
        $scope.messages.forEach(function(message) {
          if (message._id === id) {
            $scope.readStatus.forms.read++;
            MarkRead(id, true, function(err) {
              if (err) {
                console.log(err);
              }
            });
            $scope.setSelected(message);
          }
        });
      };


      var _deleteMessage = function(message) {
        if ($scope.selected && $scope.selected._id === message.id) {
          $scope.setSelected();
        }
        for (var i = 0; i < $scope.messages.length; i++) {
          if (message.id === $scope.messages[i]._id) {
            $scope.messages.splice(i, 1);
            return;
          }
        }
      };
      
      var _currentQuery;
      var _selectedDoc;

      $scope.query = function(options) {
        options = options || {};
        if ($scope.filterModel.type === 'analytics') {
          // no search available for analytics
          return;
        }
        options.query = GenerateSearchQuery($scope, options);
        if (options.query === _currentQuery && !options.changes) {
          // debounce as same query already running
          return;
        }
        _currentQuery = options.query;
        $animate.enabled(!!options.changes);
        if (options.changes) {
          $scope.updateReadStatus();
          var deletedRows = _.where(options.changes, {deleted: true});
          _.each(deletedRows, _deleteMessage);
          if (deletedRows.length === options.changes.length) {
            // nothing to update
            return;
          }
        }
        if (!options.silent) {
          $scope.error = false;
          $scope.loading = true;
        }
        if (options.skip) {
          $scope.appending = true;
          options.skip = $scope.messages.length;
        } else if (!options.silent) {
          $scope.setMessages([]);
        }

        Search(options, function(err, data) {
          _currentQuery = null;
          $scope.loading = false;
          $scope.appending = false;
          if ($scope.filterModel.type === 'analytics') {
            // no search available for analytics
            return;
          }
          if (err) {
            $scope.error = true;
            console.log('Error loading messages', err);
          } else {
            $scope.error = false;
            $scope.update(data.results);
            if (!options.changes) {
              $scope.totalMessages = data.total_rows;
            }
            if (_selectedDoc) {
              $scope.selectMessage(_selectedDoc);
            }
            $('.inbox-items')
              .off('scroll', _checkScroll)
              .on('scroll', _checkScroll);
          }
        });
      };

      var _checkScroll = function() {
        if (this.scrollHeight - this.scrollTop - 10 < this.clientHeight) {
          angularApply(function(scope) {
            scope.query();
          });
        }
      };

      $scope.verify = function(verify) {
        if ($scope.selected.form) {
          Verified($scope.selected._id, verify, function(err) {
            if (err) {
              console.log('Error verifying message', err);
            }
          });
        }
      };

      $scope.deleteMessage = function() {
        var pane = modal.start($('#delete-confirm'));
        DeleteMessage($scope.selected._id, function(err) {
          pane.done('Error deleting document', err);
        });
      };

      $scope.updateFacility = function() {
        var $modal = $('#update-facility');
        var facilityId = $modal.find('[name=facility]').val();
        if (!facilityId) {
          $modal.find('.modal-footer .note').text('Please select a facility');
          return;
        }
        var pane = modal.start($modal);
        UpdateFacility($scope.selected._id, facilityId, function(err) {
          pane.done('Error updating facility', err);
        });
      };
      $scope.updateFacilityShow = function () {
        var val = '';
        if ($scope.selected && 
            $scope.selected.related_entities && 
            $scope.selected.related_entities.clinic) {
          val = $scope.selected.related_entities.clinic._id;
        }
        $('#update-facility [name=facility]').select2('val', val);
        $('#update-facility').modal('show');
      };

      db.changes({ filter: 'medic/data_records' }, function(err, data) {
        if (!err && data && data.results) {
          $scope.query({ silent: true, changes: data.results });
        }
      });

      // TODO we should eliminate the need for this function as much as possible
      var angularApply = function(callback) {
        var scope = angular.element($('body')).scope();
        if (scope) {
          scope.$apply(callback);
        }
      };

      $('#formTypeDropdown').on('update', function() {
        var forms = $(this).multiDropdown().val();
        angularApply(function(scope) {
          scope.filterModel.forms = forms;
        });
      });

      $('#facilityDropdown').on('update', function() {
        var ids = $(this).multiDropdown().val();
        angularApply(function(scope) {
          scope.filterModel.facilities = ids;
        });
      });

      $('#messageTypeDropdown').on('update', function() {
        var types = $(this).multiDropdown().val();
        angularApply(function(scope) {
          scope.filterModel.messageTypes = types;
        });
      });

      $('#date-filter').daterangepicker({
        startDate: moment($scope.filterModel.date.from),
        endDate: moment($scope.filterModel.date.to),
        maxDate: moment(),
        applyClass: 'btn-primary',
        cancelClass: 'btn-link'
      },
      function(start, end) {
        angularApply(function(scope) {
          scope.filterModel.date.from = start.valueOf();
          scope.filterModel.date.to = end.valueOf();
        });
      })
      .on('dateSelected.daterangepicker', function(e, picker) {
        if ($('#back').is(':visible')) {
          // mobile version - only show one calendar at a time
          if (picker.container.is('.show-from')) {
            picker.container.removeClass('show-from').addClass('show-to');
          } else {
            picker.container.removeClass('show-to').addClass('show-from');
            picker.hide();
          }
        }
      })
      .on('show.daterangepicker', function(e, picker) {
        if (picker.element.is('.disabled')) {
          picker.hide();
        }
      });
      $('.daterangepicker').addClass('mm-dropdown-menu show-from');

      $('#search').on('click', function(e) {
        e.preventDefault();
        $scope.query();
      });
      $('#freetext').on('keypress', function(e) {
        if (e.which === 13) {
          e.preventDefault();
          $scope.query();
        }
      });

      if (!$scope.messages || !$route.current.params.doc) {
        $scope.query();
      }

      $scope.selectMessage($route.current.params.doc);
    }
  ]);


}());