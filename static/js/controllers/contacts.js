var _ = require('underscore'),
    scrollLoader = require('../modules/scroll-loader'),
    types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsCtrl', 
    ['$rootScope', '$scope', '$state', '$timeout', 'ContactSchema', 'Search', 'Changes',
    function ($rootScope, $scope, $state, $timeout, ContactSchema, Search, Changes) {

      $scope.filterModel.type = 'contacts';
      $scope.contacts = [];
      $scope.selected = null;

      $scope.schema = ContactSchema.get();
      $scope.schemaVisible = ContactSchema.getVisibleFields();

      $scope.selectedSchema = function() {
        return $scope.selected && $scope.schema[$scope.selected.doc.type];
      };

      $scope.selectedSchemaVisibleFields = function() {
        return $scope.selected && $scope.schemaVisible[$scope.selected.doc.type].fields;
      };

      var _merge = function(to, from) {
        if (from._rev !== to._rev) {
          for (var prop in from) {
            if (from.hasOwnProperty(prop)) {
              to[prop] = from[prop];
            }
          }
        }
      };

      function removeDeletedContact(id) {
        var idx = _.findIndex($scope.contacts, function(doc) {
          return doc._id === id;
        });
        if (idx !== -1) {
          $scope.contacts.splice(idx, 1);
        }
      }

      $scope.query = function(options) {
        options = options || {};
        options.limit = 50;

        if (!options.silent) {
          $scope.loading = true;
          $scope.appending = options.skip;
          $scope.error = false;
        }

        _.defaults(options, {
          index: 'contacts',
          sort: 'name_sorting'
        });

        if (options.skip) {
          options.skip = $scope.contacts.length;
        }
        Search($scope, options, function(err, data) {
          $scope.loading = false;
          $scope.appending = false;
          if (err) {
            $scope.error = true;
            return console.log('Error searching for contacts', err);
          }
          $scope.moreItems = data.length >= options.limit;
          if (options.skip) {
            $timeout(function() {
              $scope.contacts.push.apply($scope.contacts, data);
            });
          } else if (options.silent) {
            _.each(data, function(update) {
              var existing = _.findWhere($scope.contacts, { _id: update._id });
              if (existing) {
                _merge(existing, update);
              } else {
                $scope.contacts.push(update);
              }
            });
          } else {
            $scope.contacts = data;
            scrollLoader.init(function() {
              if (!$scope.loading && $scope.moreItems) {
                $timeout(function() {
                  $scope.query({ skip: true });
                });
              }
            });
            if (!data.length) {
              $scope.clearSelected();
            } else if (!options.stay &&
                       !$('#back').is(':visible') &&
                       $state.is('contacts.detail')) {
              // wait for selected to be set before checking
              $timeout(function() {
                var id = $('.inbox-items li').first().attr('data-record-id');
                $state.go('contacts.detail', { id: id }, { location: 'replace' });
              });
            }
          }
        });
      };

      $scope.setSelected = function(selected) {
        $scope.selected = selected;
        $scope.setTitle(selected.doc.name);
        $scope.showBackButton();
        $scope.setActionBar({
          _id: selected.doc._id,
          sendTo: selected.doc,
          disableDelete: (selected.children && selected.children.length) ||
                         (selected.contactFor && selected.contactFor.length)
        });
      };

      $scope.orderByType = function(contact) {
        return types.indexOf(contact.type);
      };

      $scope.$on('ClearSelected', function() {
        $scope.selected = null;
      });

      $scope.$on('query', function() {
        $scope.query();
      });

      Changes({
        key: 'contacts-list',
        callback: function(change) {
          if(change.deleted) {
            removeDeletedContact(change.id);
          } else {
            $scope.query({ silent: true, stay: true });
          }
        },
        filter: function(change) {
          if ($scope.filterModel.type !== 'contacts') {
            return false;
          }
          if (change.newDoc) {
            return types.indexOf(change.newDoc.type) !== -1;
          }
          return _.findWhere($scope.contacts, { _id: change.id });
        }
      });

    }
  ]);

}());
