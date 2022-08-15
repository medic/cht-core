import { createReducer, on } from '@ngrx/store';

import { Actions } from '@mm-actions/analytics';

const initialState = {
  selected: null,
  analyticsModules: null
};

const _analyticsReducer = createReducer(
  initialState,
  on(Actions.setAnalyticsModules, (state, { payload: { analyticsModules } }) => {
    return { ...state, analyticsModules: analyticsModules || [] };
  }),
);

export const analyticsReducer = (state, action) => {
  return _analyticsReducer(state, action);
};
