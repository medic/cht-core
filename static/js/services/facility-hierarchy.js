var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  // E.g. [ grandparentId, parentId, placeId]
  var getIdLineage = function(place) {
    var path = [];
    while(place && place._id) {
      path.splice(0, 0, place._id);
      place = place.parent;
    }
    return path;
  };

  var getNodeFromArray = function(id, array) {
    return _.find(array, function(r) {
        return r.doc._id === id;
    });
  };

  var addLineageToHierarchy = function(placeToSort, lineage, children) {
    lineage.forEach(function(idInLineage) {
      var node = getNodeFromArray(idInLineage, children);

      if (!node) {
        node = { doc: { _id: idInLineage, stub: true }, children: []};
        children.push(node);
      }

      if (idInLineage === placeToSort._id) {
        // Replace stub by real doc.
        node.doc = placeToSort;
      }

      children = node.children;
    });
  };

  var removeStubNodes = function(children) {
    for (var i = children.length - 1; i >= 0; i--) {
      if (children[i].doc.stub) {
        children.splice(i, 1);
      } else {
        removeStubNodes(children[i].children);
      }
    }
  };

  var buildHierarchy = function(places) {
    var hierarchy = [];
    places.forEach(function(placeToSort) {
      addLineageToHierarchy(placeToSort, getIdLineage(placeToSort), hierarchy);
    });
    removeStubNodes(hierarchy);
    return hierarchy;
  };

  inboxServices.factory('FacilityHierarchy',
    function(
      ContactSchema,
      AllContacts
    ) {
      'ngInject';
      var hierarchyTypes = ContactSchema.getPlaceTypes().filter(function(pt) {
        return pt !== 'clinic';
      });

      return function() {
        return AllContacts({ types: hierarchyTypes })
          .then(function(places) {
            return buildHierarchy(places);
          });
      };
    }
  );

}());
