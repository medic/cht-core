const _ = require('lodash/core');
let scrollLoader = require('../modules/scroll-loader');

const PAGE_SIZE = 50;

(function() {
  'use strict';

  angular.module('inboxControllers').controller('ContactsCtrl', function(
    $log,
    $ngRedux,
    $q,
    $scope,
    $state,
    $stateParams,
    Auth,
    Changes,
    ContactTypes,
    ContactsActions,
    Export,
    GetDataRecords,
    GlobalActions,
    LiveList,
    Search,
    SearchFilters,
    Selectors,
    Session,
    Settings,
    Simprints,
    Tour,
    UHCSettings,
    UserSettings
  ) {
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        enketoEdited: Selectors.getEnketoEditedStatus(state),
        filters: Selectors.getFilters(state),
        selectedContact: Selectors.getSelectedContact(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      const contactsActions = ContactsActions(dispatch);
      return Object.assign({}, globalActions, contactsActions);
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    let liveList = LiveList.contacts;

    ctrl.appending = false;
    ctrl.error = false;
    ctrl.loading = true;
    ctrl.clearSelection();
    ctrl.clearFilters();
    let defaultTypeFilter = {};
    let usersHomePlace;
    let additionalListItem = false;
    let childPlaces = [];

    ctrl.sortDirection = ctrl.defaultSortDirection = 'alpha';
    const isSortedByLastVisited = function() {
      return ctrl.sortDirection === 'last_visited_date';
    };

    const _initScroll = function() {
      scrollLoader.init(function() {
        if (!ctrl.loading && ctrl.moreItems) {
          _query({
            paginating: true,
            reuseExistingDom: true,
          });
        }
      });
    };

    const _query = function(options) {
      options = options || {};
      if (!options.limit || options.limit < PAGE_SIZE) {
        options.limit = PAGE_SIZE;
      }

      if (!options.silent) {
        ctrl.loading = true;
        ctrl.error = false;
      }

      if (options.paginating) {
        ctrl.appending = true;
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

      let actualFilter = defaultTypeFilter;
      if (ctrl.filters.search || ctrl.filters.simprintsIdentities) {
        actualFilter = ctrl.filters;
      }

      const extensions = {};
      if (ctrl.lastVisitedDateExtras) {
        extensions.displayLastVisitedDate = true;
        extensions.visitCountSettings = ctrl.visitCountSettings;
      }
      if (isSortedByLastVisited()) {
        extensions.sortByLastVisitedDate = true;
      }

      let docIds;
      if (options.withIds) {
        docIds = liveList.getList().map(function(item) {
          return item._id;
        });
      }

      return Search('contacts', actualFilter, options, extensions, docIds)
        .then(function(contacts) {
          // If you have a home place make sure its at the top
          if (usersHomePlace) {
            const homeIndex = _.findIndex(contacts, function(contact) {
              return contact._id === usersHomePlace._id;
            });

            additionalListItem =
              !ctrl.filters.search &&
              !ctrl.filters.simprintsIdentities &&
              (additionalListItem || !ctrl.appending) &&
              homeIndex === -1;

            if (!ctrl.appending) {
              if (homeIndex !== -1) {
                // move it to the top
                contacts.splice(homeIndex, 1);
                contacts.unshift(usersHomePlace);
              } else if (
                !ctrl.filters.search &&
                !ctrl.filters.simprintsIdentities
              ) {
                contacts.unshift(usersHomePlace);
              }
              if (ctrl.filters.simprintsIdentities) {
                contacts.forEach(function(contact) {
                  const identity = ctrl.filters.simprintsIdentities.find(
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

          ctrl.moreItems = liveList.moreItems =
            contacts.length >= options.limit;

          const mergedList = options.paginating ?
            _.uniqBy(contacts.concat(liveList.getList()), '_id')
            : contacts;
          liveList.set(mergedList, !!options.reuseExistingDom);

          _initScroll();
          ctrl.loading = false;
          ctrl.appending = false;
          ctrl.hasContacts = liveList.count() > 0;
          setActionBarData();
        })
        .catch(function(err) {
          ctrl.error = true;
          ctrl.loading = false;
          ctrl.appending = false;
          $log.error('Error searching for contacts', err);
        });
    };

    ctrl.search = function() {
      if(ctrl.filters.search && !ctrl.enketoEdited) {
        $state.go('contacts.detail', { id: null }, { notify: false });
        ctrl.clearSelection();
      }

      ctrl.loading = true;
      if (ctrl.filters.search || ctrl.filters.simprintsIdentities) {
        ctrl.filtered = true;
        liveList = LiveList['contact-search'];
        liveList.set([]);
        return _query();
      } else {
        ctrl.filtered = false;
        return _query();
      }
    };

    ctrl.sort = function(sortDirection) {
      ctrl.sortDirection = sortDirection;
      liveList.set([]);
      _query();
    };

    ctrl.resetFilterModel = function() {
      ctrl.clearFilters();
      ctrl.sortDirection = ctrl.defaultSortDirection;
      SearchFilters.reset();
      ctrl.search();
    };

    ctrl.simprintsEnabled = Simprints.enabled();
    ctrl.simprintsIdentify = function() {
      ctrl.loading = true;
      Simprints.identify().then(function(identities) {
        ctrl.filters.simprintsIdentities = identities;
        ctrl.search();
      });
    };

    const getChildren = () => {
      let p;
      if (usersHomePlace) {
        // backwards compatibility with pre-flexible hierarchy users
        const homeType = usersHomePlace.contact_type || usersHomePlace.type;
        p = ContactTypes.getChildren(homeType);
      } else if (Session.isAdmin()) {
        p = ContactTypes.getChildren();
      } else {
        return Promise.resolve([]);
      }
      return p.then(children => children.filter(child => !child.person));
    };

    const setActionBarData = function() {
      ctrl.setLeftActionBar({
        hasResults: ctrl.hasContacts,
        userFacilityId: usersHomePlace && usersHomePlace._id,
        childPlaces: childPlaces,
        exportFn: function() {
          Export('contacts', ctrl.filters, { humanReadable: true });
        },
      });
    };

    const getUserHomePlaceSummary = function() {
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

    const canViewLastVisitedDate = function() {
      if (Session.isDbAdmin()) {
        // disable UHC for DB admins
        return false;
      }
      return Auth.has('can_view_last_visited_date');
    };

    const setupPromise = $q
      .all([
        getUserHomePlaceSummary(),
        canViewLastVisitedDate(),
        Settings()
      ])
      .then(([ homePlaceSummary, viewLastVisitedDate, settings ]) => {
        usersHomePlace = homePlaceSummary;
        ctrl.lastVisitedDateExtras = viewLastVisitedDate;
        ctrl.visitCountSettings = UHCSettings.getVisitCountSettings(settings);
        if (ctrl.lastVisitedDateExtras && UHCSettings.getContactsDefaultSort(settings)) {
          ctrl.sortDirection = ctrl.defaultSortDirection = UHCSettings.getContactsDefaultSort(settings);
        }
        return getChildren();
      })
      .then(children => {
        childPlaces = children;
        defaultTypeFilter = {
          types: {
            selected: childPlaces.map(type => type.id)
          }
        };
        setActionBarData();
        return ctrl.search();
      });

    this.getSetupPromiseForTesting = function(options) {
      if (options && options.scrollLoaderStub) {
        scrollLoader = options.scrollLoaderStub;
      }
      return setupPromise;
    };

    const isRelevantVisitReport = function(doc) {
      const isRelevantDelete = doc && doc._deleted && isSortedByLastVisited();
      return (
        doc &&
        ctrl.lastVisitedDateExtras &&
        doc.type === 'data_record' &&
        doc.form &&
        doc.fields &&
        doc.fields.visited_contact_uuid &&
        (liveList.contains(doc.fields.visited_contact_uuid) ||
          isRelevantDelete)
      );
    };

    const changeListener = Changes({
      key: 'contacts-list',
      callback: function(change) {
        const limit = liveList.count();
        if (change.deleted) {
          liveList.remove(change.id);
        }

        if (change.doc) {
          liveList.invalidateCache(change.doc._id);

          // Invalidate the contact for changing reports with visited_contact_uuid
          if (change.doc.fields) {
            liveList.invalidateCache(change.doc.fields.visited_contact_uuid);
          }
        }

        const withIds =
          isSortedByLastVisited() &&
          !!isRelevantVisitReport(change.doc) &&
          !change.deleted;
        return _query({
          limit,
          withIds,
          silent: true,
          reuseExistingDom: true,
        });
      },
      filter: function(change) {
        return (
          ContactTypes.includes(change.doc) ||
          (change.deleted && liveList.contains(change.id)) ||
          isRelevantVisitReport(change.doc)
        );
      },
    });

    $scope.$on('$destroy', function () {
      unsubscribe();
      changeListener.unsubscribe();
      if (!$state.includes('contacts')) {
        LiveList.$reset('contacts', 'contact-search');
      }
    });

    if ($stateParams.tour) {
      Tour.start($stateParams.tour);
    }
  });
})();
