var _ = require('underscore'),
    moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('GenerateSearchQuery',
    function(
      CONTACT_TYPES
    ) {
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

      var formatContactsType = function(filters) {
        var selected = getSelected(filters.types);
        return {
          type: selected || CONTACT_TYPES
        };
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
        if (freetext && freetext.indexOf(':') === -1) {
          freetext += '*';
        }
        return freetext;
      };

      var TYPES = {
        reports: {
          buildQuery: function(filters, operands) {
            operands.push(formatFreetext(filters));
            operands.push(formatReportedDate(filters));
            operands.push(formatReportType());
            operands.push(formatClinics(filters));
            operands.push(formatForm(filters));
            operands.push(formatErrors(filters));
            operands.push(formatVerified(filters));
          },
          schema: {
            errors: 'int',
            verified: 'boolean',
            reported_date: 'date'
          }
        },
        contacts: {
          buildQuery: function(filters, operands) {
            operands.push(formatFreetext(filters));
            operands.push(formatContactsType(filters));
            operands.push(formatClinics(filters));
          }
        }
      };

      return function(typeName, filters) {
        var type = TYPES[typeName];
        if (!type) {
          throw new Error('Unknown type');
        }
        var operands = [];
        type.buildQuery(filters, operands);
        return {
          schema: type.schema,
          query: { $operands: _.compact(operands) }
        };
      };
    }
  );
}());