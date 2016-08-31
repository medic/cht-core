var _ = require('underscore'),
    scrollLoader = require('../modules/scroll-loader');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsCtrl',
    function (
      $log,
      $q,
      $scope,
      $state,
      $timeout,
      DB,
      LiveList,
      Search,
      SearchFilters,
      UserSettings
    ) {

      'ngInject';

      var liveList = LiveList.contacts;

      $scope.selected = null;
      $scope.filters = {};

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

        $q.all([
          Search('contacts', $scope.filters, options),
          UserSettings()
        ])
          .then(function(results) {
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
          })
          .catch(function(err) {
            $scope.error = true;
            $scope.loading = false;
            $scope.appending = false;
            $log.error('Error searching for contacts', err);
          });
      };

      $scope.setSelected = function(selected) {
        liveList.setSelected(selected.doc._id);
        $scope.selected = selected;
        $scope.setTitle(selected.doc.name);
        $scope.clearCancelTarget();
        $scope.setActionBar({
          selected: [ selected.doc ],
          sendTo: selected.doc,
          disableDelete: (selected.children && selected.children.length) ||
                         (selected.contactFor && selected.contactFor.length)
        });
      };

      $scope.$on('ClearSelected', function() {
        $scope.selected = null;
        LiveList.contacts.clearSelected();
        LiveList['contact-search'].clearSelected();
      });

      $scope.search = function() {
        $scope.loading = true;
        if ($scope.filters.search) {
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
      };

      $scope.setupSearchFreetext = function() {
        SearchFilters.freetext($scope.search);
      };
      $scope.resetFilterModel = function() {
        $scope.filters = {};
        SearchFilters.reset();
        $scope.search();
      };

      $scope.search();

      $scope.$on('$destroy', function() {
        if (!$state.includes('contacts')) {
          $scope.setTitle();
          $scope.clearSelected();
        }
      });

    }
  );

}());
