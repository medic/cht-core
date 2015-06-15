var _ = require('underscore'),
    moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var endOfAlphabet = '\ufff0';

  inboxServices.factory('GenerateSearchRequests', [
    function() {

      var reportedDate = function($scope) {
        if ($scope.filterModel.date.to || $scope.filterModel.date.from) {
          // increment end date so it's inclusive
          var to = moment($scope.filterModel.date.to).add(1, 'days');
          var from = moment($scope.filterModel.date.from || 0);
          return {
            view: 'reports_by_date',
            params: {
              startkey: [ from.valueOf() ],
              endkey: [ to.valueOf() ]
            }
          };
        }
      };

      var form = function($scope) {
        var selectedForms = $scope.filterModel.forms;
        if (selectedForms.length > 0 && selectedForms.length < $scope.forms.length) {
          var keys = _.map(selectedForms, function(form) {
            return [ form.code ];
          });
          return {
            view: 'reports_by_form',
            params: {
              keys: keys
            }
          };
        }
      };

      var validity = function($scope) {
        var validity = $scope.filterModel.valid;
        if (validity === true || validity === false) {
          return {
            view: 'reports_by_validity',
            params: {
              key: [ validity ]
            }
          };
        }
      };

      var verification = function($scope) {
        var verification = $scope.filterModel.verified;
        if (verification === true || verification === false) {
          return {
            view: 'reports_by_verification',
            params: {
              key: [ verification ]
            }
          };
        }
      };

      var place = function($scope) {
        var selected = $scope.filterModel.facilities;
        if (selected.length > 0 && selected.length < $scope.facilitiesCount) {
          var keys = _.map(selected, function(facility) {
            return [ facility ];
          });
          return {
            view: 'reports_by_place',
            params: {
              keys: keys
            }
          };
        }
      };

      var freetext = function($scope) {
        var freetext = $scope.filterQuery.value;
        if (freetext) {
          freetext = freetext.toLowerCase();
          var params = {};
          if (freetext.indexOf(':') !== -1) {
            // use exact match
            params.keys = _.map(freetext.split(/\s+/), function(word) {
              return [ word ];
            });
          } else {
            // use starts with
            params.startkey = [ freetext ];
            params.endkey = [ freetext + endOfAlphabet ];
          }
          return {
            view: 'reports_by_freetext',
            params: params
          };
        }
      };

      // TODO contacts

      var types = {
        reports: {
          getRequests: function($scope, requests) {
            requests.push(reportedDate($scope));
            requests.push(form($scope));
            requests.push(validity($scope));
            requests.push(verification($scope));
            requests.push(place($scope));
            requests.push(freetext($scope));
          },
          unfiltered: {
            view: 'reports_by_date',
            params: {
              include_docs: true,
              descending: true
            }
          }
        }
      };

      var getRequests = function($scope, type) {
        var requests = [];
        type.getRequests($scope, requests);
        requests = _.compact(requests);
        return requests.length ? requests : [ type.unfiltered ];
      };

      return function($scope) {
        var type = types[$scope.filterModel.type];
        if (!type) {
          throw new Error('Unknown type: ' + $scope.filterModel.type);
        }
        return getRequests($scope, type);
      };
    }
  ]);
}());