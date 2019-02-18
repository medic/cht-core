var _ = require('underscore');

(function() {
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

  module.exports = function(state, action) {
    if (typeof state === 'object' && Object.keys(state).length === 0) {
      state = initialState;
    }

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
      case 'SET_SELECTED_PROPERTY':
        return Object.assign({}, state, {
          selected: Object.assign({}, state.selected, action.payload.selected)
        });
      case 'SET_SELECTED_DOC_CHILD':
        return Object.assign({}, state, {
          selected: Object.assign({}, state.selected, {
            doc: Object.assign({}, state.selected.doc, action.payload.doc)
          })
        });
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
      case 'SET_FIRST_SELECTED_FORMATTED_PROPERTY':
        var newSelected = state.selected.slice(0);
        newSelected[0] = Object.assign({}, newSelected[0], {
          formatted: Object.assign({}, newSelected[0].formatted, action.payload.formatted)
        });
        return Object.assign({}, state, { selected: newSelected });
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
      default:
        return state;
    }
  };
}());
