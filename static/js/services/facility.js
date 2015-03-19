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

  inboxServices.factory('Facility', ['FacilityRaw',
    function(FacilityRaw) {
      return function(options, callback) {
        if (!callback) {
          callback = options;
          options = {};
        }
        FacilityRaw(options.district).query(
          function(res) {
            var result = res.rows;
            if (options.types) {
              result = _.filter(result, function(row) {
                return options.types.indexOf(row.doc.type) !== -1;
              });
            }
            callback(null, result);
          },
          function(err) {
            callback(err);
          }
        );
      };
    }
  ]);

  inboxServices.factory('FacilityHierarchy', ['Facility',
    function(Facility) {
      return function(district, callback) {
        var options = {
          types: ['clinic','health_center','district_hospital'],
          district: district
        };
        Facility(options, function(err, facilities) {
          if (err) {
            return callback(err);
          }
          var results = [];
          var total = 0;
          facilities.forEach(function(row) {
            var parentId = row.doc.parent && row.doc.parent._id;
            if (parentId) {
              var parent = _.find(facilities, function(curr) {
                return curr.doc._id === parentId;
              });
              if (parent) {
                if (!parent.children) {
                  parent.children = [];
                }
                parent.children.push(row);
                total++;
              }
            } else {
              total++;
              results.push(row);
            }
          });
          callback(null, results, total);
        });
      };
    }
  ]);

  inboxServices.factory('District', ['DbView',
    function(DbView) {

      var options = {
        startkey: ['district_hospital'],
        endkey: ['district_hospital', {}],
        reduce: false,
        include_docs: true
      };

      return function(callback) {
        DbView('facilities', options, callback);
      };

    }
  ]);

  inboxServices.factory('ChildFacility', ['DbView',
    function(DbView) {

      return function(parent, callback) {
        var options = {
          group: true
        };
        if (parent.type === 'district_hospital') {
          // filter on district
          options.startkey = [ parent._id ];
          options.endkey = [ parent._id, {} ];
        } else if (parent.type === 'health_center') {
          // filter on health center
          options.startkey = [ parent.parent._id, parent._id ];
          options.endkey = [ parent.parent._id, parent._id, {} ];
        } else {
          return callback('Doc not currently supported.');
        }
        DbView('total_clinics_by_facility', options, callback);
      };

    }
  ]);

}());
