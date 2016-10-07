var scrollLoader = require('../modules/scroll-loader');

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
      $translate,
      ContactSchema,
      DB,
      Layout,
      LiveList,
      Search,
      SearchFilters,
      Session,
      UserSettings,
      XmlForms
    ) {

      'ngInject';

      var liveList = LiveList.contacts;

      $scope.selected = null;
      $scope.filters = {};
      var defaultTypeFilter = {};
      var usersHomePlace;

      // The type of the children of the user's facility.
      var getUserFacilityId = function() {
        return UserSettings()
          .then(function(u) {
            return u.facility_id;
          });
      };
      var getUserHomePlaceSummary = function() {
        return getUserFacilityId().then(function(facilityId) {
          return facilityId && DB().query('medic-client/doc_summaries_by_id', {
            key: [facilityId]
          }).then(function(results) {
              var summary = results &&
                            results.rows &&
                            results.rows.length &&
                            results.rows[0].value;

              if (summary) {
                summary._id = facilityId;
                summary.home = true;
                return summary;
              }
          });
        });
      };

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

        var actualFilter = $scope.filters.search ? $scope.filters : defaultTypeFilter;

        Search('contacts', actualFilter, options).then(function(searchResults) {
          // If you have a home place make sure its at the top
          var contacts = usersHomePlace && !$scope.appending ?
            [usersHomePlace].concat(searchResults.filter(function(contact) {
              return contact._id !== usersHomePlace._id;
            })) : searchResults;

          $scope.moreItems = liveList.moreItems = contacts.length >= options.limit;

          if (options.skip) {
            $timeout(function() {
              contacts.forEach(function(contact) {
                liveList.insert(contact, false);
              });
              liveList.refresh();
              completeLoad();
            })
            .then(completeLoad);
          } else if (options.silent) {
            contacts.forEach(liveList.update);
            completeLoad();
          } else {
            $timeout(function() {
              liveList.set(contacts);
              _initScroll();
              if (!contacts.length) {
                $scope.clearSelected();
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

      var getActionBarDataForChild = function(docType) {
        var selectedChildPlaceType = ContactSchema.getChildPlaceType(docType);
        if (!selectedChildPlaceType) {
          return $q.resolve();
        }
        var child = {
          type: selectedChildPlaceType,
          icon: selectedChildPlaceType ? ContactSchema.get(selectedChildPlaceType).icon : ''
        };
        return $translate(ContactSchema.get(selectedChildPlaceType).addButtonLabel)
          .then(function(label) {
            child.addPlaceLabel = label;
            return child;
          });
      };

      $scope.setSelected = function(selected) {
        liveList.setSelected(selected.doc._id);
        $scope.selected = selected;
        Layout.setTitle($scope, selected.doc.name);
        $scope.clearCancelTarget();
        var selectedDoc = selected.doc;
        return getActionBarDataForChild(selectedDoc.type)
          .then(function(data) {
            if (data) {
              selectedDoc.child = data;
            }
            var actionBarData = {
              selected: [ selectedDoc ],
              sendTo: selectedDoc.type === 'person' ? selectedDoc : '',
              disableDelete: (selected.children && selected.children.length) ||
                             (selected.contactFor && selected.contactFor.length)
            };
            XmlForms('ContactsCtrl', { doc: selectedDoc }, function(err, forms) {
              if (err) {
                $log.error('Error fetching relevant forms', err);
              } else {
                actionBarData.relevantForms = forms;
              }
              Layout.setRightActionBar($scope, actionBarData);
            });
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
          _query();
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

      var setupPromise = getUserHomePlaceSummary()
        .then(function(summary) {
          if (summary) {
            var type = ContactSchema.getChildPlaceType(summary.type);

            usersHomePlace = summary;
            defaultTypeFilter = { types: { selected: [type] }};

            var actionBarData = {
              userFacilityId: summary._id,
              userChildPlace: {
                type: type,
                icon: (ContactSchema.get(type) ? ContactSchema.get(type).icon : '')
              }
            };

            return $translate(ContactSchema.get(type).addButtonLabel)
              .then(function(label) {
                actionBarData.addPlaceLabel = label;
                Layout.setLeftActionBar($scope, actionBarData);
              });
          } else {
            if (Session.isAdmin()) {
              defaultTypeFilter = { types: { selected: ['district_hospital'] }};
            }
          }
        }).then(function() {
          $scope.search();
        });

      this.getSetupPromiseForTesting = function() { return setupPromise; };

      $scope.$on('$stateChangeStart', function(event, toState) {
        if (toState.name.indexOf('contacts') === -1) {
          $scope.unsetSelected();
        }
      });
    }
  );
}());
