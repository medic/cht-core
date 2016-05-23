var _ = require('underscore'),
    scrollLoader = require('../modules/scroll-loader'),
    ajaxDownload = require('../modules/ajax-download');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsCtrl',
    function (
      $http,
      $log,
      $q,
      $scope,
      $state,
      $timeout,
      DB,
      DownloadUrl,
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

      var getUserSettings = function() {
        return $q(function(resolve, reject) {
          UserSettings(function(err, user) {
            if (err) {
              return reject(err);
            }
            resolve(user);
          });
        });
      };

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
          getUserSettings()
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
            $log.error('Error searching for contacts', err);
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

      $scope.search = function() {
        $scope.loading = true;
        if ($scope.filters.search ||
            ($scope.filters.facilities && $scope.filters.facilities.selected && $scope.filters.facilities.selected.length) ||
            ($scope.filters.types && $scope.filters.types.selected && $scope.filters.types.selected.length)
           ) {
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
      $scope.setupSearchFacility = function() {
        SearchFilters.facility(function(facilities) {
          $scope.filters.facilities = facilities;
          $scope.search();
        });
      };
      $scope.setupSearchContactType = function() {
        SearchFilters.contactType(function(types) {
          $scope.filters.types = types;
          $scope.search();
        });
      };
      $scope.resetFilterModel = function() {
        $scope.filters = {};
        SearchFilters.reset();
        $scope.search();
      };

      $scope.search();

      $scope.$on('export', function() {
        if ($scope.currentTab === 'contacts') {
          DownloadUrl($scope.filters, 'contacts', function(err, url) {
            if (err) {
              return $log.error(err);
            }
            $http.post(url)
              .then(ajaxDownload.download)
              .catch(function(err) {
                $log.error('Error downloading', err);
              });
          });
        }
      });

      $scope.$on('$destroy', function() {
        if (!$state.includes('contacts')) {
          $scope.setTitle();
          $scope.clearSelected();
        }
      });

    }
  );

}());
