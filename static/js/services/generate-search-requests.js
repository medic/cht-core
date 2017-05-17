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

      var getRequestForMultidropdown = function(view, filter, mapKeys) {
        if (!filter || !filter.selected) {
          return;
        }
        // tmp what's options? What's selected?
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

      var getRequestForBooleanKey = function(view, key) {
        if (!_.isBoolean(key)) {
          return;
        }
        return {
          view: view,
          params: {
            key: [ key ]
          }
        };
      };

      var reportedDateRequest = function(filters, view) {
        var dateRange = filters.date;
        if (!dateRange || (!dateRange.to && !dateRange.from)) {
          return;
        }
        var to = moment(dateRange.to);
        var from = moment(dateRange.from || 0);
        return {
          view: view,
          params: {
            startkey: [ from.valueOf() ],
            endkey: [ to.valueOf() ]
          }
        };
      };

      var formRequest = function(filters, view) {
        return getRequestForMultidropdown(view, filters.forms, function(forms) {
          return _.map(forms, function(form) {
            return [ form.code ];
          });
        });
      };

      var validityRequest = function(filters, view) {
        return getRequestForBooleanKey(view, filters.valid);
      };

      var verificationRequest = function(filters, view) {
        return getRequestForBooleanKey(view, filters.verified);
      };

      var placeRequest = function(filters, view) {
        return getRequestForMultidropdown(view, filters.facilities, getKeysArray);
      };

      var freetextRequest = function(filters, view) {
        if (filters.search) {
          var words = filters.search.trim().toLowerCase().split(/\s+/);
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

      var subjectRequest = function(filters, view) {
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

      var documentTypeRequest = function(filters, view) {
        return getRequestForMultidropdown(view, filters.types, getKeysArray);
      };

      var requestBuilders = {
        reports: function(filters) {
          var requests = [];
          requests.push(reportedDateRequest(filters, 'medic-client/reports_by_date'));
          requests.push(formRequest(filters, 'medic-client/reports_by_form'));
          requests.push(validityRequest(filters, 'medic-client/reports_by_validity'));
          requests.push(verificationRequest(filters, 'medic-client/reports_by_verification'));
          requests.push(placeRequest(filters, 'medic-client/reports_by_place'));
          requests.push(freetextRequest(filters, 'medic-client/reports_by_freetext'));
          requests.push(subjectRequest(filters, 'medic-client/reports_by_subject'));
          requests = _.compact(_.flatten(requests));
          if (!requests.length) {
            requests.push({
              view: 'medic-client/reports_by_date',
              ordered: true,
              params: { descending: true }
            });
          }
          return requests;
        },
        contacts: function(filters) {
          var typeRequests = documentTypeRequest(filters, 'medic-client/contacts_by_type');
          var freetextRequests = freetextRequest(filters, 'medic-client/contacts_by_freetext');

          // If both type and freetext requests, and type request has keys param
          // then we use a combined contacts+type view.
          // tmp what's keys for typeRequests? Does documentTypeRequest return null when no keys?
          if (typeRequests && typeRequests.params.keys.length &&
              freetextRequests && freetextRequests.length) {

            var makeCombinedParams = function(freetextRequest, typeKey) {
              var type = typeKey[0];
              var params = {};
              if (freetextRequest.key) {
                params.key = [ type, freetextRequest.params.key[0] ];
              } else {
                params.startkey = [ type, freetextRequest.params.startkey[0] ];
                params.endkey = [ type, freetextRequest.params.endkey[0] ];
              }
              return params;
            };

            var makeCombinedRequest = function(freetextRequest, typeRequests) {
              var result = {
                view: 'medic-client/contacts_by_type_freetext',
                union: typeRequests.params.keys.length > 1
              };

              if (result.union) {
                result.paramSets =
                    typeRequests.params.keys.map(_.partial(makeCombinedParams, freetextRequest, _));
                return result;
              }

              result.params = makeCombinedParams(freetextRequest, typeRequests.params.keys[0]);
              return result;
            };

            return freetextRequests.map(_.partial(makeCombinedRequest, _, typeRequests));
          }

          var requests = [];
          requests.push(freetextRequests);
          requests.push(typeRequests);
          requests = _.compact(_.flatten(requests));

          if (!requests.length) {
            requests.push({
              view: 'medic-client/contacts_by_type_index_name',
              ordered: true
            });
          }
          return requests;
        }
      };

      return function(type, filters) {
        var builder = requestBuilders[type];
        if (!builder) {
          throw new Error('Unknown type: ' + type);
        }
        return builder(filters);
      };
    }
  ]);
}());
