var _ = require('underscore'),
  scrollLoader = require('../modules/scroll-loader');

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
    ContactSchema,
    ContactSummary,
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
    TranslateFrom,
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
      return {
        clearCancelCallback: globalActions.clearCancelCallback,
        clearFilters: globalActions.clearFilters,
        clearRightActionBar: globalActions.clearRightActionBar,
        loadSelectedContactChildren: contactsActions.loadSelectedContactChildren,
        loadSelectedContactReports: contactsActions.loadSelectedContactReports,
        setContactsLoadingSummary: contactsActions.setContactsLoadingSummary,
        setLeftActionBar: globalActions.setLeftActionBar,
        setLoadingSelectedContactChildren: contactsActions.setLoadingSelectedContactChildren,
        setLoadingSelectedContactReports: contactsActions.setLoadingSelectedContactReports,
        setRightActionBar: globalActions.setRightActionBar,
        setSelectedContact: contactsActions.setSelectedContact,
        updateSelectedContact: contactsActions.updateSelectedContact
      };
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
      options.limit = options.limit || 50;

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

    $scope.setSelected = function(selected, options) {
      liveList.setSelected(selected.doc._id);
      ctrl.setLoadingSelectedContactChildren(true);
      ctrl.setLoadingSelectedContactReports(true);
      ctrl.setSelectedContact(selected);
      ctrl.clearCancelCallback();
      var title = '';
      if (ctrl.selectedContact.doc.type === 'person') {
        title = 'contact.profile';
      } else {
        title = ContactSchema.get(ctrl.selectedContact.doc.type).label;
      }
      ctrl.setContactsLoadingSummary(true);
      return $q
        .all([
          $translate(title),
          getActionBarDataForChild(ctrl.selectedContact.doc.type),
          getCanEdit(ctrl.selectedContact.doc),
        ])
        .then(function(results) {
          $scope.setTitle(results[0]);
          if (results[1]) {
            ctrl.updateSelectedContact({ doc: { child: results[1] }});
          }
          var canEdit = results[2];

          ctrl.setRightActionBar({
            relevantForms: [], // this disables the "New Action" button in action bar until full load is complete
            sendTo: ctrl.selectedContact.doc.type === 'person' ? ctrl.selectedContact.doc : '',
            canDelete: false, // this disables the "Delete" button in action bar until full load is complete
            canEdit: canEdit,
          });

          return ctrl.loadSelectedContactChildren(options)
            .then(ctrl.loadSelectedContactReports)
            .then(function() {
              return $q.all([
                ContactSummary(ctrl.selectedContact.doc, ctrl.selectedContact.reports, ctrl.selectedContact.lineage),
                Settings()
              ])
              .then(function(results) {
                ctrl.setContactsLoadingSummary(false);
                var summary = results[0];
                ctrl.updateSelectedContact({ summary: summary });
                var options = { doc: ctrl.selectedContact.doc, contactSummary: summary.context };
                XmlForms('ContactsCtrl', options, function(err, forms) {
                  if (err) {
                    $log.error('Error fetching relevant forms', err);
                  }
                  var showUnmuteModal = function(formId) {
                    return ctrl.selectedContact.doc &&
                          ctrl.selectedContact.doc.muted &&
                          !isUnmuteForm(results[1], formId);
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
                    !ctrl.selectedContact.children ||
                    ((!ctrl.selectedContact.children.places ||
                      ctrl.selectedContact.children.places.length === 0) &&
                      (!ctrl.selectedContact.children.persons ||
                        ctrl.selectedContact.children.persons.length === 0));
                  ctrl.setRightActionBar({
                    relevantForms: formSummaries,
                    sendTo: ctrl.selectedContact.doc.type === 'person' ? ctrl.selectedContact.doc : '',
                    canEdit: canEdit,
                    canDelete: canDelete,
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

    $scope.$on('ClearSelected', function() {
      clearSelection();
    });

    const clearSelection = () => {
      ctrl.setSelectedContact(null);
      LiveList.contacts.clearSelected();
      LiveList['contact-search'].clearSelected();
    };

    ctrl.search = function() {
      if(ctrl.filters.search && !ctrl.enketoEdited) {
        $state.go('contacts.detail', { id: null }, { notify: false });
        clearSelection();
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

    var setActionBarData = function() {
      var data = {
        hasResults: ctrl.hasContacts,
        userFacilityId: usersHomePlace && usersHomePlace._id,
        exportFn: function() {
          Export('contacts', ctrl.filters, { humanReadable: true });
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
      ctrl.setLeftActionBar(data);
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
        ctrl.lastVisitedDateExtras = results[1];
        var uhcSettings = (results[2] && results[2].uhc) || {};
        ctrl.visitCountSettings = getVisitCountSettings(uhcSettings);
        if (ctrl.lastVisitedDateExtras && uhcSettings.contacts_default_sort) {
          ctrl.sortDirection = ctrl.defaultSortDirection =
            uhcSettings.contacts_default_sort;
        }

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
          (change.doc && ContactSchema.getTypes().indexOf(change.doc.type) !== -1) ||
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
