var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var removeOrphans = function(children) {
    for (var i = children.length - 1; i >= 0; i--) {
      if (children[i].doc.stub) {
        children.splice(i, 1);
      } else {
        removeOrphans(children[i].children);
      }
    }
  };

  var getIdPath = function(facility) {
    var path = [];
    while(facility && facility._id) {
      path.splice(0, 0, facility._id);
      facility = facility.parent;
    }
    return path;
  };

  var buildHierarchy = function(facilities) {
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
    removeOrphans(results);
    return results;
  };

  inboxServices.factory('FacilityHierarchy',
    function(
      Facility,
      PLACE_TYPES
    ) {
      'ngInject';
      var hierarchyTypes = PLACE_TYPES.filter(function(pt) {
        return pt !== 'clinic';
      });

      return function() {
        return Facility({ types: hierarchyTypes })
          .then(function(facilities) {
            return buildHierarchy(facilities);
          });
      };
    }
  );

}());
