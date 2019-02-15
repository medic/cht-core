(function() {
  var initialState = {
    selected: null
  };

  module.exports = function(state, action) {
    if (typeof state === 'undefined') {
      state = initialState;
    }

    switch (action.type) {
      case 'SET_SELECTED_CONTACT':
        return Object.assign({}, state, { selected: action.payload.selected });
      case 'SET_SELECTED_CONTACT_PROPERTY':
        return Object.assign({}, state, {
          selected: Object.assign({}, state.selected, action.payload.selected)
        });
      default:
        return state;
    }
  };
}());
