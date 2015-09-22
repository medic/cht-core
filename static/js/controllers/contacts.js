var _ = require('underscore'),
    scrollLoader = require('../modules/scroll-loader');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsCtrl', 
    ['$rootScope', '$scope', '$state', '$timeout', 'ContactSchema', 'DB', 'Search',
    function ($rootScope, $scope, $state, $timeout, ContactSchema, DB, Search) {

      $scope.filterModel.type = 'contacts';
      $scope.contacts = [];
      $scope.selected = null;

      $scope.titleFor = function(doc) {
        if(!doc) {
          return '';
        }
        var titleFormat = $scope.schema[doc.type].title;
        return titleFormat.replace(/\{\{([^}]+)\}\}/g, function(all, name) {
          return doc[name];
        });
      };

      $scope.schema = ContactSchema.get();
      $scope.schemaNormalFields = ContactSchema.get();
      // remove special fields with custom display
      _.each($scope.schemaNormalFields, function(schema) {
        // Remove fields included in the title, so they are not duplicated below
        // it in the form
        _.map(schema.title.match(/\{\{[^}]+\}\}/g), function(key) {
          return key.substring(2, key.length-2);
        }).forEach(function(key) {
          delete schema.fields[key];
        });
        delete schema.fields.parent;
      });

      $scope.selectedSchema = function() {
        return $scope.selected && $scope.schema[$scope.selected.type];
      };

      $scope.selectedSchemaNormalFields = function() {
        return $scope.selected && $scope.schemaNormalFields[$scope.selected.type].fields;
      };

      $scope.query = function(options) {
        options = options || {};
        options.limit = 50;

        $scope.loading = true;
        $scope.appending = options.skip;
        $scope.error = false;

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
            } else if (!$state.params.id &&
                       !options.stay &&
                       !$('#back').is(':visible') &&
                       $scope.filterModel.type === 'contacts') {
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
        $scope.setActionBar({
          _id: selected.doc._id,
          sendTo: selected.doc
        });
      };

      $scope.orderByType = function(contact) {
        var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
        return types.indexOf(contact.type);
      };

      $scope.$on('ClearSelected', function() {
        $scope.selected = null;
      });

      $scope.$on('query', function() {
        $scope.query();
      });

      $scope.$on('EditContact', function(e, record) {
        $rootScope.$broadcast('EditContactInit', record || $scope.selected.doc);
      });

      $scope.$on('ContactUpdated', function(e, contact) {
        if (!contact) {
          return $scope.query();
        } else if (contact._deleted) {
          $scope.contacts = _.filter($scope.contacts, function(i) {
            return i._id !== contact._id;
          });
          return;
        }
        $state.go('contacts.detail', { id: contact._id });
        var outdated = _.findWhere($scope.contacts, { _id: contact._id });
        if (!outdated) {
          return $scope.query({ stay: true });
        }
        _.extend(outdated, contact);
      });
    }
  ]);

}());
