var _ = require('underscore');

(function () {

  'use strict';

  exports.clinic = function(entity, $state) {
    var parts;
    if (_.isArray(entity)) {
      // TODO check each part for an object.name
      parts = entity;
    } else {
      parts = [];
      while (entity) {
        var part;
        if (entity.name) {
          part = entity.name;
        } else if (entity.contact && entity.contact.phone) {
          part = entity.contact.phone;
        }
        if (part) {
          if (entity._id && $state) {
            var url = $state.href('contacts.detail', { id: entity._id });
            part = '<a href="' + url + '">' + part + '</a>';
          }
          parts.push(part);
        }
        entity = entity.parent;
      }
    }
    var items = parts.map(function(part) {
      return '<li>' + part + '</li>';
    });
    return '<ol class="horizontal lineage">' + items.join('') + '</ol>';
  };

  exports.sender = function(options) {
    var parts = [];
    if (options.name) {
      parts.push('<span class="name">' + _.escape(options.name) + '</span>');
    }
    if (options.phone) {
      parts.push('<span>' + _.escape(options.phone) + '</span>');
    }
    var position = exports.clinic(options.parent);
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
