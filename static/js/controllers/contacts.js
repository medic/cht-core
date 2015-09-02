var _ = require('underscore'),
    scrollLoader = require('../modules/scroll-loader');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsCtrl', 
    ['$rootScope', '$scope', '$state', '$timeout', 'DB', 'Search',
    function ($rootScope, $scope, $state, $timeout, DB, Search) {

      $scope.filterModel.type = 'contacts';
      $scope.contacts = [];
      $scope.selected = null;

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
          options.skip = $scope.items.length;
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
            $scope.items.push.apply($scope.items, data);
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
            } else if (!options.stay && !$('#back').is(':visible')) {
              // wait for selected to be set before checking
              $timeout(function() {
                if (!$scope.selected) {
                  var id = $('.inbox-items li').first().attr('data-record-id');
                  $state.go('contacts.detail', { id: id });
                }
              });
            }
          }
        });
      };

      var getContact = function(id) {
        return DB.get().get(id);
      };

      var getChildren = function(id) {
        var options = {
          startkey: [ id ],
          endkey: [ id, {} ],
          include_docs: true
        };
        return DB.get().query('medic/facility_by_parent', options);
      };

      var getContactFor = function(id) {
        var options = {
          key: [ id ],
          include_docs: true
        };
        return DB.get().query('medic/facilities_by_contact', options);
      };

      $scope.selectContact = function(id) {
        $scope.setLoadingContent(id);
        Promise.all([ getContact(id), getChildren(id), getContactFor(id) ])
          .then(function(results) {
            var doc = results[0];
            doc.children = results[1].rows;
            doc.contactFor = results[2].rows;
            var refreshing = ($scope.selected && $scope.selected._id) === id;
            $scope.selected = doc;
            $scope.setActionBar({
              _id: doc._id,
              sendTo: doc
            });
            $scope.settingSelected(refreshing);
          })
          .catch(function(err) {
            $scope.clearSelected();
            console.log('Error fetching doc', err);
          });
      };

      $scope.$on('ClearSelected', function() {
        $scope.selected = null;
      });

      $scope.$on('query', function() {
        $scope.query();
      });

      $scope.$on('EditContact', function(e, record) {
        $rootScope.$broadcast('EditContactInit', record || $scope.selected);
      });

      $scope.$on('ContactUpdated', function(e, contact) {
        if (!contact) {
          return $scope.query();
        } else if (contact._deleted) {
          $scope.removeContact(contact);
          return;
        }
        $state.go('contacts.detail', { id: contact._id });
        var outdated = _.findWhere($scope.items, { _id: contact._id });
        if (!outdated) {
          return $scope.query({ stay: true });
        }
        _.extend(outdated, contact);
      });
    }
  ]);

}());
