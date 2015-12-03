var _ = require('underscore'),
    scrollLoader = require('../modules/scroll-loader'),
    async = require('async'),
    types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsCtrl', 
    ['$log', '$rootScope', '$scope', '$state', '$timeout', 'Changes', 'UserSettings', 'Search',
    function ($log, $rootScope, $scope, $state, $timeout, Changes, UserSettings, Search) {

      $scope.filterModel.type = 'contacts';
      $scope.contacts = [];
      $scope.selected = null;

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

        if (options.skip) {
          options.skip = $scope.contacts.length;
        }
        // curry the Search service so async.parallel can provide the
        // callback as the final callback argument
        var contactSearch = _.partial(Search, $scope, options);
        async.parallel([ contactSearch, UserSettings ], function(err, results) {
          $scope.loading = false;
          $scope.appending = false;
          if (err) {
            $scope.error = true;
            return $log.error('Error searching for contacts', err);
          }
          var data = results[0];
          $scope.moreItems = data.length >= options.limit;
          var user = results[1];
          $scope.userDistrict = user.facility_id;
          $scope.userContact = user.contact_id;
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
            $timeout(function() {
              $scope.contacts = data;
              scrollLoader.init(function() {
                if (!$scope.loading && $scope.moreItems) {
                  $scope.query({ skip: true });
                }
              });
              if (!data.length) {
                $scope.clearSelected();
              } else if (!options.stay &&
                         !$scope.isMobile() &&
                         $state.is('contacts.detail') &&
                         !$state.params.id) {
                // wait for selected to be set before checking
                $timeout(function() {
                  var id = $('.inbox-items li').first().attr('data-record-id');
                  $state.go('contacts.detail', { id: id }, { location: 'replace' });
                });
              }
            });
          }
        });
      };

      $scope.setSelected = function(selected) {
        $scope.selected = selected;
        $scope.setTitle(selected.doc.name);
        $scope.clearCancelTarget();
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
