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
        return !!_.findWhere(lineage, { muted: true });
      }

      var parent = doc.parent,
          muted = false;
      while (parent && !muted) {
        muted = parent.muted;
        parent = parent.parent;
      }

      return !!muted;
    };
  }
);
