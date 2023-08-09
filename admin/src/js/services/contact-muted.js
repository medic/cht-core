const _ = require('lodash/core');

angular.module('inboxServices').service('ContactMuted',
  function() {

    'use strict';
    'ngInject';

    return function(doc, lineage) {
      if (!doc) {
        return false;
      }

      if (doc.muted) {
        return doc.muted;
      }

      if (lineage) {
        const mutedParent = _.find(lineage, function(parent) {
          return parent && parent.muted;
        });

        return !!mutedParent && mutedParent.muted;
      }

      let parent = doc.parent;
      while (parent) {
        if (parent.muted) {
          return parent.muted;
        }
        parent = parent.parent;
      }

      return false;
    };
  });
