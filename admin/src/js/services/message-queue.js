var _ = require('underscore');

angular.module('services').factory('ImportContacts',
  function(
    $q,
    DB,
    Settings
  ) {

    'use strict';
    'ngInject';

    var settings;

    var getSettings = function() {
      if (settings) {
        return Promise.resolve();
      }

      return Settings().then(function(result) {
        settings = result;
      });
    };

    return function(tab, start, limit, docId) {
      tab = tab || 'due';

      if (tab === '')
      const options = {
        limit: limit || 50,
        start_key: [tab, start || {}],
        start_key_doc_id: docId,
      };

      if (tab === '')

      return $q
        .all([
          getSettings(),
          DB({ remote: true }).query('medic-sms/tasks-messages', options)
        ])
        .then(function(results) {
          var recipients = [];
          results[1].rows.forEach(function(row) {

          });
        });
    };
  }
);
