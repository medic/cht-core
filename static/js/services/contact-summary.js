var SETTING_NAME = 'contact_summary';

/**
 * Service for generating summary information based on a given
 * contact and reports about them.
 * Documentation: https://github.com/medic/medic-docs/blob/master/md/config/contact-summary.md
 */
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

    var applyFilter = function(field) {
      if (field.filter) {
        try {
          field.value = $filter(field.filter)(field.value);
        } catch(e) {
          throw new Error('Unknown filter: ' + field.filter + '. Check your configuration.', e);
        }
      }
    };

    var applyFilters = function(summary) {
      $log.debug('contact summary eval result', summary);
      
      summary = summary || {};
      summary.fields = summary.fields || [];
      summary.cards = summary.cards || [];

      summary.fields.forEach(applyFilter);
      summary.cards.forEach(function(card) {
        card.fields.forEach(applyFilter);
      });
      return summary;
    };

    return function(contact, reports, lineage) { // jshint ignore:line
      return getScript()
        .then(function(script) {
          return script && eval(script); // jshint ignore:line
        })
        .then(applyFilters);
    };
  }
);
