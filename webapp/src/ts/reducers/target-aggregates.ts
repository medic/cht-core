import { createReducer, on } from '@ngrx/store';

import { Actions } from '@mm-actions/target-aggregates';

export interface TargetAggregatesState {
  selected?: object;
  targetAggregates: object[];
  targetAggregatesLoaded: boolean;
  error: boolean;
}

const initialState: TargetAggregatesState = {
  selected: undefined,
  targetAggregates: [],
  targetAggregatesLoaded: false,
  error: false,
};

const _targetAggregatesReducer = createReducer(
  initialState,
  on(Actions.setSelectedTargetAggregate, (state, { payload: { selected } }) => {
    const newState = { ...state, selected };

    if (state.targetAggregates) {
      newState.targetAggregates = state.targetAggregates.map((target:any) => {
        return { ...target, selected: selected?.id === target.id };
      });
    }

    return newState;
  }),
  on(Actions.setTargetAggregates, (state, { payload: { targetAggregates } }) => {
    return { ...state, targetAggregates };
  }),
  on(Actions.setTargetAggregatesLoaded, (state, { payload: { targetAggregatesLoaded } }) => {
    return { ...state, targetAggregatesLoaded };
  }),
  on(Actions.setTargetAggregatesError, (state, { payload: { error } }) => {
    return { ...state, error };
  }),
);

export const targetAggregatesReducer = (state, action) => {
  return _targetAggregatesReducer(state, action);
};
