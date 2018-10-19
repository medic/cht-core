var _ = require('underscore');

angular.module('inboxServices').service('ContactMuted',
  function() {

    'use strict';
    'ngInject';

    return function(doc, lineage) {
      if (!doc) {
        return false;
      }

      if (doc.muted) {
        return true;
      }

      if (lineage) {
        return _.some(lineage, function(parent) {
          return parent && parent.muted;
        });
      }

      var parent = doc.parent;
      while (parent) {
        if (parent.muted) {
          return true;
        }
        parent = parent.parent;
      }

      return false;
    };
  }
);
