angular.module('inboxServices').factory('PlaceHierarchy',
  function(
    ContactTypes,
    Contacts,
    Settings
  ) {

    'use strict';
    'ngInject';

    // E.g. [ grandparentId, parentId, placeId ]
    const getIdLineage = function(place) {
      const path = [];
      while(place && place._id) {
        path.splice(0, 0, place._id);
        place = place.parent;
      }
      return path;
    };

    const addLineageToHierarchy = function(placeToSort, lineage, children) {
      lineage.forEach(function(idInLineage) {
        let node = children.find(child => child.doc._id === idInLineage);

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
    const firstNonStubNode = function(children) {
      // Only hoist if there is one child. This will be the case for CHWs. There
      // may be situations where the first child is a stub but there are more
      // children, in which case we want to expose that in the UI.
      if (children.length === 1 && children[0].doc.stub) {
        return firstNonStubNode(children[0].children);
      } else {
        return children;
      }
    };

    const buildHierarchy = function(places) {
      const hierarchy = [];
      places.forEach(function(placeToSort) {
        addLineageToHierarchy(placeToSort, getIdLineage(placeToSort), hierarchy);
      });
      return firstNonStubNode(hierarchy);
    };

    const getContacts = () => {
      return Settings()
        .then(settings => {
          if (settings.place_hierarchy_types) {
            return settings.place_hierarchy_types;
          }
          // Exclude people and clinics (the lowest level)
          // for performance reasons
          return ContactTypes.getPlaceTypes().then(types => {
            const ids = [];
            types.forEach(type => {
              if (type.parents) {
                ids.push(...type.parents);
              }
            });
            return ids;
          });
        })
        .then(types => Contacts(types));
    };

    /**
     * @ngdoc service
     * @name PlaceHierarchy
     * @memberof inboxServices
     * @description Returns a Promise to return all places excluding
     *  the leaf types, in a hierarchy tree.
     *   E.g.
     *    [
     *      { doc: c, children: [{ doc: b, children: [] }] },
     *      { doc: f, children: [] }
     *    ]
     */
    return function() {
      return getContacts()
        .then(places => buildHierarchy(places));
    };
  }
);
