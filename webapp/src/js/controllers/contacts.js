var _ = require('underscore'),
  scrollLoader = require('../modules/scroll-loader');

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
    $translate,
    Auth,
    Changes,
    ContactSummary,
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
    TasksForContact,
    Tour,
    TranslateFrom,
    UHCSettings,
    UserSettings,
    XmlForms
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

    var liveList = LiveList.contacts;

    LiveList.$init($scope, 'contacts', 'contact-search');

    ctrl.appending = false;
    ctrl.error = false;
    ctrl.loading = true;
    ctrl.setSelectedContact(null);
    ctrl.clearFilters();
    var defaultTypeFilter = {};
    var usersHomePlace;
    var additionalListItem = false;
    let childPlaces = [];

    ctrl.sortDirection = ctrl.defaultSortDirection = 'alpha';
    var isSortedByLastVisited = function() {
      return ctrl.sortDirection === 'last_visited_date';
    };

    var _initScroll = function() {
      scrollLoader.init(function() {
        if (!ctrl.loading && ctrl.moreItems) {
          _query({
            paginating: true,
            reuseExistingDom: true,
          });
        }
      });
    };

    var _query = function(options) {
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

      var actualFilter = defaultTypeFilter;
      if (ctrl.filters.search || ctrl.filters.simprintsIdentities) {
        actualFilter = ctrl.filters;
      }

      var extensions = {};
      if (ctrl.lastVisitedDateExtras) {
        extensions.displayLastVisitedDate = true;
        extensions.visitCountSettings = ctrl.visitCountSettings;
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
                  var identity = ctrl.filters.simprintsIdentities.find(
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
            _.uniq(contacts.concat(liveList.getList()), false, _.property('_id'))
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

    const getChildTypes = function(model) {
      if (!model.type) {
        $log.error(`Unknown contact type "${model.doc.contact_type || model.doc.type}" for contact "${model.doc._id}"`);
        return [];
      }
      return ContactTypes.getChildren(model.type.id).then(childTypes => {
        const grouped = _.groupBy(childTypes, type => type.person ? 'persons' : 'places');
        const models = [];
        if (grouped.places) {
          models.push({
            menu_key: 'Add place',
            menu_icon: 'fa-building',
            permission: 'can_create_places',
            types: grouped.places
          });
        }
        if (grouped.persons) {
          models.push({
            menu_key: 'Add person',
            menu_icon: 'fa-user',
            permission: 'can_create_people',
            types: grouped.persons
          });
        }
        return models;
      });
    };

    // only admins can edit their own place
    var getCanEdit = function(selectedDoc) {
      if (Session.isAdmin()) {
        return true;
      }
      return setupPromise
        .then(() => usersHomePlace._id !== selectedDoc._id)
        .catch(() => false);
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

    const getTasks = () => {
      return Auth('can_view_tasks')
        .then(() => TasksForContact(ctrl.selectedContact, 'ContactsCtrl', receiveTasks))
        .catch(() => $log.debug('Not authorized to view tasks'));
    };

    const receiveTasks = (tasks) => {
      const tasksByContact = {};
      tasks.forEach(task => {
        if (task.doc && task.doc.contact) {
          const contactId = task.doc.contact._id;
          tasksByContact[contactId] = ++tasksByContact[contactId] || 1;
        }
      });
      ctrl.updateSelectedContact({ tasks });
      ctrl.updateSelectedContact({ tasksByContact });
    };

    const getTitle = selected => {
      const title = (selected.type && selected.type.name_key) ||
                    'contact.profile';
      return $translate(title).catch(() => title);
    };

    // Don't allow deletion if this contact has any children
    const canDelete = selected => {
      return !selected.children ||
             selected.children.every(group => !group.contacts || !group.contacts.length);
    };

    $scope.setSelected = function(selected, contactViewModelOptions) {
      liveList.setSelected(selected.doc._id);
      ctrl.setLoadingSelectedContact();
      ctrl.setSelectedContact(selected);
      ctrl.clearCancelCallback();
      const lazyLoadedContactData = ctrl.loadSelectedContactChildren(contactViewModelOptions).then(ctrl.loadSelectedContactReports);

      ctrl.setContactsLoadingSummary(true);
      return $q
        .all([
          getTitle(ctrl.selectedContact),
          getCanEdit(ctrl.selectedContact.doc),
          getChildTypes(ctrl.selectedContact)
        ])
        .then(([ title, canEdit, childTypes ]) => {
          ctrl.setTitle(title);

          ctrl.setRightActionBar({
            relevantForms: [], // this disables the "New Action" button in action bar until full load is complete
            sendTo: selected.type && selected.type.person ? ctrl.selectedContact.doc : '',
            canDelete: false, // this disables the "Delete" button in action bar until full load is complete
            canEdit: canEdit,
            childTypes: childTypes
          });

          return lazyLoadedContactData
            .then(function() {
              return $q.all([
                ContactSummary(ctrl.selectedContact.doc, ctrl.selectedContact.reports, ctrl.selectedContact.lineage),
                Settings(),
                getTasks()
              ])
              .then(([ summary, settings ]) => {
                ctrl.setContactsLoadingSummary(false);
                ctrl.updateSelectedContact({ summary: summary });
                const options = { doc: ctrl.selectedContact.doc, contactSummary: summary.context };
                XmlForms.listen('ContactsCtrl', options, function(err, forms) {
                  if (err) {
                    $log.error('Error fetching relevant forms', err);
                  }
                  const showUnmuteModal = function(formId) {
                    return ctrl.selectedContact.doc &&
                          ctrl.selectedContact.doc.muted &&
                          !isUnmuteForm(settings, formId);
                  };
                  const formSummaries = forms && forms.map(function(xForm) {
                    return {
                      code: xForm.internalId,
                      title: translateTitle(xForm.translation_key, xForm.title),
                      icon: xForm.icon,
                      showUnmuteModal: showUnmuteModal(xForm.internalId)
                    };
                  });
                  ctrl.setRightActionBar({
                    relevantForms: formSummaries,
                    sendTo: selected.type && selected.type.person ? ctrl.selectedContact.doc : '',
                    canEdit,
                    canDelete: canDelete(ctrl.selectedContact),
                    childTypes,
                  });
                });
              });
            });
        })
        .catch(function(e) {
          $log.error('Error setting selected contact');
          $log.error(e);
          ctrl.updateSelectedContact({ error: true });
          ctrl.clearRightActionBar();
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

    var setActionBarData = function() {
      ctrl.setLeftActionBar({
        hasResults: ctrl.hasContacts,
        userFacilityId: usersHomePlace && usersHomePlace._id,
        childPlaces: childPlaces,
        exportFn: function() {
          Export('contacts', ctrl.filters, { humanReadable: true });
        },
      });
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

    var setupPromise = $q
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

    var isRelevantVisitReport = function(doc) {
      var isRelevantDelete = doc && doc._deleted && isSortedByLastVisited();
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

    var changeListener = Changes({
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
