import { Actions } from '../actions/analytics';
import { createReducer, on } from '@ngrx/store';
const initialState = {
  selected: null
};

const _analyticsReducer = createReducer(
  initialState,
  on(Actions.setSelectedAnalytics, (state, { payload: { selected } }) => {
    return { ...state, selected };
  })
);

export function analyticsReducer(state, action) {
  return _analyticsReducer(state, action);
}
