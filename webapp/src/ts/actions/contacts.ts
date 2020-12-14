import { Store, createAction } from '@ngrx/store';
import { createSingleValueAction, createMultiValueAction } from './actionUtils';

export const Actions = {
  updateContactsList: createSingleValueAction('UPDATE_CONTACTS_LIST', 'contacts'),
  setSelectedContacts: createSingleValueAction('SET_SELECTED_CONTACTS', 'selected'),
  resetContactsList: createAction('RESET_CONTACTS_LIST'),
  removeContactFromList: createSingleValueAction('REMOVE_CONTACT_FROM_LIST', 'contact'),
  selectContact: createMultiValueAction('SELECT_CONTACT'),
  setSelectedContact: createSingleValueAction('SET_SELECTED_CONTACT', 'selected'),
  setContactsLoadingSummary: createSingleValueAction('SET_CONTACT_LOADING_SUMMARY', 'value'),
  setLoadingSelectedContact: createAction('SET_LOADING_SELECTED_CONTACT'),
  receiveSelectedContactChildren: createSingleValueAction('RECEIVE_SELECTED_CONTACT_CHILDREN', 'children'),
  receiveSelectedContactReports: createSingleValueAction('RECEIVE_SELECTED_CONTACT_REPORTS', 'reports'),
  updateSelectedContactSummary: createSingleValueAction('UPDATE_SELECTED_CONTACT', 'summary'),
  updateSelectedContactsTasks: createSingleValueAction('UPDATE_SELECTED_CONTACT_TASKS', 'tasks'),
  receiveSelectedContactTargetDoc: createSingleValueAction('RECEIVE_SELECTED_CONTACT_TARGET_DOC', 'targetDoc'),
};

export class ContactsActions {
  constructor(
    private store: Store
  ) {}

  updateContactsList(contacts) {
    return this.store.dispatch(Actions.updateContactsList(contacts));
  }

  clearSelection() {
    return this.store.dispatch(Actions.setSelectedContact(null));
  }

  resetContactsList() {
    return this.store.dispatch(Actions.resetContactsList());
  }

  removeContactFromList(contact) {
    return this.store.dispatch(Actions.removeContactFromList(contact));
  }

  selectContact(id, { silent=false }={}) {
    return this.store.dispatch(Actions.selectContact({ id, silent }));
  }

  setSelectedContact(model) {
    return this.store.dispatch(Actions.setSelectedContact(model));
  }

  setContactsLoadingSummary(value) {
    return this.store.dispatch(Actions.setContactsLoadingSummary(value));
  }

  setLoadingSelectedContact() {
    return this.store.dispatch(Actions.setLoadingSelectedContact());
  }

  receiveSelectedContactChildren(children) {
    return this.store.dispatch(Actions.receiveSelectedContactChildren(children));
  }

  receiveSelectedContactReports(reports) {
    return this.store.dispatch(Actions.receiveSelectedContactReports(reports));
  }

  updateSelectedContactSummary(summary) {
    return this.store.dispatch(Actions.updateSelectedContactSummary(summary));
  }

  updateSelectedContactsTasks(tasks) {
    return this.store.dispatch(Actions.updateSelectedContactsTasks(tasks));
  }

  receiveSelectedContactTargetDoc(targetDoc) {
    return this.store.dispatch(Actions.receiveSelectedContactTargetDoc(targetDoc));
  }

  // const translateTitle = (key, label) => {
  //   return key ? $translate.instant(key) : TranslateFrom(label);
  // };

  // const isUnmuteForm = function(settings, formId) {
  //   return Boolean(settings &&
  //                  formId &&
  //                  settings.muting &&
  //                  settings.muting.unmute_forms &&
  //                  settings.muting.unmute_forms.includes(formId));
  // };

  // const getTitle = selected => {
  //   const title = (selected.type && selected.type.name_key) ||
  //                 'contact.profile';
  //   return $translate(title).catch(() => title);
  // };

  // // only admins can edit their own place
  // const canEdit = function(selected) {
  //   if (Session.isAdmin()) {
  //     return true;
  //   }
  //   return UserSettings().then(userSettings => {
  //     return userSettings.facility_id &&
  //            userSettings.facility_id !== selected.doc._id;
  //   });
  // };

  // const canDelete = selected => {
  //   return !selected.children ||
  //           selected.children.every(group => !group.contacts || !group.contacts.length);
  // };

  // const registerTasksListener = selected => {
  //   Auth.has('can_view_tasks')
  //     .then(canViewTasks => {
  //       if (!canViewTasks) {
  //         $log.debug('Not authorized to view tasks');
  //         return;
  //       }
  //       TasksForContact(selected)
  //         .then(taskDocs => {
  //           dispatch(
  //             ActionUtils.createSingleValueAction(actionTypes.UPDATE_SELECTED_CONTACT_TASKS, 'tasks', taskDocs)
  //           );
  //         })
  //         .catch(err => $log.error('Failed to load tasks for contact', err));
  //     });
  // };

  // const getChildTypes = selected => {
  //   if (!selected.type) {
  //     const type = selected.doc.contact_type || selected.doc.type;
  //     $log.error(`Unknown contact type "${type}" for contact "${selected.doc._id}"`);
  //     return [];
  //   }
  //   return ContactTypes.getChildren(selected.type.id);
  // };

  // const getGroupedChildTypes = (childTypes) => {
  //   const grouped = _.groupBy(childTypes, type => type.person ? 'persons' : 'places');
  //   const models = [];
  //   if (grouped.places) {
  //     models.push({
  //       menu_key: 'Add place',
  //       menu_icon: 'fa-building',
  //       permission: 'can_create_places',
  //       types: grouped.places
  //     });
  //   }
  //   if (grouped.persons) {
  //     models.push({
  //       menu_key: 'Add person',
  //       menu_icon: 'fa-user',
  //       permission: 'can_create_people',
  //       types: grouped.persons
  //     });
  //   }

  //   return models;
  // };

  // function loadSelectedContactChildren(options) {
  //   return dispatch(function(dispatch, getState) {
  //     const selected = Selectors.getSelectedContact(getState());
  //     return ContactViewModelGenerator.loadChildren(selected, options).then(children => {
  //       return dispatch(ActionUtils.createSingleValueAction(
  //         actionTypes.RECEIVE_SELECTED_CONTACT_CHILDREN, 'children', children
  //       ));
  //     });
  //   });
  // }

  // function loadSelectedContactReports() {
  //   return dispatch(function(dispatch, getState) {
  //     const selected = Selectors.getSelectedContact(getState());
  //     const forms = Selectors.getForms(getState());
  //     return ContactViewModelGenerator.loadReports(selected, forms).then(reports => {
  //       return dispatch(ActionUtils.createSingleValueAction(
  //         actionTypes.RECEIVE_SELECTED_CONTACT_REPORTS, 'reports', reports
  //       ));
  //     });
  //   });
  // }

  // function loadSelectedContactTargetDoc(selected) {
  //   return TargetAggregates.getCurrentTargetDoc(selected).then(targetDoc => {
  //     return dispatch(ActionUtils.createSingleValueAction(
  //       actionTypes.RECEIVE_SELECTED_CONTACT_TARGET_DOC, 'targetDoc', targetDoc
  //     ));
  //   });
  // }

  // function setLoadingSelectedContact() {
  //   dispatch({ type: actionTypes.SET_LOADING_SELECTED_CONTACT });
  // }

  // function setContactsLoadingSummary(value) {
  //   dispatch(ActionUtils.createSingleValueAction(
  //     actionTypes.SET_CONTACTS_LOADING_SUMMARY, 'loadingSummary', value
  //   ));
  // }

  // const setSelectedContact = (id, { getChildPlaces=false, merge=false }={}) => {

  //   return dispatch(function(dispatch, getState) {

  //     return ContactViewModelGenerator.getContact(id, { getChildPlaces, merge })
  //       .then(selected => {

  //         const previous = Selectors.getSelectedContact(getState());
  //         const refreshing = (previous && previous.doc._id) === id;

  //         dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SELECTED_CONTACT, 'selected', selected));
  //         globalActions.settingSelected(refreshing);

  //         LiveList.contacts.setSelected(selected.doc._id);
  //         LiveList['contact-search'].setSelected(selected.doc._id);
  //         setLoadingSelectedContact();
  //         globalActions.clearCancelCallback();
  //         setContactsLoadingSummary(true);
  //         const lazyLoadedContactData = loadSelectedContactChildren({ getChildPlaces })
  //           .then(loadSelectedContactReports)
  //           .then(() => loadSelectedContactTargetDoc(selected));
  //         return $q
  //           .all([
  //             getTitle(selected),
  //             canEdit(selected),
  //             getChildTypes(selected)
  //           ])
  //           .then(([ title, canEdit, childTypes ]) => {
  //             globalActions.setTitle(title);
  //             globalActions.setRightActionBar({
  //               relevantForms: [], // this disables the "New Action" button in action bar till forms load
  //               sendTo: selected.type && selected.type.person ? selected.doc : '',
  //               canDelete: false, // this disables the "Delete" button in action bar until children load
  //               canEdit: canEdit,
  //             });
  //             return lazyLoadedContactData
  //               .then(() => {
  //                 selected = Selectors.getSelectedContact(getState());
  //                 globalActions.setRightActionBar({ canDelete: canDelete(selected) });
  //                 registerTasksListener(selected);
  //                 return $q.all([
  //                   ContactSummary(selected.doc, selected.reports, selected.lineage, selected.targetDoc),
  //                   Settings()
  //                 ]);
  //               })
  //               .then(([ summary, settings ]) => {
  //                 setContactsLoadingSummary(false);
  //                 updateSelectedContact({ summary });
  //                 const options = {
  //                   doc: selected.doc,
  //                   contactSummary: summary.context,
  //                   contactForms: false,
  //                 };
  //                 XmlForms.listen('ContactsCtrl', options, (err, forms) => {
  //                   if (err) {
  //                     $log.error('Error fetching relevant forms', err);
  //                     return;
  //                   }
  //                   const showUnmuteModal = formId => {
  //                     return selected.doc &&
  //                            selected.doc.muted &&
  //                            !isUnmuteForm(settings, formId);
  //                   };
  //                   const formSummaries = forms && forms.map(xForm => {
  //                     return {
  //                       code: xForm.internalId,
  //                       title: translateTitle(xForm.translation_key, xForm.title),
  //                       icon: xForm.icon,
  //                       showUnmuteModal: showUnmuteModal(xForm.internalId)
  //                     };
  //                   });
  //                   globalActions.setRightActionBar({ relevantForms: formSummaries });
  //                 });

  //                 XmlForms.listen('ContactsCtrlContactForms', { contactForms: true }, (err, forms) => {
  //                   if (err) {
  //                     $log.error('Error fetching allowed contact forms', err);
  //                     return;
  //                   }

  //                   const allowCreateLink = contactType => forms.find(form => form._id === contactType.create_form);
  //                   const allowedChildTypes = childTypes.filter(allowCreateLink);

  //                   globalActions.setRightActionBar({ childTypes: getGroupedChildTypes(allowedChildTypes) });
  //                 });
  //               });
  //           });
  //       });
  //   });
  // };

  // function updateSelectedContact(selected) {
  //   dispatch(ActionUtils.createSingleValueAction(actionTypes.UPDATE_SELECTED_CONTACT, 'selected', selected));
  // }
}
