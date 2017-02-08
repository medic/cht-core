var SETTING_NAME = 'contact_summary';

angular.module('inboxServices').service('ContactSummary',
  function(
    $filter,
    $log,
    $parse,
    $sanitize,
    Settings
  ) {

    'use strict';
    'ngInject';

    var getScript = function() {
      return Settings().then(function(settings) {
        return settings[SETTING_NAME];
      });
    };

    var applyFilter = function(value) {
      if (value.filter) {
        try {
          value.value = $filter(value.filter)(value.value);
        } catch(e) {
          throw new Error('Unknown filter: ' + value.filter + '. Check your configuration.', e);
        }
      }
    };

    var applyFilters = function(summary) {
      $log.debug('contact summary eval result', summary);
      
      summary = summary || {};
      summary.values = summary.values || [];
      summary.cards = summary.cards || [];

      summary.values.forEach(applyFilter);
      summary.cards.forEach(function(card) {
        card.values.forEach(applyFilter);
      });
      return summary;
    };

    return function(contact, reports) { // jshint ignore:line
      return getScript()
        .then(function(script) {
          return script && eval(script); // jshint ignore:line
        })
        .then(applyFilters);
    };
  }
);
