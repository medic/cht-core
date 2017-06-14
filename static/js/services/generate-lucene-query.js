var _ = require('underscore'),
    moment = require('moment');

angular.module('inboxServices').factory('GenerateLuceneQuery',
  function(
    ContactSchema
  ) {

    'use strict';
    'ngInject';

    var formatDate = function(date) {
      return date.utcOffset(0).format('YYYY-MM-DD');
    };

    var formatReportedDate = function(filters) {
      if (filters.date && (filters.date.to || filters.date.from)) {
        // increment end date so it's inclusive
        var to = moment(filters.date.to).add(1, 'days');
        var from = moment(filters.date.from || 0);
        return {
          reported_date: { $from: formatDate(from), $to: formatDate(to) }
        };
      }
    };

    var formatReportType = function() {
      return {
        type: 'report'
      };
    };

    var formatContactType = function() {
      return {
        type: ContactSchema.getTypes()
      };
    };

    var getSelected = function(filter) {
      var selected = filter && filter.selected;
      var options = filter && filter.options;
      if (selected &&
          options &&
          selected.length > 0 &&
          selected.length < options.length) {
        return selected;
      }
    };

    var formatForm = function(filters) {
      var selected = getSelected(filters.forms);
      if (selected) {
        return {
          form: _.pluck(selected, 'code')
        };
      }
    };

    var formatErrors = function(filters) {
      if (filters.valid === true) {
        return { errors: 0 };
      }
      if (filters.valid === false) {
        return {
          $operator: 'not',
          $operands: { errors: 0 }
        };
      }
    };

    var formatVerified = function(filters) {
      if (filters.verified === true) {
        return { verified: true };
      }
      if (filters.verified === false) {
        return { verified: false };
      }
    };

    var formatClinics = function(filters) {
      var selected = getSelected(filters.facilities);
      if (selected) {
        return { clinic: selected };
      }
    };

    var formatFreetext = function(filters) {
      var freetext = filters.search;
      // if not searching a specific field, change the search to startswith
      if (freetext && freetext.indexOf(':') === -1) {
        freetext += '*';
      }
      return freetext;
    };

    var TYPES = {
      reports: {
        buildQuery: function(filters) {
          return _.compact([
            formatFreetext(filters),
            formatReportedDate(filters),
            formatReportType(),
            formatClinics(filters),
            formatForm(filters),
            formatErrors(filters),
            formatVerified(filters)
          ]);
        },
        schema: {
          errors: 'int',
          verified: 'boolean',
          reported_date: 'date'
        }
      },
      contacts: {
        buildQuery: function(filters) {
          return _.compact([
            formatFreetext(filters),
            formatContactType()
          ]);
        }
      }
    };

    return function(typeName, filters) {
      var type = TYPES[typeName];
      if (!type) {
        throw new Error('Unknown type');
      }
      return {
        schema: type.schema,
        query: { $operands: type.buildQuery(filters) }
      };
    };
  }
);
