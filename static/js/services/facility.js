var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('FacilityRaw', ['$resource', 'BaseUrlService',
    function($resource, BaseUrlService) {
      return function(district) {
        var url = BaseUrlService() + '/facilities.json';
        if (district) {
          url += '/' + district;
        }

        return $resource(url, {}, {
          query: {
            method: 'GET',
            isArray: false,
            cache: true
          }
        });
      };
    }
  ]);

  inboxServices.factory('Contact', ['$q', 'FacilityRaw',
    function($q, FacilityRaw) {
      return function(district) {
        var deferred = $q.defer();

        FacilityRaw(district).query(function(res) {
          var contacts = [];
          _.each(res.rows, function(contact) {
            if (contact.doc.contact && contact.doc.contact.phone) {
              contacts.push(contact);
            }
            if (contact.doc.type === 'health_center') {
              var clinics = _.filter(res.rows, function(child) {
                return child.doc.parent && 
                  child.doc.parent._id === contact.id;
              });
              contacts.push(_.extend({ 
                everyoneAt: true,
                clinics: clinics
              }, contact));
            }
          });
          deferred.resolve(contacts);
        });

        return deferred.promise;
      };
    }
  ]);

  inboxServices.factory('Facility', ['$q', 'FacilityRaw',
    function($q, FacilityRaw) {

      var getName = function(clinic) {
        var parts = [];
        do {
          parts.push(clinic.name);
          clinic = clinic.parent;
        } while( clinic.name );
        return parts.join(', ');
      };

      return function(district) {

        var deferred = $q.defer();

        FacilityRaw(district).query(function(res) {

          var clinics = _.filter(res.rows, function(row) {
            return row.doc.type === 'clinic';
          });
          var results = _.map(clinics, function(clinic) {
            return { id: clinic.id, text: getName(clinic.doc) };
          });

          results.sort(function(lhs, rhs) {
            var lhsName = lhs.text.toUpperCase();
            var rhsName = rhs.text.toUpperCase();
            return lhsName.localeCompare(rhsName);
          });

          deferred.resolve(results);
        });

        return deferred.promise;
      };
    }
  ]);

}());