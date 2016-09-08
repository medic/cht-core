var _ = require('underscore');

(function () {

  'use strict';

  exports.contactsubtitle = function(doc) {
    switch(doc.type) {
      case 'person':
        return doc.parent && doc.parent.name || 'unknown';
      case 'clinic':
        return '' + (doc.childCount || 0) + ' Family Members';
      default:
        return 'Primary contact: ' + (doc.contact && doc.contact.name || 'unknown');
    }
  };

  exports.clinic = function(entity) {
    var parts;
    if (_.isArray(entity)) {
      parts = entity;
    } else {
      parts = [];
      while (entity) {
        if (entity.name) {
          parts.push(entity.name);
        } else if (entity.contact && entity.contact.phone) {
          parts.push(entity.contact.phone);
        }
        entity = entity.parent;
      }
    }
    return _.map(parts, _.escape).join(' • ');
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
      parts.push('<span class="position">' + position + '</span>');
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
