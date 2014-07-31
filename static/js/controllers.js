(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers', []);

  inboxControllers.controller('InboxCtrl', 
    ['$scope', '$route', '$location', '$translate', '$animate', 'Facility', 'Settings', 'Form', 'Language', 'ReadMessages', 'UserNameService', 'RememberService',
    function ($scope, $route, $location, $translate, $animate, Facility, Settings, Form, Language, ReadMessages, UserNameService, RememberService) {

      $scope.forms = [];
      $scope.facilities = [];
      $scope.selected = undefined;
      $scope.loading = true;
      $scope.error = false;
      $scope.appending = false;
      $scope.messages = [];
      $scope.totalMessages = undefined;
      $scope.initialized = false;
      $scope.userDistrict = undefined;
      $scope.filterQuery = undefined;
      $scope.filterSimple = true;

      $scope.readStatus = {
        forms: { total: 0, read: 0 },
        messages: { total: 0, read: 0 }
      };

      $scope.filterModel = {
        type: 'messages',
        forms: [],
        facilities: [],
        valid: true,
        incoming: true,
        date: {
          from: moment().subtract('months', 1).valueOf(),
          to: moment().valueOf()
        }
      };

      Form.get().then(
        function(res) {
          $scope.forms = res;
        },
        function() {
          console.log('Failed to retrieve facilities');
        }
      );

      Settings.query(function(res) {
        if (res.settings && res.settings.reported_date_format) {
          RememberService.dateFormat = res.settings.reported_date_format;
        }
      });

      Language.get().then(
        function(language) {
          $translate.use(language);
        },
        function() {
          console.log('Failed to retrieve language');
        }
      );

      var updateAvailableFacilities = function() {
        Facility.get({
          userDistrict: $scope.userDistrict
        }).then(
          function(res) {
            $scope.facilities = res;
          },
          function() {
            console.log('Failed to retrieve facilities');
          }
        );
      };

      var updateReadStatus = function () {
        ReadMessages.get({
          user: UserNameService(),
          userDistrict: $scope.userDistrict
        }).then(
          function(res) {
            $scope.readStatus = res;
          },
          function() {
            console.log('Failed to retrieve read status');
          }
        );
      };

      $scope.setMessage = function(id) {
        var path = [ $scope.filterModel.type ];
        if (id) {
          path.push(id);
        }
        $location.path(path.join('/'));
      };

      $scope.selectMessage = function(id) {
        if ($scope.selected && $scope.selected._id === id) {
          return;
        }
        _selectedDoc = id;
        if (id) {
          $scope.selected = undefined;
          $scope.messages.forEach(function(message) {
            if (message._id === id) {
              if (!$scope.isRead(message)) {
                var type = message.form ? 'forms' : 'messages';
                $scope.readStatus[type].read++;
                $('body').trigger('markRead', {
                  read: true,
                  messageId: id,
                  username: UserNameService()
                });
              }
              $scope.selected = message;
            }
          });
          window.setTimeout(function() {
            $('body').addClass('show-content');
          }, 1);
        } else {
          window.setTimeout(function() {
            $('body').removeClass('show-content');
          }, 1);
          if (!$('#back').is(':visible')) {
            $scope.selected = undefined;
          }
        }
      };

      var _deleteMessage = function(id) {
        if ($scope.selected && $scope.selected._id === id) {
          $scope.selected = undefined;
        }
        for (var i = 0; i < $scope.messages.length; i++) {
          if (id === $scope.messages[i]._id) {
            $scope.messages.splice(i, 1);
            return;
          }
        }
      };

      var _findMessage = function(id) {
        for (var i = 0; i < $scope.messages.length; i++) {
          if (id === $scope.messages[i]._id) {
            return $scope.messages[i];
          }
        }
      };

      $scope.update = function(updated) {
        for (var i = 0; i < updated.length; i++) {
          var newMsg = updated[i];
          var oldMsg = _findMessage(newMsg._id);
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
        }
      };

      $scope.isRead = function(message) {
        message.read = message.read || [];
        if ($scope.selected && $scope.selected._id === message._id) {
          return true;
        }
        for (var i = 0; i < message.read.length; i++) {
          if (message.read[i] === UserNameService()) {
            return true;
          }
        }
        return false;
      };

      var _getFilterString = function() {

        var formatDate = function(date) {
          return date.format('YYYY-MM-DD');
        };

        var filters = [];

        if ($scope.filterSimple) {

          // increment end date so it's inclusive
          var to = moment($scope.filterModel.date.to).add('days', 1);
          var from = moment($scope.filterModel.date.from);

          filters.push(
            'reported_date<date>:[' + 
            formatDate(from) + ' TO ' + formatDate(to) + 
            ']'
          );

          if ($scope.filterModel.type === 'messages') {
            if ($scope.filterModel.incoming === true) {
              filters.push('type:messageincoming');
            } else if ($scope.filterModel.incoming === false) {
              filters.push('type:messageoutgoing');
            } else {
              filters.push('type:message*');
            }
          } else {
            filters.push('type:report');
            var selectedForms = $scope.filterModel.forms.length;
            if (selectedForms > 0 && selectedForms < $scope.forms.length) {
              var formCodes = [];
              $scope.filterModel.forms.forEach(function(form) {
                formCodes.push(form.code);
              });
              filters.push('form:(' + formCodes.join(' OR ') + ')');
            }
            if ($scope.filterModel.valid === true) {
              filters.push('errors<int>:0');
            } else if ($scope.filterModel.valid === false) {
              filters.push('NOT errors<int>:0');
            }
          }

          var selectedFacilities = $scope.filterModel.facilities.length;
          if (selectedFacilities > 0 && selectedFacilities < $scope.facilities.length) {
            filters.push('clinic:(' + $scope.filterModel.facilities.join(' OR ') + ')');
          }

        } else {

          if ($scope.filterQuery && $scope.filterQuery.trim()) {
            filters.push($scope.filterQuery);
          }
          var type = $scope.filterModel.type === 'messages' ?
            'message*' : 'report';
          filters.push('type:' + type);

        }

        return filters.join(' AND ');
      };

      var _currentQuery;
      var _selectedDoc;

      $scope.query = function(options) {
        if (!$scope.initialized) {
          return;
        }
        if (options.query === _currentQuery && !options.changes) {
          // debounce as same query already running
          return;
        }
        _currentQuery = options.query;
        $animate.enabled(!!options.changes);
        if (options.changes) {
          updateReadStatus();
          var changedRows = options.changes.results;
          for (var i = changedRows.length - 1; i >= 0; i--) {
            if (changedRows[i].deleted) {
              _deleteMessage(changedRows[i].id);
              changedRows.splice(i, 1);
            }
          }
          if (!changedRows.length) {
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
          $scope.messages = [];
        }
        options.callback = function(err, data) {
          _currentQuery = null;
          angular.element($('body')).scope().$apply(function($scope) {
            $scope.loading = false;
            if (err) {
              $scope.error = true;
              console.log('Error loading messages', err);
            } else {
              $scope.error = false;
              $scope.update(data.rows);
              if (!options.changes) {
                $scope.totalMessages = data.total_rows;
              }
              if (_selectedDoc) {
                $scope.selectMessage(_selectedDoc);
              }
            }
            $scope.appending = false;
          });
        };
        $('body').trigger('updateMessages', options);
      };

      $scope.filter = function(options) {
        options = options || {};
        options.query = _getFilterString();
        $scope.query(options);
      };

      $scope.$watch('filterModel', $scope.filter, true);
      $scope.$watch('filterModel.type', function() { 
        $scope.selected = undefined; 
        if ($scope.filterModel.type === 'analytics') {
          $scope.filterSimple = true;
        }
      });

      $scope.init = function(options) {
        $scope.initialized = true;
        $scope.userDistrict = options.district;
        $scope.filter();
        updateReadStatus();
        updateAvailableFacilities();
      };
    }
  ]);

  inboxControllers.controller('MessagesCtrl', 
    ['$scope', '$route', 
    function ($scope, $route) {
      $scope.filterModel.type = 'messages';
      $scope.selectMessage($route.current.params.doc);
    }
  ]);


  inboxControllers.controller('ReportsCtrl', 
    ['$scope', '$route', 
    function ($scope, $route) {
      $scope.filterModel.type = 'reports';
      $scope.selectMessage($route.current.params.doc);
    }
  ]);


  inboxControllers.controller('AnalyticsCtrl', 
    ['$scope', 
    function ($scope) {
      $scope.filterModel.type = 'analytics';
      $scope.selectMessage();
      $('body').trigger('renderReports');
    }
  ]);

}());