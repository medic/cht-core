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

      // filter = { selected: [...], options: [...]}
      var getRequestForMultidropdown = function(view, filter, mapKeysFunc) {
        if (!filter || !filter.selected || !filter.options) {
          return;
        }

        // If everything is selected, no filter to apply.
        var everythingSelected = filter.selected.length === filter.options.length;
        if (everythingSelected) {
          return;
        }

        return getRequestWithMappedKeys(view, filter.selected, mapKeysFunc);
      };

      var getRequestWithMappedKeys = function(view, keys, mapKeysFunc) {
          if (keys.length === 0) {
            return;
          }
          return {
            view: view,
            params: {
              keys: mapKeysFunc(keys)
            }
          };
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
        if (!filters.types) {
          return;
        }
        if (filters.types.selected && filters.types.options) {
          return getRequestForMultidropdown(view, filters.types, getKeysArray);
        }
        // Used by select2search.
        return getRequestWithMappedKeys(view, filters.types.selected, getKeysArray);
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
          var typeRequest = documentTypeRequest(filters, 'medic-client/contacts_by_type');
          var hasTypeRequest = typeRequest && typeRequest.params.keys.length;

          var freetextRequests = freetextRequest(filters, 'medic-client/contacts_by_freetext');
          var hasFreetextRequests = freetextRequests && freetextRequests.length;

          if (hasTypeRequest && hasFreetextRequests) {

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

            var makeCombinedRequest = function(typeRequests, freetextRequest) {
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

            return freetextRequests.map(_.partial(makeCombinedRequest, typeRequest, _));
          }

          var requests = [];
          requests.push(freetextRequests);
          requests.push(typeRequest);
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

      // Filters object can be :
      //  - For multidropdown :
      // filter = { <field>: { selected: [...], options: [...] } }
      // With <field> = types or facilities or forms
      // E.g. var filters = {
      //  types: {
      //    selected: [ 'person', 'clinic' ],
      //    options: [ 'person', 'clinic', 'district_hospital' ]
      //  }
      // }
      //
      // - For freetext search :
      // var filters = { search: 'patient_id:123 stones   ' }
      //
      // - For reports_by_subject
      // var filters = { subjectIds: [ 'a', 'b', 'c' ] };
      //
      // - For reports_by_date
      // var filters = { date: { from: 1493244000000, to: 1495749599999 } };
      //
      // In case of several requests to combine, the filter object will have
      // the corresponding fields simultaneously.
      // e.g. freetext search + contacts dropdown:
      //  var filters = {
      //   search: 'some thing',
      //   types: {
      //     selected: [ 'clinic', 'district_hospital' ],
      //     options: [ 'person', 'clinic', 'district_hospital' ]
      //   }
      //  };
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
