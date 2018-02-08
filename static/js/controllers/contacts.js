var _ = require('underscore'),
    scrollLoader = require('../modules/scroll-loader');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsCtrl',
    function (
      $element,
      $log,
      $q,
      $scope,
      $state,
      $stateParams,
      $timeout,
      $translate,
      Changes,
      ContactSchema,
      ContactSummary,
      Export,
      GetDataRecords,
      LiveList,
      Search,
      SearchFilters,
      Session,
      Simprints,
      Tour,
      TranslateFrom,
      UserSettings,
      XmlForms
    ) {

      'ngInject';

      var liveList = LiveList.contacts;

      $scope.loading = true;
      $scope.selected = null;
      $scope.filters = {};
      var defaultTypeFilter = {};
      var usersHomePlace;

      var getUserHomePlaceSummary = function() {
        return UserSettings()
          .then(function(userSettings) {
            if (userSettings.facility_id) {
              return GetDataRecords(userSettings.facility_id);
            }
          })
          .then(function(summary) {
            if (summary) {
              summary.home = true;
            }
            return summary;
          });
      };

      var _initScroll = function() {
        scrollLoader.init(function() {
          if (!$scope.loading && $scope.moreItems) {
            _query({ skip: true });
          }
        });
      };

      var _query = function(options) {
        options = options || {};
        options.limit = options.limit || 50;

        if (!options.silent) {
          $scope.loading = true;
          $scope.error = false;
        }

        if (options.skip) {
          $scope.appending = true;
          options.skip = liveList.count();
        } else if (!options.silent) {
          liveList.set([]);
        }

        var actualFilter = defaultTypeFilter;
        if ($scope.filters.search || $scope.filters.simprintsIdentities) {
          actualFilter = $scope.filters;
        }

        Search('contacts', actualFilter, options).then(function(contacts) {
          // If you have a home place make sure its at the top
          if (usersHomePlace && !$scope.appending) {
            var homeIndex = _.findIndex(contacts, function(contact) {
              return contact._id === usersHomePlace._id;
            });
            if (homeIndex !== -1) {
              // move it to the top
              contacts.splice(homeIndex, 1);
              contacts.unshift(usersHomePlace);
            } else if (!$scope.filters.search && !$scope.filters.simprintsIdentities) {
              contacts.unshift(usersHomePlace);
            }
            if ($scope.filters.simprintsIdentities) {
              contacts.forEach(function(contact) {
                var identity = $scope.filters.simprintsIdentities.find(function(identity) {
                  return identity.id === contact.simprints_id;
                });
                contact.simprints = identity || { confidence: 0, tierNumber: 5 };
              });
            }
          }

          $scope.moreItems = liveList.moreItems = contacts.length >= options.limit;

          contacts.forEach(liveList.update);
          liveList.refresh();
          _initScroll();
          $scope.loading = false;
          $scope.appending = false;
          $scope.hasContacts = liveList.count() > 0;
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
        var schema = ContactSchema.get(selectedChildPlaceType);
        return {
          addPlaceLabel: schema.addButtonLabel,
          type: selectedChildPlaceType,
          icon: schema ? schema.icon : ''
        };
      };

      // only admins can edit their own place
      var getCanEdit = function(selectedDoc) {
        return setupPromise
          .then(function() {
            return Session.isAdmin() || (usersHomePlace._id !== selectedDoc._id);
          })
          .catch(function() {
            return false;
          });
      };

      var translateTitle = function(key, label) {
        return key ? $translate.instant(key) : TranslateFrom(label);
      };

      $scope.setSelected = function(selected) {
        liveList.setSelected(selected.doc._id);
        $scope.selected = selected;
        $scope.clearCancelTarget();
        var selectedDoc = selected.doc;
        var title = '';
        if (selected.doc.type === 'person') {
          title = 'contact.profile';
        } else {
          title = ContactSchema.get(selected.doc.type).label;
        }
        return $q.all([
          $translate(title),
          getActionBarDataForChild(selectedDoc.type),
          getCanEdit(selectedDoc),
          ContactSummary(selected.doc, selected.reports, selected.lineage)
        ])
          .then(function(results) {
            $scope.setTitle(results[0]);
            if (results[1]) {
              selectedDoc.child = results[1];
            }
            var canEdit = results[2];
            var summary = results[3];
            $scope.selected.summary = summary;
            var options = { doc: selectedDoc, contactSummary: summary.context };
            XmlForms('ContactsCtrl', options, function(err, forms) {
              if (err) {
                $log.error('Error fetching relevant forms', err);
              }
              var formSummaries = forms && forms.map(function(xForm) {
                return {
                  code: xForm.internalId,
                  title: translateTitle(xForm.translation_key, xForm.title),
                  icon: xForm.icon
                };
              });
              var canDelete = !selected.children || (
                                (!selected.children.places  || selected.children.places.length === 0) &&
                                (!selected.children.persons || selected.children.persons.length === 0)
                              );
              $scope.setRightActionBar({
                selected: [ selectedDoc ],
                relevantForms: formSummaries,
                sendTo: selectedDoc.type === 'person' ? selectedDoc : '',
                canEdit: canEdit,
                canDelete: canDelete
              });
            });
          })
          .catch(function(e) {
            $log.error('Error setting selected contact');
            $log.error(e);
          });
      };

      $scope.$on('ClearSelected', function() {
        $scope.selected = null;
        LiveList.contacts.clearSelected();
        LiveList['contact-search'].clearSelected();
      });

      $scope.search = function() {
        $scope.loading = true;
        if ($scope.filters.search || $scope.filters.simprintsIdentities) {
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

      $scope.simprintsEnabled = Simprints.enabled();
      $scope.simprintsIdentify = function() {
        $scope.loading = true;
        Simprints.identify().then(function(identities) {
          $scope.filters.simprintsIdentities = identities;
          $scope.search();
        });
      };

      var setActionBarData = function() {
        var data = {
          userFacilityId: usersHomePlace && usersHomePlace._id,
          exportFn: function() {
            Export($scope.filters, 'contacts');
          }
        };
        var type;
        if (usersHomePlace) {
          type = ContactSchema.getChildPlaceType(usersHomePlace.type);
        } else if (Session.isAdmin()) {
          type = ContactSchema.getPlaceTypes()[0];
        }
        if (type) {
          defaultTypeFilter = { types: { selected: [ type ] }};
          var schema = ContactSchema.get(type);
          data.addPlaceLabel = schema.addButtonLabel;
          data.userChildPlace = {
            type: type,
            icon: schema ? schema.icon : ''
          };
        }
        $scope.setLeftActionBar(data);
      };

      var setupPromise = getUserHomePlaceSummary().then(function(home) {
        usersHomePlace = home;
        setActionBarData();
        return $scope.search();
      });

      this.getSetupPromiseForTesting = function() { return setupPromise; };

      $scope.$on('$stateChangeStart', function(event, toState) {
        if (toState.name.indexOf('contacts') === -1) {
          $scope.unsetSelected();
        }
      });

      var changeListener = Changes({
        key: 'contacts-list',
        callback: function() {
          _query({ limit: liveList.count(), silent: true });
        },
        filter: function(change) {
          return ContactSchema.getTypes().indexOf(change.doc.type) !== -1;
        }
      });

      $scope.$on('$destroy', changeListener.unsubscribe);

      if ($stateParams.tour) {
        Tour.start($stateParams.tour);
      }
    }
  );
}());
