const SETTING_NAME = 'contact_summary';

/**
 * Service for generating summary information based on a given
 * contact and reports about them.
 * Documentation: https://github.com/medic/medic-docs/blob/master/configuration/contact-summary.md
 */
angular.module('inboxServices').service('ContactSummary',
  function(
    $filter,
    $log,
    Settings
  ) {

    'use strict';
    'ngInject';

    let generatorFunction;

    const getGeneratorFunction = function() {
      if (!generatorFunction) {
        generatorFunction = Settings()
          .then(function(settings) {
            return settings[SETTING_NAME];
          })
          .then(function(script) {
            if (!script) {
              return function() {};
            }
            return new Function('contact', 'reports', 'lineage', script); // jshint ignore:line
          });
      }
      return generatorFunction;
    };

    const applyFilter = function(field) {
      if (field && field.filter) {
        try {
          field.value = $filter(field.filter)(field.value);
        } catch(e) {
          throw new Error('Unknown filter: ' + field.filter + '. Check your configuration.', e);
        }
      }
    };

    const applyFilters = function(summary) {
      $log.debug('contact summary eval result', summary);

      summary = summary || {};
      summary.fields = (summary.fields && Array.isArray(summary.fields)) ? summary.fields : [];
      summary.cards = (summary.cards && Array.isArray(summary.cards)) ? summary.cards : [];

      summary.fields.forEach(applyFilter);
      summary.cards.forEach(function(card) {
        if (card && card.fields && Array.isArray(card.fields)) {
          card.fields.forEach(applyFilter);
        }
      });
      return summary;
    };

    return function(contact, reports, lineage) {
      return getGeneratorFunction()
        .then(function(fn) {
          try {
            return fn(contact, reports || [], lineage || []);
          } catch (e) {
            $log.error('Configuration error in contact-summary function: ' + e.message);
            throw new Error('Configuration error');
          }
        })
        .then(applyFilters);
    };
  }
);
