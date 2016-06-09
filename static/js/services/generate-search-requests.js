var _ = require('underscore'),
    moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var END_OF_ALPHABET = '\ufff0';

  inboxServices.factory('GenerateSearchRequests', [
    function() {

      var getKeysArray = function(keys) {
        return _.map(keys, function(t) {
          return [ t ];
        });
      };

      var getViewForMultidropdown = function(view, filter, mapKeys) {
        if (!view || !filter || !filter.selected) {
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
        if (!view) {
          return;
        }
        if (value === true || value === false) {
          return {
            view: view,
            params: {
              key: [ value ]
            }
          };
        }
      };

      var reportedDate = function(filters, type) {
        var view = type.views.reportedDate;
        var dateRange = filters.date;
        if (!view || !dateRange || (!dateRange.to && !dateRange.from)) {
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

      var form = function(filters, type) {
        return getViewForMultidropdown(type.views.form, filters.forms, function(forms) {
          return _.map(forms, function(form) {
            return [ form.code ];
          });
        });
      };

      var validity = function(filters, type) {
        return getViewForTernarySelect(type.views.validity, filters.valid);
      };

      var verification = function(filters, type) {
        return getViewForTernarySelect(type.views.verification, filters.verified);
      };

      var place = function(filters, type) {
        return getViewForMultidropdown(type.views.place, filters.facilities, getKeysArray);
      };

      var freetext = function(filters, type) {
        var view = type.views.freetext;
        if (!view) {
          return;
        }
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

      var subject = function(filters, type) {
        var view = type.views.subject;
        var subjectIds = filters.subjectIds;
        if (!view || !subjectIds || !subjectIds.length) {
          return;
        }
        return {
          view: view,
          params: {
            keys: getKeysArray(subjectIds)
          }
        };
      };

      var documentType = function(filters, type) {
        return getViewForMultidropdown(type.views.documentType, filters.types, getKeysArray);
      };

      var types = {
        reports: {
          getUnfiltered: function() {
            return {
              ordered: true,
              view: 'reports_by_date',
              params: { descending: true }
            };
          },
          views: {
            reportedDate: 'reports_by_date',
            form: 'reports_by_form',
            validity: 'reports_by_validity',
            verification: 'reports_by_verification',
            place: 'reports_by_place',
            freetext: 'reports_by_freetext',
            subject: 'reports_by_subject'
          }
        },
        contacts: {
          getUnfiltered: function() {
            return {
              ordered: true,
              view: 'contacts_by_name'
            };
          },
          views: {
            place: 'contacts_by_place',
            freetext: 'contacts_by_freetext',
            documentType: 'contacts_by_type'
          }
        }
      };

      var getRequests = function(filters, type) {
        var requests = [];
        requests.push(reportedDate(filters, type));
        requests.push(form(filters, type));
        requests.push(validity(filters, type));
        requests.push(verification(filters, type));
        requests.push(place(filters, type));
        requests.push(freetext(filters, type));
        requests.push(documentType(filters, type));
        requests.push(subject(filters, type));
        requests = _.compact(_.flatten(requests));
        return requests.length ? requests : [ type.getUnfiltered() ];
      };

      return function(type, filters) {
        var typeModel = types[type];
        if (!typeModel) {
          throw new Error('Unknown type: ' + type);
        }
        return getRequests(filters, typeModel);
      };
    }
  ]);
}());
