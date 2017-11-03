var _ = require('underscore');

/**
  Returns all places, in a hierarchy tree.
  E.g.
  [
      { doc: c, children: [{ doc: b, children: [] }] },
      { doc: f, children: [] }
    ]
*/
angular.module('inboxServices').factory('PlaceHierarchy',
  function(
    Contacts,
    ContactSchema,
    Settings
  ) {

    'use strict';
    'ngInject';

    // E.g. [ grandparentId, parentId, placeId ]
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

    // This works because our current hierarchy model only allows you to
    // have one parent. Because you only have one parent, if you are a
    // restricted user whose parent lineage contains stubs, all stubs will
    // only have one child.
    //
    // CHW example:
    //   district_hospital [stub]
    //    \-> health_center [stub]
    //         \-> clinic [real, CHW sits here]
    //
    //  District Manager example:
    //   district_hospital [stub]
    //    \-> health_center [real, DM sits here]
    //         |-> clinic
    //         |-> clinic
    //         |-> clinic
    var firstNonStubNode = function(children) {
      if (children[0] && children[0].doc.stub) {
        return firstNonStubNode(children[0].children);
      } else {
        return children;
      }
    };

    var buildHierarchy = function(places) {
      var hierarchy = [];
      places.forEach(function(placeToSort) {
        addLineageToHierarchy(placeToSort, getIdLineage(placeToSort), hierarchy);
      });
      return firstNonStubNode(hierarchy);
    };

    // By default exclude clinic (the lowest level) to increase performance.
    var defaultHierarchyTypes = ContactSchema.getPlaceTypes().filter(function(type) {
      return type !== 'clinic';
    });

    return function() {
      return Settings().then(function(settings) {
        var types = settings.place_hierarchy_types || defaultHierarchyTypes;

        return Contacts(types).then(buildHierarchy);
      });
    };
  }
);
