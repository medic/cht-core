var _ = require('underscore'),
    async = require('async');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Facility', ['DbView', 'Cache', 'CONTACT_TYPES',
    function(DbView, Cache, CONTACT_TYPES) {
      var cacheByType = {};
      CONTACT_TYPES.forEach(function(type) {
        cacheByType[type] = Cache({
          get: function(callback) {
            DbView('facilities', { params: { include_docs: true, key: [type] } })
              .then(function(data) {
                callback(null, data.results);
              })
              .catch(callback);
          },
          invalidate: function(doc) {
            return doc.type === type;
          }
        });
      });

      return function(options, callback) {
        if (!callback) {
          callback = options;
          options = {};
        }

        if (!options.types || options.types.indexOf('person') !== -1) {
          // We want to remove as many of these as possible, because for admins
          // it involves downloading a _huge_ amount of data.
          console.warn('A call to facility with the expectation of having person data', new Error());
        }

        var relevantCaches = (options.types ? options.types : CONTACT_TYPES).map(function(type) {
          return cacheByType[type];
        });

        async.parallel(relevantCaches, function(err, results) {
          if (err) {
            return callback(err);
          }
          callback(null, _.flatten(results));
        });
      };
    }
  ]);

  var descendant = function(id, parent) {
    if (!parent) {
      return false;
    }
    if (parent._id === id) {
      return true;
    }
    return descendant(id, parent.parent);
  };

  inboxServices.factory('Contact', ['Facility', 'UserDistrict',
    function(Facility, UserDistrict) {
      return function(callback) {
        UserDistrict(function(err, district) {
          if (err) {
            return callback(err);
          }
          var options = {
            district: district,
            types: [ 'person', 'health_center' ],
            targetScope: 'root'
          };
          Facility(options, function(err, res) {
            if (err) {
              return callback(err);
            }
            var contacts = [];
            _.each(res, function(contact) {
              if (contact.type === 'person' && contact.phone) {
                contacts.push(contact);
              } else if (contact.type === 'health_center') {
                contacts.push(_.extend({
                  everyoneAt: true,
                  descendants: _.filter(res, function(child) {
                    return descendant(contact._id, child.parent);
                  })
                }, contact));
              }
            });
            callback(null, contacts);
          });
        });
      };
    }
  ]);

  // TODO pass through Facility
  inboxServices.factory('District', ['DbView',
    function(DbView) {
      return function(callback) {
        var options = { params: { key: ['district_hospital'], include_docs: true } };
        DbView('facilities', options)
          .then(function(data) {
            callback(null, data.results);
          })
          .catch(callback);
      };
    }
  ]);

  inboxServices.factory('ChildFacility', ['DbView',
    function(DbView) {

      return function(parent, callback) {
        var params = {
          group: true
        };
        if (parent.type === 'district_hospital') {
          // filter on district
          params.startkey = [ parent._id ];
          params.endkey = [ parent._id, {} ];
        } else if (parent.type === 'health_center') {
          // filter on health center
          params.startkey = [ parent.parent._id, parent._id ];
          params.endkey = [ parent.parent._id, parent._id, {} ];
        } else {
          return callback('Doc not currently supported.');
        }
        DbView('total_clinics_by_facility', { params: params })
          .then(function(data) {
            callback(null, data.results);
          })
          .catch(callback);
      };

    }
  ]);

}());
