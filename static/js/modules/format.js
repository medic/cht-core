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

  exports.facility = function(entity) {
    return entity.name;
  }

  exports.contact = function(doc) {
    var parts = [];
    var contact = doc.contact;
    if (contact && contact.name) {
      parts.push('<span class="name">' + _.escape(contact.name) + '</span>');
    }
    if (contact && contact.phone) {
      parts.push('<span>' + _.escape(contact.phone) + '</span>');
    }
    var name = exports.clinic(doc);
    if (name) {
      parts.push('<span class="position">' + name + '</span>');
    }
    return '<span class="sender">' + parts.join('') + '</span>';
  };

}());
