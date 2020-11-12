import { Store } from '@ngrx/store';
import { createSingleValueAction } from './actionUtils';

export const Actions = {
  setSelectedAnalytics: createSingleValueAction('SET_SELECTED_ANALYTICS', 'selected'),
  setAnalyticsModules: createSingleValueAction('SET_ANALYTICS_MODULES', 'analyticsModules'),
};

export class AnalyticsActions {
  constructor(private store: Store) {}

  setSelectedAnalytics(selected) {
    return this.store.dispatch(Actions.setSelectedAnalytics(selected));
  }

  setAnalyticsModules(analyticsModules) {
    return this.store.dispatch(Actions.setAnalyticsModules(analyticsModules));
  }
}

