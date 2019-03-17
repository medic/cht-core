/* eslint-disable angular/one-dependency-per-line */
(function() {
  var _ = require('underscore');
  var merge = require('lodash/merge');
  var initialState = {
    cancelCallback: null,
    enketoStatus: {
      edited: false,
      saving: false,
      error: null
    },
    loadingSelectedChildren: false,
    loadingSelectedReports: false,
    selectMode: false,
    selected: null
  };

  angular.module('inboxServices').constant('Reducers', function(state, action) {
    if (typeof state === 'object' && Object.keys(state).length === 0) {
      state = initialState;
    }

    var selected;
    switch (action.type) {
      case 'SET_CANCEL_CALLBACK':
        return Object.assign({}, state, { cancelCallback: action.payload.cancelCallback });
      case 'SET_ENKETO_STATUS':
        return Object.assign({}, state, {
          enketoStatus: Object.assign({}, state.enketoStatus, action.payload.enketoStatus)
        });
      case 'SET_SELECT_MODE':
        return Object.assign({}, state, { selectMode: action.payload.selectMode });
      case 'SET_SELECTED':
        return Object.assign({}, state, { selected: action.payload.selected });
      case 'UPDATE_SELECTED':
        return Object.assign({}, state, {
          selected: merge({}, state.selected, action.payload.selected)
        });
      case 'UPDATE_SELECTED_ITEM':
        selected = state.selected.map(function(item) {
          if (item._id === action.payload.id) {
            return Object.assign({}, item, action.payload.selected);
          }
          return item;
        });
        return Object.assign({}, state, { selected: selected });
      case 'SET_FIRST_SELECTED_DOC_PROPERTY':
        selected = state.selected.map(function(item, index) {
          if (index === 0) {
            return Object.assign({}, item, {
              doc: Object.assign({}, item.doc, action.payload.doc)
            });
          }
          return item;
        });
        return Object.assign({}, state, { selected: selected });
      case 'SET_FIRST_SELECTED_FORMATTED_PROPERTY':
        selected = state.selected.map(function(item, index) {
          if (index === 0) {
            return Object.assign({}, item, {
              formatted: Object.assign({}, item.formatted, action.payload.formatted)
            });
          }
          return item;
        });
        return Object.assign({}, state, { selected: selected });
      case 'ADD_SELECTED_MESSAGE':
        return Object.assign({}, state, {
          selected: Object.assign({}, state.selected, {
            messages: state.selected.messages.concat(action.payload.message)
          })
        });
      case 'REMOVE_SELECTED_MESSAGE':
        var filteredMessages = _.filter(state.selected.messages, function(message) {
          return message.id !== action.payload.id;
        });
        return Object.assign({}, state, {
          selected: Object.assign({}, state.selected, { messages: filteredMessages })
        });
      case 'ADD_SELECTED':
        return Object.assign({}, state, {
          selected: state.selected.concat(action.payload.selected)
        });
      case 'REMOVE_SELECTED':
        var filteredSelected = _.filter(state.selected, function(selected) {
          return selected._id !== action.payload.id;
        });
        return Object.assign({}, state, { selected: filteredSelected });
      case 'SET_LOADING_SELECTED_CHILDREN':
        return Object.assign({}, state, { loadingSelectedChildren: action.payload.loadingSelectedChildren });
      case 'SET_LOADING_SELECTED_REPORTS':
        return Object.assign({}, state, { loadingSelectedReports: action.payload.loadingSelectedReports });
      case 'RECEIVE_SELECTED_CHILDREN':
        return Object.assign({}, state, {
          selected: Object.assign({}, state.selected, { children: action.payload.children }),
          loadingSelectedChildren: false
        });
      case 'RECEIVE_SELECTED_REPORTS':
        return Object.assign({}, state, {
          selected: Object.assign({}, state.selected, { reports: action.payload.reports }),
          loadingSelectedReports: false
        });
      default:
        return state;
    }
  });
}());
