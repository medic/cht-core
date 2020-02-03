const _ = require('underscore');
const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('ContactsActions',
  function(
    $log,
    $q,
    $translate,
    ActionUtils,
    Auth,
    ContactSummary,
    ContactTypes,
    ContactViewModelGenerator,
    GlobalActions,
    LiveList,
    Selectors,
    Session,
    Settings,
    TargetAggregates,
    TasksForContact,
    TranslateFrom,
    UserSettings,
    XmlForms
  ) {
    'use strict';
    'ngInject';

    return function(dispatch) {

      const globalActions = GlobalActions(dispatch);

      const translateTitle = (key, label) => {
        return key ? $translate.instant(key) : TranslateFrom(label);
      };

      const isUnmuteForm = function(settings, formId) {
        return Boolean(settings &&
                       formId &&
                       settings.muting &&
                       settings.muting.unmute_forms &&
                       settings.muting.unmute_forms.includes(formId));
      };

      const getTitle = selected => {
        const title = (selected.type && selected.type.name_key) ||
                      'contact.profile';
        return $translate(title).catch(() => title);
      };

      // only admins can edit their own place
      const canEdit = function(selected) {
        if (Session.isAdmin()) {
          return true;
        }
        return UserSettings().then(userSettings => {
          return userSettings.facility_id &&
                 userSettings.facility_id !== selected.doc._id;
        });
      };

      const canDelete = selected => {
        return !selected.children ||
                selected.children.every(group => !group.contacts || !group.contacts.length);
      };

      const registerTasksListener = selected => {
        Auth.has('can_view_tasks')
          .then(canViewTasks => {
            if (!canViewTasks) {
              $log.debug('Not authorized to view tasks');
              return;
            }

            return TasksForContact(selected)
              .then(taskDocs => updateSelectedContact({ tasks: taskDocs.map(doc => doc.emission) }))
              .catch(err => $log.error('Failed to load tasks for contact', err));
          });
      };

      const getChildTypes = selected => {
        if (!selected.type) {
          const type = selected.doc.contact_type || selected.doc.type;
          $log.error(`Unknown contact type "${type}" for contact "${selected.doc._id}"`);
          return [];
        }
        return ContactTypes.getChildren(selected.type.id).then(childTypes => {
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

      function loadSelectedContactChildren(options) {
        return dispatch(function(dispatch, getState) {
          const selected = Selectors.getSelectedContact(getState());
          return ContactViewModelGenerator.loadChildren(selected, options).then(children => {
            return dispatch(ActionUtils.createSingleValueAction(
              actionTypes.RECEIVE_SELECTED_CONTACT_CHILDREN, 'children', children
            ));
          });
        });
      }

      function loadSelectedContactReports() {
        return dispatch(function(dispatch, getState) {
          const selected = Selectors.getSelectedContact(getState());
          return ContactViewModelGenerator.loadReports(selected).then(reports => {
            return dispatch(ActionUtils.createSingleValueAction(
              actionTypes.RECEIVE_SELECTED_CONTACT_REPORTS, 'reports', reports
            ));
          });
        });
      }

      function loadSelectedContactTargets(selected) {
        return TargetAggregates.getTargets(selected).then(targets => {
          return dispatch(ActionUtils.createSingleValueAction(
            actionTypes.RECEIVE_SELECTED_CONTACT_TARGETS, 'targets', targets
          ));
        });
      }

      function setLoadingSelectedContact() {
        dispatch({ type: actionTypes.SET_LOADING_SELECTED_CONTACT });
      }

      function setContactsLoadingSummary(value) {
        dispatch(ActionUtils.createSingleValueAction(
          actionTypes.SET_CONTACTS_LOADING_SUMMARY, 'loadingSummary', value
        ));
      }

      const setSelectedContact = (id, { getChildPlaces=false, merge=false }={}) => {

        return dispatch(function(dispatch, getState) {

          return ContactViewModelGenerator.getContact(id, { getChildPlaces, merge })
            .then(selected => {

              const previous = Selectors.getSelectedContact(getState());
              const refreshing = (previous && previous.doc._id) === id;

              dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SELECTED_CONTACT, 'selected', selected));
              globalActions.settingSelected(refreshing);

              LiveList.contacts.setSelected(selected.doc._id);
              LiveList['contact-search'].setSelected(selected.doc._id);
              setLoadingSelectedContact();
              globalActions.clearCancelCallback();
              setContactsLoadingSummary(true);
              const lazyLoadedContactData = loadSelectedContactChildren({ getChildPlaces })
                .then(loadSelectedContactReports)
                .then(() => loadSelectedContactTargets(selected));
              return $q
                .all([
                  getTitle(selected),
                  canEdit(selected),
                  getChildTypes(selected)
                ])
                .then(([ title, canEdit, childTypes ]) => {
                  globalActions.setTitle(title);
                  globalActions.setRightActionBar({
                    relevantForms: [], // this disables the "New Action" button in action bar till full load is complete
                    sendTo: selected.type && selected.type.person ? selected.doc : '',
                    canDelete: false, // this disables the "Delete" button in action bar until full load is complete
                    canEdit: canEdit,
                    childTypes: childTypes
                  });
                  return lazyLoadedContactData
                    .then(() => {
                      selected = Selectors.getSelectedContact(getState());
                      registerTasksListener(selected);
                      return $q.all([
                        ContactSummary(selected.doc, selected.reports, selected.lineage, selected.targets),
                        Settings()
                      ]);
                    })
                    .then(([ summary, settings ]) => {
                      setContactsLoadingSummary(false);
                      updateSelectedContact({ summary });
                      const options = {
                        doc: selected.doc,
                        contactSummary: summary.context
                      };
                      XmlForms.listen('ContactsCtrl', options, (err, forms) => {
                        if (err) {
                          $log.error('Error fetching relevant forms', err);
                        }
                        const showUnmuteModal = formId => {
                          return selected.doc &&
                                 selected.doc.muted &&
                                 !isUnmuteForm(settings, formId);
                        };
                        const formSummaries = forms && forms.map(xForm => {
                          return {
                            code: xForm.internalId,
                            title: translateTitle(xForm.translation_key, xForm.title),
                            icon: xForm.icon,
                            showUnmuteModal: showUnmuteModal(xForm.internalId)
                          };
                        });
                        globalActions.setRightActionBar({
                          relevantForms: formSummaries,
                          sendTo: selected.type && selected.type.person ? selected.doc : '',
                          canEdit,
                          canDelete: canDelete(selected),
                          childTypes,
                        });
                      });
                    });
                });
            });
        });
      };

      function updateSelectedContact(selected) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.UPDATE_SELECTED_CONTACT, 'selected', selected));
      }

      function clearSelection() {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SELECTED_CONTACT, 'selected', null));
        LiveList.contacts.clearSelected();
        LiveList['contact-search'].clearSelected();
      }

      return {
        loadSelectedContactChildren,
        loadSelectedContactReports,
        setLoadingSelectedContact,
        setContactsLoadingSummary,
        setSelectedContact,
        updateSelectedContact,

        clearSelection
      };
    };
  }
);
