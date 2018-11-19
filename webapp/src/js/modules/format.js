var _ = require('underscore');

(function () {

  'use strict';

  var formatEntity = function(entity, $state) {
    if (!entity) {
      return;
    }
    if (_.isString(entity)) {
      return _.escape(entity);
    }
    var part = entity.name || (entity.contact && entity.contact.phone);
    if (part) {
      part = _.escape(part);
      if (entity._id && $state) {
        var url = $state.href('contacts.detail', { id: entity._id });
        part = '<a href="' + url + '">' + part + '</a>';
      }
      return part;
    }
  };

  exports.lineage = function(entity, $state) {
    var parts;
    if (_.isArray(entity)) {
      parts = entity.map(function(i) {
        return formatEntity(i, $state);
      });
    } else {
      parts = [];
      while (entity) {
        parts.push(formatEntity(entity, $state));
        entity = entity.parent;
      }
    }
    var items = _.compact(parts).map(function(part) {
      return '<li>' + part + '</li>';
    });
    return '<ol class="horizontal lineage">' + items.join('') + '</ol>';
  };

  // Deprecated, use lineage filter instead.
  exports.clinic = exports.lineage;

  exports.sender = function(options, $translate) {
    var parts = [];
    if (options.name) {
      parts.push('<span class="name">' + _.escape(options.name) + '</span>');
    }
    if (options.muted) {
      parts.push('<span class="muted">' + _.escape($translate.instant('contact.muted')) + '</span>');
    }
    if (options.phone) {
      parts.push('<span>' + _.escape(options.phone) + '</span>');
    }
    var position = exports.lineage(options.parent || options.lineage);
    if (position) {
      parts.push('<div class="position">' + position + '</div>');
    }
    return '<span class="sender">' + parts.join('') + '</span>';
  };

}());
