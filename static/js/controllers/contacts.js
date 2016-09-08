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
      CONTACT_TYPES,
      DB,
      LiveList,
      Search,
      SearchFilters,
      UserSettings,
      XmlForms
    ) {

      'ngInject';

      var liveList = LiveList.contacts;

      $scope.selected = null;
      $scope.filters = {};
      var defaultTypeFilter = {};

      // The type of the children of the user's facility.
      var getUserFacilityId = function() {
        return UserSettings()
          .then(function(u) {
            return u.facility_id;
          });
      };
      var getUserChildPlaceType = function(facility_id) {
        return DB().get(facility_id)
          .then(function(facility) {
            return ContactSchema.getChildPlaceType(facility.type);
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

        $q.all([
          Search('contacts', actualFilter, options),
          UserSettings()
        ])
          .then(function(results) {
            var data = results[0];
            $scope.moreItems = liveList.moreItems = data.length >= options.limit;

            var user = results[1];
            data.forEach(function(contact) {
              if (contact._id === user.facility_id) {
                contact.home = true;
              }
            });

            if (options.skip) {
              $timeout(function() {
                data.forEach(function(contact) {
                  liveList.insert(contact, false);
                });
                liveList.refresh();
                completeLoad();
              })
              .then(completeLoad);
            } else if (options.silent) {
              data.forEach(liveList.update);
              completeLoad();
            } else {
              $timeout(function() {
                liveList.set(data);
                _initScroll();
                if (!data.length) {
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
        $scope.setTitle(selected.doc.name);
        $scope.clearCancelTarget();
        var selectedDoc = selected.doc;
        return getActionBarDataForChild(selectedDoc.type)
          .then(function(data) {
            if (data) {
              selectedDoc.child = data;
            }
            XmlForms('ContactsCtrl', { doc: selectedDoc }, function(err, forms) {
              if (err) {
                return $log.error('Error fetching relevant forms', err);
              }
              $scope.setRightActionBar({
                selected: [ selectedDoc ],
                relevantForms: forms,
                sendTo: selectedDoc.type === 'person' ? selectedDoc : '',
                disableDelete: (selected.children && selected.children.length) ||
                               (selected.contactFor && selected.contactFor.length)
              });
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

      var setupPromise = getUserFacilityId()
        .then(function(facility_id) {
          var actionBarData = { userFacilityId: facility_id };
          return facility_id && getUserChildPlaceType(facility_id)
              .then(function(type) {
                defaultTypeFilter = { types: { selected: [type] }};
                actionBarData.userChildPlace =
                  {
                    type: type,
                    icon: (ContactSchema.get(type) ? ContactSchema.get(type).icon : '')
                  };
                return $translate(ContactSchema.get(type).addButtonLabel);
              }).then(function(label) {
                actionBarData.addPlaceLabel = label;
                $scope.setLeftActionBar(actionBarData);
              });
        }).then(function() {
          $scope.search();
        });
      this.getSetupPromiseForTesting = function() { return setupPromise; };

      $scope.$on('$stateChangeStart', function(event, toState) {
        if (toState.name.indexOf('contacts') === -1) {
          $scope.resetSelected();
        }
      });

    }
  );

}());
