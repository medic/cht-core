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

  inboxServices.factory('Facility', ['HttpWrapper', 'BaseUrlService',
    function(HttpWrapper, BaseUrlService) {
      return function(options, callback) {
        if (!callback) {
          callback = options;
          options = {};
        }
        HttpWrapper.get(getFacilitiesUrl(BaseUrlService, options.district))
          .success(function(res) {
            if (options.types) {
              return callback(null, _.filter(res.rows, function(row) {
                return options.types.indexOf(row.doc.type) !== -1;
              }));
            }
            callback(null, res.rows);
          })
          .error(function(data) {
            callback(new Error(data));
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
            types: [ 'person', 'health_center' ]
          };
          Facility(options, function(err, res) {
            if (err) {
              return callback(err);
            }
            var contacts = [];
            _.each(res, function(contact) {
              if (contact.doc.type === 'person' && contact.doc.phone) {
                contacts.push(contact);
              } else if (contact.doc.type === 'health_center') {
                contacts.push(_.extend({
                  everyoneAt: true,
                  descendants: _.filter(res, function(child) {
                    return descendant(contact.id, child.doc.parent);
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
