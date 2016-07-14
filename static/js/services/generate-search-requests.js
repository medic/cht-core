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

      var getListForMultidropdown = function(list, filter, mapKeys) {
        if (!filter || !filter.selected) {
          return;
        }
        if (filter.selected.length > 0 &&
           (!filter.options || filter.selected.length < filter.options.length)) {

          return {
            list: list,
            params: {
              keys: mapKeys(filter.selected)
            }
          };
        }
      };

      var getListForTernarySelect = function(list, value) {
        if (value === true || value === false) {
          return {
            list: list,
            params: {
              key: [ value ]
            }
          };
        }
      };

      var reportedDate = function(filters, list) {
        var dateRange = filters.date;
        if (!dateRange || (!dateRange.to && !dateRange.from)) {
          return;
        }
        // increment end date so it's inclusive
        var to = moment(dateRange.to).add(1, 'days');
        var from = moment(dateRange.from || 0);
        return {
          list: list,
          params: {
            startkey: [ from.valueOf() ],
            endkey: [ to.valueOf() ]
          }
        };
      };

      var form = function(filters, list) {
        return getListForMultidropdown(list, filters.forms, function(forms) {
          return _.map(forms, function(form) {
            return [ form.code ];
          });
        });
      };

      var validity = function(filters, list) {
        return getListForTernarySelect(list, filters.valid);
      };

      var verification = function(filters, list) {
        return getListForTernarySelect(list, filters.verified);
      };

      var place = function(filters, list) {
        return getListForMultidropdown(list, filters.facilities, getKeysArray);
      };

      var freetext = function(filters, list) {
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
              list: list,
              params: params
            };
          });
        }
      };

      var subject = function(filters, list) {
        var subjectIds = filters.subjectIds;
        if (!subjectIds || !subjectIds.length) {
          return;
        }
        return {
          list: list,
          params: {
            keys: getKeysArray(subjectIds)
          }
        };
      };

      var documentType = function(filters, list) {
        return getListForMultidropdown(list, filters.types, getKeysArray);
      };

      var types = {
        reports: function(filters) {
          var requests = [];
          requests.push(reportedDate(filters, 'medic-client/sort_by_value/reports_by_date'));
          requests.push(form(filters, 'medic-client/sort_by_value/reports_by_form'));
          requests.push(validity(filters, 'medic-client/sort_by_value/reports_by_validity'));
          requests.push(verification(filters, 'medic-client/sort_by_value/reports_by_verification'));
          requests.push(place(filters, 'medic-client/sort_by_value/reports_by_place'));
          requests.push(freetext(filters, 'medic-client/sort_by_value/reports_by_freetext'));
          requests.push(subject(filters, 'medic-client/sort_by_value/reports_by_subject'));
          requests = _.compact(_.flatten(requests));
          if (!requests.length) {
            requests.push({
              list: 'medic-client/sort_by_value/reports_by_date',
              ordered: true,
              params: { desc: true }
            });
          }
          return requests;
        },
        contacts: function(filters) {
          var placeLists = place(filters, 'medic-client/sort_by_value/contacts_by_place');
          var typeLists = documentType(filters, 'medic-client/sort_by_value/contacts_by_type');
          var freetextLists = freetext(filters, 'medic-client/sort_by_value/contacts_by_freetext');
          if (!placeLists &&
              typeLists && typeLists.params.keys.length &&
              freetextLists && freetextLists.length) {
            return freetextLists.map(function(freetextList) {
              var result = {
                list: 'medic-client/sort_by_value/contacts_by_type_freetext',
                union: typeLists.params.keys.length > 1
              };
              if (result.union) {
                result.params = [];
              }
              typeLists.params.keys.forEach(function(typeKey) {
                var type = typeKey[0];
                var params = {};
                if (freetextList.key) {
                  params.key = [ type, freetextList.params.key[0] ];
                } else {
                  params.startkey = [ type, freetextList.params.startkey[0] ];
                  params.endkey = [ type, freetextList.params.endkey[0] ];
                }
                if (result.union) {
                  result.params.push(params);
                } else {
                  result.params = params;
                }
              });
              return result;
            });
          }
          var requests = [];
          requests.push(placeLists);
          requests.push(freetextLists);
          requests.push(typeLists);
          requests = _.compact(_.flatten(requests));
          if (!requests.length) {
            requests.push({
              list: 'medic-client/sort_by_value/contacts_by_name',
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
