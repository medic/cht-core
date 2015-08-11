var _ = require('underscore'),
    scrollLoader = require('../modules/scroll-loader');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsCtrl', 
    ['$scope', '$state', '$timeout', 'DB', 'Search',
    function ($scope, $state, $timeout, DB, Search) {

      $scope.filterModel.type = 'contacts';
      $scope.setContacts();

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
            $scope.setContacts(data);
            scrollLoader.init(function() {
              if (!$scope.loading && $scope.moreItems) {
                $timeout(function() {
                  $scope.query({ skip: true });
                });
              }
            });
            if (!data.length) {
              $scope.selectContact();
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
        if (id) {
          $scope.setLoadingContent(id);
          Promise.all([ getContact(id), getChildren(id), getContactFor(id) ])
            .then(function(results) {
              var doc = results[0];
              doc.children = results[1].rows;
              doc.contactFor = results[2].rows;
              $scope.setSelected(doc);
            })
            .catch(function(err) {
              $scope.setSelected();
              console.log('Error fetching doc', err);
            });
        } else {
          $scope.setSelected();
        }
      };

      $scope.$on('query', function() {
        $scope.query();
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
