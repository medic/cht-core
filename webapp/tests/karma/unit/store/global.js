describe('Global store', () => {
  'use strict';

  let globalActions;
  let getState;
  let selectors;
  let stubModal;
  let spyState;

  const dummyId = 'dummydummy';

  beforeEach(module('inboxApp'));

  const setupStore = initialState => {
    KarmaUtils.setupMockStore(initialState);
    module($provide => {
      $provide.value('$q', Q);
      $provide.factory('Modal', () => {
        stubModal = sinon.stub();
        // ConfirmModal : Always return as if user clicked delete. This ignores the DeleteDocs
        // altogether. The calling of the processingFunction is tested in
        // modal.js, not here.
        stubModal.returns(Promise.resolve());
        return stubModal;
      });
      $provide.factory('$state', () => {
        spyState = {
          go: sinon.spy(),
          current: { name: 'my.state.is.great' },
          includes: () => true,
        };
        return spyState;
      });
    });
    inject(($ngRedux, GlobalActions, Selectors) => {
      globalActions = GlobalActions($ngRedux.dispatch);
      getState = $ngRedux.getState;
      selectors = Selectors;
    });
    spyState.go.resetHistory();
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

  describe('deleteDoc', () => {

    beforeEach(() => {
      const initialState = createGlobalState({ showContent: false });
      setupStore(initialState);
    });

    it('navigates back to contacts state after deleting contact', () => {
      return globalActions.deleteDoc(dummyId).then(() => {
        chai.assert(spyState.go.called, 'Should change state');
        chai.expect(spyState.go.args[0][0]).to.equal(spyState.current.name);
        chai.expect(spyState.go.args[0][1]).to.deep.equal({ id: null });
      });
    });

    it('does not change state after deleting message', () => {
      spyState.includes = state => state === 'messages';
      return globalActions.deleteDoc(dummyId).then(() => {
        chai.assert.isFalse(spyState.go.called, 'state change should not happen');
      });
    });

    it('does not deleteContact if user cancels modal', () => {
      stubModal.reset();
      stubModal.returns(Promise.reject({ err: 'user cancelled' }));
      return globalActions.deleteDoc(dummyId).then(() => {
        chai.assert.isFalse(spyState.go.called, 'state change should not happen');
      });
    });

  });

});
