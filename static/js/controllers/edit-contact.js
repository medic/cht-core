var libphonenumber = require('libphonenumber/utils'),
    modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('EditContactCtrl',
    ['$scope', '$rootScope', 'translateFilter', 'Settings', 'UpdateContact', 'DbView',
    function ($scope, $rootScope, translateFilter, Settings, UpdateContact, DbView) {

      $scope.$on('EditContactInit', function(e, contact) {

        $scope.page = 0;
        $scope.primaryContact = {};

        if (contact) {
          $scope.contact = {
            name: contact.name,
            phone: contact.phone,
            type: contact.type,
            parent: contact.parent,
            contact: contact.contact,
            external_id: contact.external_id,
            notes: contact.notes
          };
          $scope.contactId = contact._id;
        } else {
          $scope.contact = {
            type: 'district_hospital'
          };
          $scope.contactId = null;
        }
        var options = {
          startkey: [],
          endkey: [{}],
          reduce: false,
          include_docs: true
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
          $('#edit-contact').modal('show');
        });
      });

      var validatePage0 = function(settings) {

        var errors = {};

        if (!$scope.contact.name) {
          errors.name = translateFilter('field is required', {
            field: translateFilter('Name')
          });
        }

        if ($scope.contact.type === 'person' && $scope.contact.phone) {
          if (!libphonenumber.validate(settings, $scope.contact.phone)) {
            errors.phone = translateFilter('Phone number not valid');
          } else {
            $scope.contact.phone = libphonenumber.format(settings, $scope.contact.phone);
          }
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

        return errors;
      };

      var validatePage1 = function(settings) {
        var errors = {};

        if (!$scope.primaryContact.name) {
          errors.name = translateFilter('field is required', {
            field: translateFilter('Name')
          });
        }

        if ($scope.primaryContact.phone) {
          if (!libphonenumber.validate(settings, $scope.primaryContact.phone)) {
            errors.phone = translateFilter('Phone number not valid');
          } else {
            $scope.primaryContact.phone = libphonenumber.format(settings, $scope.primaryContact.phone);
          }
        }

        return errors;
      };

      var newPrimaryContact = function() {
        return $scope.contact.type !== 'person' &&
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

          $scope.errors.page0 = validatePage0(settings);
          if (newPrimaryContact()) {
            $scope.errors.page1 = validatePage1(settings);
          }

          callback(null, {
            page0: Object.keys($scope.errors.page0).length === 0,
            page1: Object.keys($scope.errors.page1).length === 0
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
              UpdateContact($scope.contactId, $scope.contact, function(err, contact) {
                if (!err) {
                  $rootScope.$broadcast('ContactUpdated', contact);
                }
                pane.done(translateFilter('Error updating contact'), err);
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