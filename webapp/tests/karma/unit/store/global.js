describe('Global store', () => {
  'use strict';

  let globalActions;
  let getState;
  let selectors;

  beforeEach(module('inboxApp'));

  const setupStore = initialState => {
    KarmaUtils.setupMockStore(initialState);
    inject(($ngRedux, GlobalActions, Selectors) => {
      globalActions = GlobalActions($ngRedux.dispatch);
      getState = $ngRedux.getState;
      selectors = Selectors;
    });
  };

  const createGlobalState = state => ({ global: state });

  it('clears cancelCallback', () => {
    const initialState = createGlobalState({ cancelCallback: 'test' });
    setupStore(initialState);
    globalActions.clearCancelCallback();
    const state = getState();
    const globalState = selectors.getGlobalState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(globalState).to.deep.equal({ cancelCallback: null });
  });

  it('sets cancelCallback', () => {
    const initialState = createGlobalState({ cancelCallback: null });
    setupStore(initialState);
    const cancelCallback = 'test';
    globalActions.setCancelCallback(cancelCallback);
    const state = getState();
    const globalState = selectors.getGlobalState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(globalState).to.deep.equal({ cancelCallback });
  });

  it('sets enketoError', () => {
    const initialState = createGlobalState({
      enketoStatus: { error: null }
    });
    setupStore(initialState);
    const error = 'test';
    globalActions.setEnketoError(error);
    const state = getState();
    const globalState = selectors.getGlobalState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(globalState.enketoStatus).to.not.equal(initialState.enketoStatus);
    chai.expect(globalState).to.deep.equal({ enketoStatus: { error } });
  });

  it('sets enketoEditedStatus', () => {
    const initialState = createGlobalState({
      enketoStatus: { edited: false }
    });
    setupStore(initialState);
    globalActions.setEnketoEditedStatus(true);
    const state = getState();
    const globalState = selectors.getGlobalState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(globalState.enketoStatus).to.not.equal(initialState.enketoStatus);
    chai.expect(globalState).to.deep.equal({ enketoStatus: { edited: true } });
  });

  it('sets enketoSavingStatus', () => {
    const initialState = createGlobalState({
      enketoStatus: { saving: false }
    });
    setupStore(initialState);
    globalActions.setEnketoSavingStatus(true);
    const state = getState();
    const globalState = selectors.getGlobalState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(globalState.enketoStatus).to.not.equal(initialState.enketoStatus);
    chai.expect(globalState).to.deep.equal({ enketoStatus: { saving: true } });
  });

  it('sets selectMode', () => {
    const initialState = createGlobalState({ selectMode: false });
    setupStore(initialState);
    globalActions.setSelectMode(true);
    const state = getState();
    const globalState = selectors.getGlobalState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(globalState).to.deep.equal({ selectMode: true });
  });

  it('sets loadingContent', () => {
    const initialState = createGlobalState({ loadingContent: false });
    setupStore(initialState);
    globalActions.setLoadingContent(true);
    const state = getState();
    const globalState = selectors.getGlobalState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(globalState).to.deep.equal({ loadingContent: true });
  });

  it('sets loadingSubActionBar', () => {
    const initialState = createGlobalState({ loadingSubActionBar: false });
    setupStore(initialState);
    globalActions.setLoadingSubActionBar(true);
    const state = getState();
    const globalState = selectors.getGlobalState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(globalState).to.deep.equal({ loadingSubActionBar: true });
  });

  it('sets showActionBar', () => {
    const initialState = createGlobalState({ showActionBar: false });
    setupStore(initialState);
    globalActions.setShowActionBar(true);
    const state = getState();
    const globalState = selectors.getGlobalState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(globalState).to.deep.equal({ showActionBar: true });
  });

  it('sets showContent', () => {
    const initialState = createGlobalState({ showContent: false });
    setupStore(initialState);
    globalActions.setShowContent(true);
    const state = getState();
    const globalState = selectors.getGlobalState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(globalState).to.deep.equal({ showContent: true });
  });

});
