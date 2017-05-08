var _ = require('underscore');

(function () {

  'use strict';

  var formatEntity = function(entity, $state) {
    if (!entity) {
      return;
    }
    if (_.isString(entity)) {
      return entity;
    }
    var part = entity.name || (entity.contact && entity.contact.phone);
    if (part) {
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

  exports.sender = function(options) {
    var parts = [];
    if (options.name) {
      parts.push('<span class="name">' + _.escape(options.name) + '</span>');
    }
    if (options.phone) {
      parts.push('<span>' + _.escape(options.phone) + '</span>');
    }
    var position = exports.lineage(options.parent);
    if (position) {
      parts.push('<div class="position">' + position + '</div>');
    }
    return '<span class="sender">' + parts.join('') + '</span>';
  };

  exports.contact = function(doc) {
    var contact = (doc.type !== 'person' && doc.contact) ? doc.contact : doc;
    var place = doc.place || (doc.type === 'person' ? doc.parent : doc);
    return exports.sender({
      name: contact.name,
      phone: contact.phone,
      parent: place
    });
  };

}());
