var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var removeOrphans = function(children) {
    var count = 0;
    for (var i = children.length - 1; i >= 0 ; i--) {
      if (children[i].doc.stub) {
        children.splice(i, 1);
      } else {
        count++;
        count += removeOrphans(children[i].children);
      }
    }
    return count;
  };

  var getIdPath = function(facility) {
    var path = [];
    while(facility && facility._id) {
      path.splice(0, 0, facility._id);
      facility = facility.parent;
    }
    return path;
  };

  var buildHierarchy = function(facilities, callback) {
    var results = [];
    facilities.forEach(function(row) {
      var result = results;
      getIdPath(row).forEach(function(id) {
        var found = _.find(result, function(r) {
          return r.doc._id === id;
        });
        if (!found) {
          found = { doc: { _id: id, stub: true }, children: [] };
          result.push(found);
        }
        if (row._id === id) {
          found.doc = row;
        }
        result = found.children;
      });
    });
    var total = removeOrphans(results);
    callback(null, results, total);
  };

  inboxServices.factory('FacilityHierarchy', ['Facility', 'PLACE_TYPES',
    function(Facility, PLACE_TYPES) {
      return function(callback) {
        Facility({ types: PLACE_TYPES }, function(err, facilities) {
          if (err) {
            return callback(err);
          }
          buildHierarchy(facilities, callback);
        });
      };
    }
  ]);

}());
