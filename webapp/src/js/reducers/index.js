/* eslint-disable angular/one-dependency-per-line */
(function() {
  const _ = require('underscore');
  const merge = require('lodash/merge');
  const actionTypes = require('../actions/actionTypes');
  const initialState = {
    cancelCallback: null,
    enketoStatus: {
      edited: false,
      saving: false,
      error: null
    },
    loadingSelectedChildren: false,
    loadingSelectedReports: false,
    selectMode: false,
    selected: null,
    lastChangedDoc: false
  };

  angular.module('inboxServices').constant('Reducers', function(state, action) {
    if (typeof state === 'object' && Object.keys(state).length === 0) {
      state = initialState;
    }

    let selected;
    let filteredMessages;
    let filteredSelected;
    switch (action.type) {
      case actionTypes.SET_CANCEL_CALLBACK:
        return Object.assign({}, state, { cancelCallback: action.payload.cancelCallback });
      case actionTypes.SET_ENKETO_STATUS:
        return Object.assign({}, state, {
          enketoStatus: Object.assign({}, state.enketoStatus, action.payload.enketoStatus)
        });
      case actionTypes.SET_SELECT_MODE:
        return Object.assign({}, state, { selectMode: action.payload.selectMode });
      case actionTypes.SET_SELECTED:
        return Object.assign({}, state, { selected: action.payload.selected });
      case actionTypes.UPDATE_SELECTED:
        return Object.assign({}, state, {
          selected: merge({}, state.selected, action.payload.selected)
        });
      case actionTypes.UPDATE_SELECTED_ITEM:
        selected = state.selected.map(item => {
          if (item._id === action.payload.id) {
            return Object.assign({}, item, action.payload.selected);
          }
          return item;
        });
        return Object.assign({}, state, { selected });
      case actionTypes.SET_FIRST_SELECTED_DOC_PROPERTY:
        selected = state.selected.map((item, index) => {
          if (index === 0) {
            return Object.assign({}, item, {
              doc: Object.assign({}, item.doc, action.payload.doc)
            });
          }
          return item;
        });
        return Object.assign({}, state, { selected });
      case actionTypes.SET_FIRST_SELECTED_FORMATTED_PROPERTY:
        selected = state.selected.map((item, index) => {
          if (index === 0) {
            return Object.assign({}, item, {
              formatted: Object.assign({}, item.formatted, action.payload.formatted)
            });
          }
          return item;
        });
        return Object.assign({}, state, { selected: selected });
      case actionTypes.ADD_SELECTED_MESSAGE:
        return Object.assign({}, state, {
          selected: Object.assign({}, state.selected, {
            messages: state.selected.messages.concat(action.payload.message)
          })
        });
      case actionTypes.REMOVE_SELECTED_MESSAGE:
        filteredMessages = _.filter(state.selected.messages, message => message.id !== action.payload.id);
        return Object.assign({}, state, {
          selected: Object.assign({}, state.selected, { messages: filteredMessages })
        });
      case actionTypes.ADD_SELECTED:
        return Object.assign({}, state, {
          selected: state.selected.concat(action.payload.selected)
        });
      case actionTypes.REMOVE_SELECTED:
        filteredSelected = _.filter(state.selected, selected => selected._id !== action.payload.id);
        return Object.assign({}, state, { selected: filteredSelected });
      case actionTypes.SET_LOADING_SELECTED_CHILDREN:
        return Object.assign({}, state, { loadingSelectedChildren: action.payload.loadingSelectedChildren });
      case actionTypes.SET_LOADING_SELECTED_REPORTS:
        return Object.assign({}, state, { loadingSelectedReports: action.payload.loadingSelectedReports });
      case actionTypes.RECEIVE_SELECTED_CHILDREN:
        return Object.assign({}, state, {
          selected: Object.assign({}, state.selected, { children: action.payload.children }),
          loadingSelectedChildren: false
        });
      case actionTypes.RECEIVE_SELECTED_REPORTS:
        return Object.assign({}, state, {
          selected: Object.assign({}, state.selected, { reports: action.payload.reports }),
          loadingSelectedReports: false
        });
      case actionTypes.SET_LAST_CHANGED_DOC:
        return Object.assign({}, state, { lastChangedDoc: action.payload.lastChangedDoc });
      default:
        return state;
    }
  });
}());
