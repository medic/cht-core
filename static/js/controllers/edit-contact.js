var libphonenumber = require('libphonenumber/utils'),
    modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('EditContactCtrl',
    ['$scope', '$rootScope', 'translateFilter', 'Settings', 'UpdateContact', 'DbView',
    function ($scope, $rootScope, translateFilter, Settings, UpdateContact, DbView) {

      $scope.$on('EditContactInit', function(e, contact) {
        if (contact) {
          $scope.contact = {
            name: contact.name,
            type: contact.type,
            parent: contact.parent,
            external_id: contact.external_id,
            notes: contact.notes,
            contact: {
              name: contact.contact && contact.contact.name,
              phone: contact.contact && contact.contact.phone
            }
          };
          $scope.contactId = contact._id;
        } else {
          $scope.contact = {
            type: 'district_hospital'
          };
          $scope.contactId = null;
        }
        var options = {
          startkey: [ 'district' ],
          endkey: [ 'health_center', {} ],
          reduce: false,
          include_docs: true
        };
        DbView('facilities_by_type', options, function(err, results) {
          if (err) {
            return console.log('Error fetching parents', err);
          }
          $scope.parents = {
            district_hospital: [],
            health_center: []
          };
          results.forEach(function(row) {
            $scope.parents[row.type].push(row);
          });
          $('#edit-contact').modal('show');
        });
      });
      
      var validate = function(callback) {
        $scope.errors = {};

        Settings(function(err, settings) {
          if (err) {
            return callback(err);
          }

          if (!$scope.contact.name) {
            $scope.errors.name = translateFilter('field is required', {
              field: translateFilter('Name')
            });
          }

          var phone = $scope.contact && $scope.contact.contact && $scope.contact.contact.phone;
          if (phone) {
            if (!libphonenumber.validate(settings, phone)) {
              $scope.errors.phone = translateFilter('Phone number not valid');
            } else {
              $scope.contact.contact.phone = libphonenumber.format(settings, phone);
            }
          }

          if ($scope.contact.type === 'health_center' &&
              (!$scope.contact.parent || $scope.contact.parent.type !== 'district_hospital')) {
            $scope.errors.district_hospital = translateFilter('field is required', {
              field: translateFilter('District Hospital')
            });
          }
          if ($scope.contact.type === 'clinic' &&
              (!$scope.contact.parent || $scope.contact.parent.type !== 'health_center')) {
            $scope.errors.health_center = translateFilter('field is required', {
              field: translateFilter('Health Center')
            });
          }
          if ($scope.contact.type === 'district_hospital') {
            // districts are orphans
            $scope.contact.parent = null;
          }

          callback(null, !Object.keys($scope.errors).length);
        });
      };

      $scope.save = function() {
        validate(function(err, valid) {
          var pane;
          if (err) {
            pane = modal.start($('#edit-contact'));
            return pane.done(translateFilter('Error updating contact'), err);
          }
          if (valid) {
            pane = modal.start($('#edit-contact'));
            UpdateContact($scope.contactId, $scope.contact, function(err, contact) {
              if (!err) {
                $scope.contact = null;
                $scope.contactId = null;
                $rootScope.$broadcast('ContactUpdated', contact);
              }
              pane.done(translateFilter('Error updating contact'), err);
            });

          }
        });
      };

    }
  ]);

}());