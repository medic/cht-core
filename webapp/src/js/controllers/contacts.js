var _ = require('underscore'),
  scrollLoader = require('../modules/scroll-loader');

(function() {
  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsCtrl', function(
    $element,
    $log,
    $q,
    $scope,
    $state,
    $stateParams,
    $timeout,
    $translate,
    Auth,
    Changes,
    ContactSchema,
    ContactSummary,
    Export,
    GetDataRecords,
    LiveList,
    Search,
    SearchFilters,
    Session,
    Settings,
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
    var additionalListItem = false;

    $scope.sortDirection = $scope.defaultSortDirection = 'alpha';
    var isSortedByLastVisited = function() {
      return $scope.sortDirection === 'last_visited_date';
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
        additionalListItem = false;
      }

      if (additionalListItem) {
        if (options.skip) {
          options.skip -= 1;
        } else {
          options.limit -= 1;
        }
      }

      var actualFilter = defaultTypeFilter;
      if ($scope.filters.search || $scope.filters.simprintsIdentities) {
        actualFilter = $scope.filters;
      }

      var extensions = {};
      if ($scope.lastVisitedDateExtras) {
        extensions.displayLastVisitedDate = true;
        extensions.visitCountSettings = $scope.visitCountSettings;
      }
      if (isSortedByLastVisited()) {
        extensions.sortByLastVisitedDate = true;
      }

      var docIds;
      if (options.withIds) {
        docIds = liveList.getList().map(function(item) {
          return item._id;
        });
      }

      return Search('contacts', actualFilter, options, extensions, docIds)
        .then(function(contacts) {
          // If you have a home place make sure its at the top
          if (usersHomePlace) {
            var homeIndex = _.findIndex(contacts, function(contact) {
              return contact._id === usersHomePlace._id;
            });

            additionalListItem =
              !$scope.filters.search &&
              !$scope.filters.simprintsIdentities &&
              (additionalListItem || !$scope.appending) &&
              homeIndex === -1;

            if (!$scope.appending) {
              if (homeIndex !== -1) {
                // move it to the top
                contacts.splice(homeIndex, 1);
                contacts.unshift(usersHomePlace);
              } else if (
                !$scope.filters.search &&
                !$scope.filters.simprintsIdentities
              ) {
                contacts.unshift(usersHomePlace);
              }
              if ($scope.filters.simprintsIdentities) {
                contacts.forEach(function(contact) {
                  var identity = $scope.filters.simprintsIdentities.find(
                    function(identity) {
                      return identity.id === contact.simprints_id;
                    }
                  );
                  contact.simprints = identity || {
                    confidence: 0,
                    tierNumber: 5,
                  };
                });
              }
            }
          }

          $scope.moreItems = liveList.moreItems =
            contacts.length >= options.limit;

          contacts.forEach(liveList.update);
          liveList.refresh();
          _initScroll();
          $scope.loading = false;
          $scope.appending = false;
          $scope.hasContacts = liveList.count() > 0;
          setActionBarData();
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
        icon: schema ? schema.icon : '',
      };
    };

    // only admins can edit their own place
    var getCanEdit = function(selectedDoc) {
      return setupPromise
        .then(function() {
          return Session.isAdmin() || usersHomePlace._id !== selectedDoc._id;
        })
        .catch(function() {
          return false;
        });
    };

    var translateTitle = function(key, label) {
      return key ? $translate.instant(key) : TranslateFrom(label);
    };

    var isUnmuteForm = function(settings, formId) {
      return Boolean(settings &&
                     formId &&
                     settings.muting &&
                     settings.muting.unmute_forms &&
                     settings.muting.unmute_forms.includes(formId));
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
      return $q
        .all([
          $translate(title),
          getActionBarDataForChild(selectedDoc.type),
          getCanEdit(selectedDoc),
          ContactSummary(selected.doc, selected.reports, selected.lineage),
          Settings()
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
            var showUnmuteModal = function(formId) {
              return $scope.selected.doc.muted && !isUnmuteForm(results[4], formId);
            };
            var formSummaries =
              forms &&
              forms.map(function(xForm) {
                return {
                  code: xForm.internalId,
                  title: translateTitle(xForm.translation_key, xForm.title),
                  icon: xForm.icon,
                  showUnmuteModal: showUnmuteModal(xForm.internalId)
                };
              });
            var canDelete =
              !selected.children ||
              ((!selected.children.places ||
                selected.children.places.length === 0) &&
                (!selected.children.persons ||
                  selected.children.persons.length === 0));
            $scope.setRightActionBar({
              selected: [selectedDoc],
              relevantForms: formSummaries,
              sendTo: selectedDoc.type === 'person' ? selectedDoc : '',
              canEdit: canEdit,
              canDelete: canDelete,
            });
          });
        })
        .catch(function(e) {
          $log.error('Error setting selected contact');
          $log.error(e);
          $scope.selected.error = true;
          $scope.setRightActionBar();
        });
    };

    $scope.$on('ClearSelected', function() {
      clearSelection();
    });

    const clearSelection = () => {
      $scope.selected = null;
      LiveList.contacts.clearSelected();
      LiveList['contact-search'].clearSelected();
    };

    $scope.search = function() {
      if($scope.filters.search) {
        $state.go('contacts.detail', { id: null }, { notify: false });
        clearSelection();
      }

      $scope.loading = true;
      if ($scope.filters.search || $scope.filters.simprintsIdentities) {
        $scope.filtered = true;
        liveList = LiveList['contact-search'];
        liveList.set([]);
        return _query();
      } else {
        $scope.filtered = false;
        return _query();
      }
    };

    $scope.sort = function(sortDirection) {
      $scope.sortDirection = sortDirection;
      liveList.set([]);
      _query();
    };

    $scope.setupSearchFreetext = function() {
      SearchFilters.freetext($scope.search);
    };
    $scope.resetFilterModel = function() {
      $scope.filters = {};
      $scope.sortDirection = $scope.defaultSortDirection;
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
        hasResults: $scope.hasContacts,
        userFacilityId: usersHomePlace && usersHomePlace._id,
        exportFn: function() {
          Export($scope.filters, 'contacts');
        },
      };
      var type;
      if (usersHomePlace) {
        type = ContactSchema.getChildPlaceType(usersHomePlace.type);
      } else if (Session.isAdmin()) {
        type = ContactSchema.getPlaceTypes()[0];
      }
      if (type) {
        defaultTypeFilter = { types: { selected: [type] } };
        var schema = ContactSchema.get(type);
        data.addPlaceLabel = schema.addButtonLabel;
        data.userChildPlace = {
          type: type,
          icon: schema ? schema.icon : '',
        };
      }
      $scope.setLeftActionBar(data);
    };

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

    var canViewLastVisitedDate = function() {
      if (Session.isDbAdmin()) {
        // disable UHC for DB admins
        return false;
      }
      return Auth('can_view_last_visited_date')
        .then(function() {
          return true;
        })
        .catch(function() {
          return false;
        });
    };

    var getVisitCountSettings = function(uhcSettings) {
      if (!uhcSettings.visit_count) {
        return {};
      }

      return {
        monthStartDate: uhcSettings.visit_count.month_start_date,
        visitCountGoal: uhcSettings.visit_count.visit_count_goal,
      };
    };

    var setupPromise = $q
      .all([getUserHomePlaceSummary(), canViewLastVisitedDate(), Settings()])
      .then(function(results) {
        usersHomePlace = results[0];
        $scope.lastVisitedDateExtras = results[1];
        var uhcSettings = (results[2] && results[2].uhc) || {};
        $scope.visitCountSettings = getVisitCountSettings(uhcSettings);
        if ($scope.lastVisitedDateExtras && uhcSettings.contacts_default_sort) {
          $scope.sortDirection = $scope.defaultSortDirection =
            uhcSettings.contacts_default_sort;
        }

        setActionBarData();
        return $scope.search();
      });

    this.getSetupPromiseForTesting = function(options) {
      if (options && options.scrollLoaderStub) {
        scrollLoader = options.scrollLoaderStub;
      }
      return setupPromise;
    };

    var isRelevantVisitReport = function(doc) {
      var isRelevantDelete = doc._deleted && isSortedByLastVisited();
      return (
        $scope.lastVisitedDateExtras &&
        doc.type === 'data_record' &&
        doc.form &&
        doc.fields &&
        doc.fields.visited_contact_uuid &&
        (liveList.contains({ _id: doc.fields.visited_contact_uuid }) ||
          isRelevantDelete)
      );
    };

    var changeListener = Changes({
      key: 'contacts-list',
      callback: function(change) {
        var limit = liveList.count();
        if (change.deleted && change.doc.type !== 'data_record') {
          liveList.remove(change.doc);
        }

        var withIds =
          isSortedByLastVisited() &&
          !!isRelevantVisitReport(change.doc) &&
          !change.deleted;
        return _query({ limit: limit, silent: true, withIds: withIds });
      },
      filter: function(change) {
        return (
          ContactSchema.getTypes().indexOf(change.doc.type) !== -1 ||
          liveList.containsDeleteStub(change.doc) ||
          isRelevantVisitReport(change.doc)
        );
      },
    });

    $scope.$on('$destroy', changeListener.unsubscribe);

    if ($stateParams.tour) {
      Tour.start($stateParams.tour);
    }
  });
})();

