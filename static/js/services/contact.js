var _ = require('underscore');

angular.module('inboxServices').factory('Contact',
  function(
    Facility,
    UserDistrict
  ) {

    'use strict';
    'ngInject';

    var descendant = function(id, parent) {
      if (!parent) {
        return false;
      }
      if (parent._id === id) {
        return true;
      }
      return descendant(id, parent.parent);
    };
    
    return function() {
      return UserDistrict()
        .then(function(district) {
          var options = {
            district: district,
            types: [ 'person', 'health_center' ],
            targetScope: 'root'
          };
          return Facility(options);
        })
        .then(function(res) {
          var contacts = [];
          _.each(res, function(contact) {
            if (contact.type === 'person' && contact.phone) {
              contacts.push(contact);
            } else if (contact.type === 'health_center') {
              contacts.push(_.extend({
                everyoneAt: true,
                descendants: _.filter(res, function(child) {
                  return descendant(contact._id, child.parent);
                })
              }, contact));
            }
          });
          return contacts;
        });
    };
  }
);
