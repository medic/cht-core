var libphonenumber = require('libphonenumber/utils'),
    modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('EditContactCtrl',
    ['$scope', '$rootScope', 'translateFilter', 'Settings', 'UpdateContact', 'DbView',
    function ($scope, $rootScope, translateFilter, Settings, UpdateContact, DbView) {

      var populateParents = function() {
        var options = {
          params: {
            startkey: [],
            endkey: [{}],
            reduce: false,
            include_docs: true
          },
          targetScope: 'root'
        };
        DbView('facilities', options, function(err, results) {
          if (err) {
            return console.log('Error fetching parents', err);
          }
          results.push({
            name: translateFilter('New person'),
            type: 'person',
            _id: 'NEW',
            order: 1
          });
          $scope.parents = results;
        });
      };

      var validatePhoneNumber = function(number, contactId, settings, callback) {
        if (!libphonenumber.validate(settings, number)) {
          return callback(translateFilter('Phone number not valid'));
        }
        number = libphonenumber.format(settings, number);
        var options = { params: { key: [ number ] } };
        DbView('person_by_phone', options, function(err, results) {
          if (err) {
            return callback(translateFilter('Phone number not valid'));
          }
          if (results.rows.length && results.rows[0].id !== contactId) {
            return callback(translateFilter(
              'phone number not unique',
              { name: results.rows[0].value.name }
            ));
          }
          callback(null, number);
        });
      };

      populateParents();

      $scope.$on('ContactUpdated', populateParents);

      $scope.$on('EditContactInit', function(e, contact) {

        contact = contact || {};

        $scope.page = 0;
        $scope.primaryContact = {};
        $scope.errors = {
          page0: {},
          page1: {}
        };

        $scope.original = contact;
        if (contact._id) {
          $scope.contact = {
            name: contact.name,
            phone: contact.phone,
            type: contact.type,
            parent: contact.parent,
            contact: contact.contact,
            external_id: contact.external_id,
            rc_code: contact.rc_code,
            notes: contact.notes
          };
          $scope.contactId = contact._id;
          $scope.category = contact.type === 'person' ? 'person' : 'place';
        } else {
          $scope.contact = {
            type: contact.type || 'district_hospital'
          };
          $scope.category = $scope.contact.type === 'person' ? 'person' : 'place';
          $scope.contactId = null;
        }

        $('#edit-contact').modal('show');
      });

      var validatePage0 = function(settings, callback) {

        var errors = {};

        if (!$scope.contact.name) {
          errors.name = translateFilter('field is required', {
            field: translateFilter('Name')
          });
        }

        if ($scope.contact.type === 'health_center' &&
            (!$scope.contact.parent || $scope.contact.parent.type !== 'district_hospital')) {
          errors.district_hospital = translateFilter('field is required', {
            field: translateFilter('District Hospital')
          });
        }
        if ($scope.contact.type === 'clinic' &&
            (!$scope.contact.parent || $scope.contact.parent.type !== 'health_center')) {
          errors.health_center = translateFilter('field is required', {
            field: translateFilter('Health Center')
          });
        }
        if ($scope.contact.type === 'district_hospital') {
          // districts are orphans
          $scope.contact.parent = null;
        }

        if ($scope.contact.type !== 'person' || !$scope.contact.phone) {
          return callback(errors);
        }

        validatePhoneNumber($scope.contact.phone, $scope.contactId, settings, function(err, validated) {
          if (err) {
            errors.phone = err;
          } else {
            $scope.contact.phone = validated;
          }
          callback(errors);
        });
      };

      var validatePage1 = function(settings, callback) {
        if (!newPrimaryContact()) {
          return callback({});
        }

        var errors = {};

        if (!$scope.primaryContact.name) {
          errors.name = translateFilter('field is required', {
            field: translateFilter('Name')
          });
        }

        if (!$scope.primaryContact.phone) {
          return callback(errors);
        }

        validatePhoneNumber($scope.primaryContact.phone, null, settings, function(err, validated) {
          if (err) {
            errors.phone = err;
          } else {
            $scope.primaryContact.phone = validated;
          }
          callback(errors);
        });
      };

      var newPrimaryContact = function() {
        return $scope.contact.type !== 'person' &&
               $scope.contact.contact &&
               $scope.contact.contact._id === 'NEW';
      };
      
      var validate = function(callback) {
        $scope.errors = {
          page0: {},
          page1: {}
        };

        Settings(function(err, settings) {
          if (err) {
            return callback(err);
          }
          validatePage0(settings, function(errors) {
            $scope.errors.page0 = errors;
            validatePage1(settings, function(errors) {
              $scope.errors.page1 = errors;
              callback(null, {
                page0: Object.keys($scope.errors.page0).length === 0,
                page1: Object.keys($scope.errors.page1).length === 0
              });
            });
          });
        });
      };

      var addNewPrimaryContact = function(callback) {
        if (!newPrimaryContact()) {
          return callback();
        }
        var add = {
          type: 'person',
          name: $scope.primaryContact.name,
          phone: $scope.primaryContact.phone,
          notes: $scope.primaryContact.notes
        };
        UpdateContact(null, add, callback);
      };

      var updateNewPrimaryContact = function(added, parent, callback) {
        if (!added) {
          return callback();
        }
        UpdateContact(added, { parent: parent }, callback);
      };

      $scope.setPage = function(page) {
        $scope.page = page;
      };

      $scope.save = function() {
        validate(function(err, valid) {
          var pane;
          if (err) {
            pane = modal.start($('#edit-contact'));
            return pane.done(translateFilter('Error updating contact'), err);
          }
          if (valid.page0 && valid.page1) {
            pane = modal.start($('#edit-contact'));
            addNewPrimaryContact(function(err, added) {
              if (err) {
                return pane.done(translateFilter('Error updating contact'), err);
              }
              if (added) {
                $scope.contact.contact = added;
              }
              UpdateContact($scope.original, $scope.contact, function(err, contact) {
                if (err) {
                  return pane.done(translateFilter('Error updating contact'), err);
                }
                updateNewPrimaryContact(added, contact, function(err) {
                  if (!err) {
                    contact.parent = $scope.contact.parent;
                    $rootScope.$broadcast('ContactUpdated', contact);
                  }
                  pane.done(translateFilter('Error updating contact'), err);
                });
              });
            });
          } else if($scope.page === 1 && valid.page1) {
            // make sure we're showing a page with validation errors
            $scope.page = 0;
          }
        });
      };

    }
  ]);

}());
