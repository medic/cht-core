import { createReducer, on } from '@ngrx/store';

import { Actions } from '@mm-actions/target-aggregates';

export interface TargetAggregatesState {
  selected: object;
  targetAggregates: object[],
  error: boolean;
}

const initialState: TargetAggregatesState = {
  selected: null,
  targetAggregates: [],
  error: false,
};

const _targetAggregatesReducer = createReducer(
  initialState,
  on(Actions.setSelectedTargetAggregate, (state, { payload: { selected } }) => {
    return { ...state, selected };
  }),
  on(Actions.setTargetAggregates, (state, { payload: { targetAggregates } }) => {
    return { ...state, targetAggregates };
  }),
  on(Actions.setTargetAggregatesError, (state, { payload: { error } }) => {
    return { ...state, error };
  }),
);

export function targetAggregatesReducer(state, action) {
  return _targetAggregatesReducer(state, action);
}
