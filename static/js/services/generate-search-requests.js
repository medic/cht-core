var _ = require('underscore'),
    moment = require('moment'),
    END_OF_ALPHABET = '\ufff0';

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('GenerateSearchRequests', [
    function() {

      var getKeysArray = function(keys) {
        return _.map(keys, function(t) {
          return [ t ];
        });
      };

      var getViewForMultidropdown = function(view, filter, mapKeys) {
        if (!filter || !filter.selected) {
          return;
        }
        if (filter.selected.length > 0 &&
           (!filter.options || filter.selected.length < filter.options.length)) {

          return {
            view: view,
            params: {
              keys: mapKeys(filter.selected)
            }
          };
        }
      };

      var getViewForTernarySelect = function(view, value) {
        if (value === true || value === false) {
          return {
            view: view,
            params: {
              key: [ value ]
            }
          };
        }
      };

      var reportedDate = function(filters, view) {
        var dateRange = filters.date;
        if (!dateRange || (!dateRange.to && !dateRange.from)) {
          return;
        }
        // increment end date so it's inclusive
        var to = moment(dateRange.to).add(1, 'days');
        var from = moment(dateRange.from || 0);
        return {
          view: view,
          params: {
            startkey: [ from.valueOf() ],
            endkey: [ to.valueOf() ]
          }
        };
      };

      var form = function(filters, view) {
        return getViewForMultidropdown(view, filters.forms, function(forms) {
          return _.map(forms, function(form) {
            return [ form.code ];
          });
        });
      };

      var validity = function(filters, view) {
        return getViewForTernarySelect(view, filters.valid);
      };

      var verification = function(filters, view) {
        return getViewForTernarySelect(view, filters.verified);
      };

      var place = function(filters, view) {
        return getViewForMultidropdown(view, filters.facilities, getKeysArray);
      };

      var freetext = function(filters, view) {
        if (filters.search) {
          var words = filters.search.toLowerCase().split(/\s+/);
          return words.map(function(word) {
            var params = {};
            if (word.indexOf(':') !== -1) {
              // use exact match
              params.key = [ word ];
            } else {
              // use starts with
              params.startkey = [ word ];
              params.endkey = [ word + END_OF_ALPHABET ];
            }
            return {
              view: view,
              params: params
            };
          });
        }
      };

      var subject = function(filters, view) {
        var subjectIds = filters.subjectIds;
        if (!subjectIds || !subjectIds.length) {
          return;
        }
        return {
          view: view,
          params: {
            keys: getKeysArray(subjectIds)
          }
        };
      };

      var documentType = function(filters, view) {
        return getViewForMultidropdown(view, filters.types, getKeysArray);
      };

      var types = {
        reports: function(filters) {
          var requests = [];
          requests.push(reportedDate(filters, 'reports_by_date'));
          requests.push(form(filters, 'reports_by_form'));
          requests.push(validity(filters, 'reports_by_validity'));
          requests.push(verification(filters, 'reports_by_verification'));
          requests.push(place(filters, 'reports_by_place'));
          requests.push(freetext(filters, 'reports_by_freetext'));
          requests.push(subject(filters, 'reports_by_subject'));
          requests = _.compact(_.flatten(requests));
          if (!requests.length) {
            requests.push({
              view: 'reports_by_date',
              ordered: true,
              params: { descending: true }
            });
          }
          return requests;
        },
        contacts: function(filters) {
          var placeViews = place(filters, 'contacts_by_place');
          var typeViews = documentType(filters, 'contacts_by_type');
          var freetextViews = freetext(filters, 'contacts_by_freetext');
          if (!placeViews &&
              typeViews && typeViews.params.keys.length === 1 &&
              freetextViews && freetextViews.length) {
            var type = typeViews.params.keys[0][0];
            return freetextViews.map(function(freetextView) {
              var result = { view: 'contacts_by_type_freetext' };
              if (freetextView.key) {
                result.params = {
                  key: [ type, freetextView.params.key[0] ]
                };
              } else {
                result.params = {
                  startkey: [ type, freetextView.params.startkey[0] ],
                  endkey: [ type, freetextView.params.endkey[0] ]
                };
              }
              return result;
            });
          }
          var requests = [];
          requests.push(placeViews);
          requests.push(freetextViews);
          requests.push(typeViews);
          requests = _.compact(_.flatten(requests));
          if (!requests.length) {
            requests.push({
              view: 'contacts_by_name',
              ordered: true
            });
          }
          return requests;
        }
      };

      return function(type, filters) {
        var builder = types[type];
        if (!builder) {
          throw new Error('Unknown type: ' + type);
        }
        return builder(filters);
      };
    }
  ]);
}());
