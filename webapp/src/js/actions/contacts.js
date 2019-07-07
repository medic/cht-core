const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('ContactsActions',
  function(
    ActionUtils,
    ContactViewModelGenerator,
    Selectors
  ) {
    'use strict';
    'ngInject';

    return function(dispatch) {

      function loadSelectedContactChildren(options) {
        return dispatch(function(dispatch, getState) {
          const selected = Selectors.getSelectedContact(getState());
          return ContactViewModelGenerator.loadChildren(selected, options).then(children => {
            dispatch(ActionUtils.createSingleValueAction(actionTypes.RECEIVE_SELECTED_CONTACT_CHILDREN, 'children', children));
          });
        });
      }

      function loadSelectedContactReports() {
        return dispatch(function(dispatch, getState) {
          const selected = Selectors.getSelectedContact(getState());
          return ContactViewModelGenerator.loadReports(selected).then(reports => {
            dispatch(ActionUtils.createSingleValueAction(actionTypes.RECEIVE_SELECTED_CONTACT_REPORTS, 'reports', reports));
          });
        });
      }

      function setLoadingSelectedContactChildren(loading) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_LOADING_SELECTED_CONTACT_CHILDREN, 'loadingSelectedChildren', loading));
      }

      function setLoadingSelectedContactReports(loading) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_LOADING_SELECTED_CONTACT_REPORTS, 'loadingSelectedReports', loading));
      }

      function setContactsLoadingSummary(value) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_CONTACTS_LOADING_SUMMARY, 'loadingSummary', value));
      }

      function setSelectedContact(selected) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SELECTED_CONTACT, 'selected', selected));
      }

      function updateSelectedContact(selected) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.UPDATE_SELECTED_CONTACT, 'selected', selected));
      }

      return {
        loadSelectedContactChildren,
        loadSelectedContactReports,
        setLoadingSelectedContactChildren,
        setLoadingSelectedContactReports,
        setContactsLoadingSummary,
        setSelectedContact,
        updateSelectedContact
      };
    };
  }
);
