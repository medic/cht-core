describe('Analytics store', () => {
  'use strict';

  let analyticsActions;
  let selectors;
  let getState;

  beforeEach(module('inboxApp'));

  const setupStore = initialState => {
    KarmaUtils.setupMockStore(initialState);
    inject(($ngRedux, AnalyticsActions, Selectors) => {
      analyticsActions = AnalyticsActions($ngRedux.dispatch);
      getState = $ngRedux.getState;
      selectors = Selectors;
    });
  };

  const createAnalyticsState = state => ({ analytics: state });

  it('sets selected analytics', () => {
    const initialState = createAnalyticsState({ selected: null });
    setupStore(initialState);
    const selected = {};
    analyticsActions.setSelectedAnalytics(selected);
    const state = getState();
    const analyticsState = selectors.getAnalyticsState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(analyticsState).to.deep.equal({ selected });
  });

});
