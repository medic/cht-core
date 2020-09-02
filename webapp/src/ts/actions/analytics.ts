import { Store } from '@ngrx/store';
import { createSingleValueAction } from './actionUtils';

export const Actions = {
  setSelectedAnalytics: createSingleValueAction('SET_SELECTED_ANALYTICS', 'selected'),
}

export class AnalyticsActions {
  constructor(private store: Store) {}

  setSelectedAnalytics(selected) {
    return this.store.dispatch(Actions.setSelectedAnalytics(selected));
  }
}

