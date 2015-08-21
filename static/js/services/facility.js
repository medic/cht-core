var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var getFacilitiesUrl = function(BaseUrlService, district) {
    var url = BaseUrlService() + '/facilities.json';
    if (district) {
      url += '/' + district;
    }
    return url;
  };

  inboxServices.factory('ClearFacilityCache', ['$cacheFactory', 'BaseUrlService', 'UserDistrict',
    function($cacheFactory, BaseUrlService, UserDistrict) {
      return function() {
        UserDistrict(function(err, district) {
          if (err) {
            console.log('Error fetching district', err);
          }
          $cacheFactory.get('$http')
            .remove(getFacilitiesUrl(BaseUrlService, district));
        });
      };
    }
  ]);

  inboxServices.factory('Facility', ['DbView', 'Cache',
    function(DbView, Cache) {

      var cache = Cache(function(callback) {
        DbView('facilities', { params: { include_docs: true } }, callback);
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

  inboxServices.factory('FacilityHierarchy', ['Facility',
    function(Facility) {
      return function(district, callback) {
        var options = {
          types: ['clinic','health_center','district_hospital'],
          district: district,
          targetScope: 'root'
        };
        Facility(options, function(err, facilities) {
          if (err) {
            return callback(err);
          }
          var results = [];
          var total = 0;
          facilities.forEach(function(row) {
            var parentId = row.parent && row.parent._id;
            if (parentId) {
              var parent = _.find(facilities, function(curr) {
                return curr._id === parentId;
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
