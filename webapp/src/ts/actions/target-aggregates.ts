import { Store } from '@ngrx/store';
import { createSingleValueAction } from '@mm-actions/actionUtils';

export const Actions = {
  setSelectedTargetAggregate: createSingleValueAction('SET_SELECTED_TARGET_AGGREGATE', 'selected'),
  setTargetAggregates: createSingleValueAction('SET_TARGET_AGGREGATES', 'targetAggregates'),
  setTargetAggregatesLoaded: createSingleValueAction('SET_TARGET_AGGREGATES_LOADED', 'targetAggregatesLoaded'),
  setTargetAggregatesError: createSingleValueAction('SET_TARGET_AGGREGATES_ERROR', 'error'),
};

export class TargetAggregatesActions {
  constructor(private store: Store) {}

  setSelectedTargetAggregate(selected) {
    return this.store.dispatch(Actions.setSelectedTargetAggregate(selected));
  }

  setTargetAggregates(targetAggregates) {
    return this.store.dispatch(Actions.setTargetAggregates(targetAggregates));
  }

  setTargetAggregatesLoaded(targetAggregatesLoaded) {
    return this.store.dispatch(Actions.setTargetAggregatesLoaded(targetAggregatesLoaded));
  }

  setTargetAggregatesError(error) {
    return this.store.dispatch(Actions.setTargetAggregatesError(error));
  }
}
