var async = require('async');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  var tabs = [
    { state: 'messages.detail', perm: 'can_view_messages_tab'  },
    { state: 'tasks.detail',    perm: 'can_view_tasks_tab'     },
    { state: 'reports.detail',  perm: 'can_view_reports_tab'   },
    { state: 'analytics',       perm: 'can_view_analytics_tab' },
    { state: 'contacts.detail', perm: 'can_view_contacts_tab'  },
    { state: 'configuration',   perm: 'can_configure'          }
  ];

  inboxControllers.controller('HomeCtrl', 
    ['$state', 'Auth',
    function ($state, Auth) {

      var findFirstAuthorizedTab = function(callback) {
        async.filter(tabs, function(tab, callback) {
          Auth(tab.perm)
            .then(function() {
              callback(true);
            })
            .catch(function() {
              callback(false);
            });
        }, function(results) {
          if (!results.length) {
            return callback('error');
          }
          callback(results[0].state);
        });
      };

      findFirstAuthorizedTab(function(state) {
        $state.go(state, { }, { location: 'replace' });
      });

    }
  ]);

}());