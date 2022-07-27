import { Store } from '@ngrx/store';

import { createSingleValueAction } from '@mm-actions/actionUtils';

export const Actions = {
  setAnalyticsModules: createSingleValueAction('SET_ANALYTICS_MODULES', 'analyticsModules'),
};

export class AnalyticsActions {
  constructor(private store: Store) {}

  setAnalyticsModules(analyticsModules) {
    return this.store.dispatch(Actions.setAnalyticsModules(analyticsModules));
  }
}

