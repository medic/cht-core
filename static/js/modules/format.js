var _ = require('underscore');

(function () {

  'use strict';

  exports.clinic = function(entity) {
    var parts;
    if (_.isArray(entity)) {
      parts = entity;
    } else {
      parts = [];
      while (entity) {
        if (entity.name) {
          parts.push(entity.name);
        }
        entity = entity.parent;
      }
    }
    return _.map(parts, _.escape).join(' › ');
  };

}());