var _ = require('underscore'),
    scrollLoader = require('../modules/scroll-loader'),
    async = require('async');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsCtrl',
    ['$log', '$scope', '$state', '$timeout', 'DB', 'LiveList', 'UserSettings', 'Search',
    function ($log, $scope, $state, $timeout, DB, LiveList, UserSettings, Search) {

      var liveList = LiveList.contacts;

      $scope.filterModel.type = 'contacts';
      $scope.selected = null;

      function completeLoad() {
        $scope.loading = false;
        $scope.appending = false;
        $scope.hasContacts = liveList.count() > 0;
      }

      function _initScroll() {
        scrollLoader.init(function() {
          if (!$scope.loading && $scope.moreItems) {
            _query({ skip: true });
          }
        });
      }

      var _query = function(options) {
        options = options || {};
        options.limit = 50;

        if (!options.silent) {
          $scope.loading = true;
          $scope.appending = options.skip;
          $scope.error = false;
        }

        if (options.skip) {
          options.skip = liveList.count();
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
          $scope.moreItems = liveList.moreItems = data.length >= options.limit;

          // filter special contacts which should not be displayed
          var user = results[1];
          data = _.reject(data, function(contact) {
            return contact._id === user.facility_id ||
                contact._id === user.contact_id;
          });

          if (options.skip) {
            $timeout(function() {
              _.each(data, function(contact) {
                liveList.insert(contact, false);
              });
              liveList.refresh();
              completeLoad();
            })
            .then(completeLoad);
          } else if (options.silent) {
            _.each(data, liveList.update);
            completeLoad();
          } else {
            $timeout(function() {
              liveList.set(data);
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
        liveList.setSelected(selected.doc._id);
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

      $scope.$on('ClearSelected', function() {
        $scope.selected = null;
      });

      $scope.$on('query', function() {
        if ($scope.filterModel.type !== 'contacts') {
          liveList.clearSelected();
          LiveList['contact-search'].set([]);
          return;
        }

        $scope.loading = true;

        if (($scope.filterQuery && $scope.filterQuery.value) ||
            ($scope.filterModel && (
              ($scope.filterModel.contactTypes && $scope.filterModel.contactTypes.length) ||
              $scope.filterModel.facilities.length))) {
          $scope.filtered = true;

          liveList = LiveList['contact-search'];
          liveList.set([]);

          _query();
        } else {
          $scope.filtered = false;
          liveList = LiveList.contacts;

          if (liveList.initialised()) {
            $timeout(function() {
              $scope.loading = false;
              $scope.hasContacts = liveList.count() > 0;
              liveList.refresh();
              $scope.moreItems = liveList.moreItems;
              _initScroll();
            });
          } else {
            _query();
          }
        }
      });

      $scope.$on('$destroy', function() {
        $scope.setTitle();
        $scope.clearSelected();
      });

    }
  ]);

}());
