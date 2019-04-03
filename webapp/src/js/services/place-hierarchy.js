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
    ContactTypes,
    Contacts,
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

    // For restricted users. Hoist the highest place they have access to, to the
    // top of the tree.
    var firstNonStubNode = function(children) {
      // Only hoist if there is one child. This will be the case for CHWs. There
      // may be situations where the first child is a stub but there are more
      // children, in which case we want to expose that in the UI.
      if (children.length === 1 && children[0].doc.stub) {
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

    return function() {
      return Settings()
        .then(settings => {
          if (settings.place_hierarchy_types) {
            return settings.place_hierarchy_types;
          }
          return ContactTypes.getAll().then(types => {
            return types
              .filter(type => !type.person && type.id !== 'clinic') // By default exclude people and clinics (the lowest level) to increase performance.
              .map(type => type.id);
          });
        })
        .then(types => Contacts(types))
        .then(places => buildHierarchy(places));
    };
  }
);
