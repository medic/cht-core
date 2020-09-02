import { Actions } from '../actions/analytics';
import { createReducer, on } from '@ngrx/store';
const initialState = {
  selected: null
};

const _analyticsReducer = createReducer(
  initialState,
  on(Actions.setSelectedAnalytics, (state, { payload: { selected } }) => {
    return Object.assign({}, state, { selected });
  })
);

export function analyticsReducer(state, action) {
  return _analyticsReducer(state, action);
}
