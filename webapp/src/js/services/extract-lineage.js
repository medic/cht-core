/**
 * Given a contact return just the hierarchy with doc ids.
 * eg: { _id: 'a', parent: { _id: 'b', parent: { _id: 'c' } } }
 */
angular.module('inboxServices').factory('ExtractLineage',
  function() {
    'use strict';
    return function(contact) {
      if (!contact) {
        return contact;
      }
      var result = { _id: contact._id };
      var minified = result;
      while(contact.parent) {
        minified.parent = { _id: contact.parent._id };
        minified = minified.parent;
        contact = contact.parent;
      }
      return result;
    };
  }
);
