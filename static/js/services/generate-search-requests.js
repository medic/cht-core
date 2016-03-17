var _ = require('underscore'),
    moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var endOfAlphabet = '\ufff0';

  inboxServices.factory('GenerateSearchRequests', [
    function() {

      var getKeysArray = function(keys) {
        return _.map(keys, function(t) {
          return [ t ];
        });
      };

      var reportedDate = function($scope, type) {
        var view = type.views.reportedDate;
        if (!view) {
          return;
        }
        if (!$scope.filterModel.date) {
          return;
        }
        if ($scope.filterModel.date.to || $scope.filterModel.date.from) {
          // increment end date so it's inclusive
          var to = moment($scope.filterModel.date.to).add(1, 'days');
          var from = moment($scope.filterModel.date.from || 0);
          return {
            view: view,
            params: {
              startkey: [ from.valueOf() ],
              endkey: [ to.valueOf() ]
            }
          };
        }
      };

      var form = function($scope, type) {
        var view = type.views.form;
        if (!view) {
          return;
        }
        var selected = $scope.filterModel.forms;
        if (!selected) {
          return;
        }
        if (selected.length > 0 && selected.length < $scope.forms.length) {
          var keys = _.map(selected, function(form) {
            return [ form.code ];
          });
          return {
            view: view,
            params: {
              keys: keys
            }
          };
        }
      };

      var validity = function($scope, type) {
        var view = type.views.validity;
        if (!view) {
          return;
        }
        var validity = $scope.filterModel.valid;
        if (validity === true || validity === false) {
          return {
            view: view,
            params: {
              key: [ validity ]
            }
          };
        }
      };

      var verification = function($scope, type) {
        var view = type.views.verification;
        if (!view) {
          return;
        }
        var verification = $scope.filterModel.verified;
        if (verification === true || verification === false) {
          return {
            view: view,
            params: {
              key: [ verification ]
            }
          };
        }
      };

      var place = function($scope, type) {
        var view = type.views.place;
        if (!view) {
          return;
        }
        var selected = $scope.filterModel.facilities;
        if (selected &&
            selected.length > 0 &&
            selected.length < $scope.facilitiesCount) {
          return {
            view: view,
            params: {
              keys: getKeysArray(selected)
            }
          };
        }
      };

      var freetext = function(filters, type) {
        var view = type.views.freetext;
        if (!view) {
          return;
        }
        if (filters.search) {
          var query = filters.search.toLowerCase();
          var params = {};
          if (query.indexOf(':') !== -1) {
            // use exact match
            params.keys = _.map(query.split(/\s+/), function(word) {
              return [ word ];
            });
          } else {
            // use starts with
            params.startkey = [ query ];
            params.endkey = [ query + endOfAlphabet ];
          }
          return {
            view: view,
            params: params
          };
        }
      };

      var subject = function($scope, type) {
        var view = type.views.subject;
        if (!view) {
          return;
        }
        var subjectIds = $scope.filterModel.subjectIds;
        if (subjectIds && subjectIds.length) {
          return {
            view: view,
            params: {
              keys: getKeysArray(subjectIds)
            }
          };
        }
      };

      var documentType = function($scope, type) {
        var view = type.views.documentType;
        if (!view) {
          return;
        }
        var selected = $scope.filterModel.contactTypes;
        var numberOfTypes = 4;
        if (selected &&
            selected.length > 0 &&
            selected.length < numberOfTypes) {
          return {
            view: type.views.documentType,
            params: {
              keys: getKeysArray(selected)
            }
          };
        }
      };

      var types = {
        reports: {
          getUnfiltered: function() {
            return {
              view: 'reports_by_date',
              params: {
                include_docs: true,
                descending: true
              }
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
              view: 'contacts_by_name',
              params: {
                include_docs: true
              }
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
        // requests.push(reportedDate($scope, type));
        // requests.push(form($scope, type));
        // requests.push(validity($scope, type));
        // requests.push(verification($scope, type));
        // requests.push(place($scope, type));
        requests.push(freetext(filters, type));
        // requests.push(documentType($scope, type));
        // requests.push(subject($scope, type));
        requests = _.compact(requests);
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