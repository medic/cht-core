(function() {
  var initialState = {
    selected: null
  };

  module.exports = function(state, action) {
    if (typeof state === 'undefined') {
      state = initialState;
    }

    switch (action.type) {
      case 'ANALYTICS_SET_SELECTED':
        return Object.assign({}, state, { selected: action.payload.selected });
      default:
        return state;
    }
  };
}());
