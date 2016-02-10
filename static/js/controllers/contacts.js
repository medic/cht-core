var _ = require('underscore'),
    scrollLoader = require('../modules/scroll-loader'),
    async = require('async'),
    types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsCtrl',
    ['$log', '$scope', '$state', '$timeout', 'DB', 'LiveList', 'UserSettings', 'Search',
    function ($log, $scope, $state, $timeout, DB, LiveList, UserSettings, Search) {

      $scope.filterModel.type = 'contacts';
      $scope.selected = null;

      function completeLoad() {
        $scope.loading = false;
        $scope.appending = false;
      }

      function _initScroll() {
        scrollLoader.init(function() {
          // FIXME this does not show loader after revisiting the tab
          if (!$scope.loading && $scope.moreItems) {
            $scope.query({ skip: true });
          }
        });
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
          options.skip = LiveList.contacts.count();
        }
        // curry the Search service so async.parallel can provide the
        // callback as the final callback argument
        var contactSearch = _.partial(Search, $scope, options);
        async.parallel([ contactSearch, UserSettings ], function(err, results) {
          if (err) {
            $scope.error = true;
            return $log.error('Error searching for contacts', err);
          }

          var data = results[0];
          $scope.moreItems = LiveList.contacts.moreItems = data.length >= options.limit;
          var user = results[1];
          $scope.userDistrict = user.facility_id;
          $scope.userContact = user.contact_id;
          if (options.skip) {
            $timeout(function() {
              $scope.contacts = data.length > 0;
              _.each(data, LiveList.contacts.insert);
            })
            .then(completeLoad);
          } else if (options.silent) {
            _.each(data, LiveList.contacts.update);
            completeLoad();
          } else {
            $timeout(function() {
              LiveList.contacts.set(data);
              _initScroll();
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
            })
            .then(completeLoad);
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
        if ($scope.filterModel.type !== 'contacts') {
          return;
        }
        $scope.loading = true;
        if (LiveList.contacts.initialised()) {
          $timeout(function() {
            $scope.loading = false;
            LiveList.contacts.refresh();
            $scope.moreItems = LiveList.contacts.moreItems;
            _initScroll();
          });
        } else {
          $scope.query();
        }
      });

    }
  ]);

}());
