var _ = require('underscore'),
    modal = require('../modules/modal'),
    moment = require('moment');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ReportsCtrl', 
    ['$scope', '$route', '$location', '$animate', 'UserDistrict', 'UserCtxService', 'MarkRead', 'GenerateSearchQuery', 'Search', 'Changes', 'RememberService', 'MessageState', 'Settings', 'EditGroup',
    function ($scope, $route, $location, $animate, UserDistrict, UserCtxService, MarkRead, GenerateSearchQuery, Search, Changes, RememberService, MessageState, Settings, EditGroup) {

      $scope.filterModel.type = 'reports';

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
        if ($scope.selected && $scope.selected._id && $scope.selected._id === id) {
          return;
        }
        _selectedDoc = id;
        $scope.setSelected();
        if (id && $scope.messages) {
          $scope.messages.forEach(function(message) {
            if (message._id === id) {
              if (!$scope.isRead(message)) {
                $scope.readStatus.forms.read++;
              }
              MarkRead(id, true, function(err) {
                if (err) {
                  console.log(err);
                }
              });
              $scope.setSelected(message);
            }
          });
        }
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
        $animate.enabled(!!options.changes);
        if (options.changes) {
          $scope.updateReadStatus();
          var deletedRows = _.where(options.changes, { deleted: true });
          _.each(deletedRows, _deleteMessage);
          if (deletedRows.length === options.changes.length) {
            // nothing to update
            return;
          }
          options.changes = _.filter(options.changes, function(change) {
            return !change.deleted;
          });
        }
        GenerateSearchQuery($scope, options, function(err, query) {
          if (err) {
            return console.log(err);
          }
          options.query = query;
          if (options.query === _currentQuery && !options.changes) {
            // debounce as same query already running
            return;
          }
          _currentQuery = options.query;
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
            if (err) {
              $scope.error = true;
              console.log('Error loading messages', err);
              return;
            }
            $scope.error = false;
            $scope.update(data.results);
            if (!options.changes) {
              $scope.totalMessages = data.total_rows;
            }
            if (_selectedDoc) {
              $scope.selectMessage(_selectedDoc);
            } else if (!$('#back').is(':visible')) {
              window.setTimeout(function() {
                $scope.$apply(function(scope) {
                  var id = $('.inbox-items li').first().attr('data-record-id');
                  scope.selectMessage(id);
                });
              }, 1);
            }
            $('.inbox-items')
              .off('scroll', _checkScroll)
              .on('scroll', _checkScroll);
          });
        });
      };

      $scope.canMute = function(group) {
        return MessageState.any(group, 'scheduled');
      };

      $scope.canSchedule = function(group) {
       return MessageState.any(group, 'muted');
      };

      var setMessageState = function(group, from, to) {
        group.loading = true;
        var id = $scope.selected._id;
        var groupNumber = group.rows[0].group;
        MessageState.set(id, groupNumber, from, to, function(err) {
          if (err) {
            console.log(err);
          }
        });
      };

      $scope.mute = function(group) {
        setMessageState(group, 'scheduled', 'muted');
      };

      $scope.schedule = function(group) {
        setMessageState(group, 'muted', 'scheduled');
      };

      var initEditMessageModal = function() {
        window.setTimeout(function() {
          Settings(function(err, res) {
            if (!err) {
              $('#edit-message-group .datepicker').daterangepicker({
                singleDatePicker: true,
                timePicker: true,
                applyClass: 'btn-primary',
                cancelClass: 'btn-link',
                parentEl: '#edit-message-group .modal-dialog .modal-content',
                format: res.reported_date_format,
                minDate: moment()
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
        $scope.selectedGroup = angular.copy(group);
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

      $scope.updateGroup = function(group) {
        var pane = modal.start($('#edit-message-group'));
        EditGroup($scope.selected._id, group, function(err) {
          pane.done('Error updating group', err);
        });
      };

      $scope.$on('filters-reset', function() {
        $('#formTypeDropdown').multiDropdown().reset();
        $('#facilityDropdown').multiDropdown().reset();
        $scope.query();
      });

      var _checkScroll = function() {
        if (this.scrollHeight - this.scrollTop - 10 < this.clientHeight) {
          $scope.$apply(function(scope) {
            scope.query({ skip: true });
          });
        }
      };

      Changes(function(data) {
        $scope.query({ silent: true, changes: data });
      });

      // TODO we should eliminate the need for this function as much as possible
      var angularApply = function(callback) {
        var scope = angular.element($('body')).scope();
        if (scope) {
          scope.$apply(callback);
        }
      };

      var start = $scope.filterModel.date.from ?
        moment($scope.filterModel.date.from) : moment().subtract(1, 'months');
      $('#date-filter').daterangepicker({
        startDate: start,
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
      .on('mm.dateSelected.daterangepicker', function(e, picker) {
        if ($('#back').is(':visible')) {
          // mobile version - only show one calendar at a time
          if (picker.container.is('.show-from')) {
            picker.container.removeClass('show-from').addClass('show-to');
          } else {
            picker.container.removeClass('show-to').addClass('show-from');
            picker.hide();
          }
        }
      });
      $('.daterangepicker').addClass('filter-daterangepicker mm-dropdown-menu show-from');

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
      $('#mobile-search-go').on('click', function(e) {
        e.preventDefault();
        $scope.query();
        $(e.target).closest('.filter').removeClass('mm-open');
      });
      $('#mobile-freetext').on('keypress', function(e) {
        if (e.which === 13) {
          e.preventDefault();
          $scope.query();
          $(e.target).closest('.filter').removeClass('mm-open');
        }
      });
      $('#mobile-search').on('click', function(e) {
        e.preventDefault();
        $(e.target).closest('.filter').toggleClass('mm-open');
      });

      $scope.setFilterQuery($route.current.params.query);

      if (!$route.current.params.doc) {
        RememberService.scrollTop = {};
      }
      $('.tooltip').remove();

      $scope.selectMessage($route.current.params.doc);

      UserDistrict(function() {
        $scope.$watch('filterModel', function(prev, curr) {
          if (prev !== curr) {
            $scope.query();
          }
        }, true);
        if (!$scope.messages || !$route.current.params.doc) {
          $scope.query();
        }
      });
    }
  ]);

}());