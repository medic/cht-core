var _ = require('underscore'),
    types = [ 'district_hospital', 'catchment_area', 'health_center', 'person' ];

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Facility', ['DbView', 'Cache',
    function(DbView, Cache) {

      var cache = Cache({
        get: function(callback) {
          DbView('facilities', { params: { include_docs: true } }, callback);
        },
        filter: function(doc) {
          return _.contains(types, doc.type);
        }
      });

      return function(options, callback) {
        cache(function(err, res) {
          if (err) {
            return callback(err);
          }
          if (options.types) {
            return callback(null, _.filter(res, function(doc) {
              return options.types.indexOf(doc.type) !== -1;
            }));
          }
          callback(null, res);
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

  inboxServices.factory('District', ['DbView',
    function(DbView) {
      return function(callback) {
        DbView(
          'facilities',
          { params: { key: ['district_hospital'], include_docs: true } },
          callback
        );
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
        DbView('total_clinics_by_facility', { params: params }, callback);
      };

    }
  ]);

}());
