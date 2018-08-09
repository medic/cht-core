var filter = require('async/filter');
var TABS = [
  { state: 'messages.detail', perm: 'can_view_messages_tab'  },
  { state: 'tasks.detail',    perm: 'can_view_tasks_tab'     },
  { state: 'reports.detail',  perm: 'can_view_reports_tab'   },
  { state: 'analytics',       perm: 'can_view_analytics_tab' },
  { state: 'contacts.detail', perm: 'can_view_contacts_tab'  }
];

angular.module('inboxControllers').controller('HomeCtrl',
  function (
    $log,
    $state,
    Auth
  ) {

    'use strict';
    'ngInject';

    var findFirstAuthorizedTab = function(callback) {
      filter(TABS, function(tab, callback) {
        Auth(tab.perm)
          .then(function() {
            callback(null, true);
          })
          .catch(function() {
            callback(null, false);
          });
      }, function(err, results) {
        if (err) {
          return callback(err);
        }
        if (!results.length) {
          return callback(new Error('No tabs available'));
        }
        callback(null, results[0].state);
      });
    };

    findFirstAuthorizedTab(function(err, state) {
      if (err) {
        $log.error(err);
        state = 'error';
      }
      $state.go(state, { }, { location: 'replace' });
    });

  }
);
