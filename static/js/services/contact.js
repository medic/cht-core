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
    
    return function(callback) {
      UserDistrict(function(err, district) {
        if (err) {
          return callback(err);
        }
        var options = {
          district: district,
          types: [ 'person', 'health_center' ],
          targetScope: 'root'
        };
        Facility(options, function(err, res) {
          if (err) {
            return callback(err);
          }
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
          callback(null, contacts);
        });
      });
    };
  }
);