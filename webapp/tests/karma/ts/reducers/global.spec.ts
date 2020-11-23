import { expect } from 'chai';

import { Actions } from '@mm-actions/global';
import { globalReducer } from '@mm-reducers/global';

describe('Global Reducer', () => {
  let state;
  beforeEach(() => state = {});

  it('should add replication status', () => {
    const replicationStatus = { a: 1, b: 2 };
    const action = Actions.updateReplicationStatus(replicationStatus);
    state = globalReducer(state, action);

    expect(state).to.deep.equal({
      replicationStatus: { a: 1, b: 2 },
    });
  });

  it('should merge replication status', () => {
    const replicationStatus = { a: 1, b: 2 };
    state = { replicationStatus: { a: 2, c: 3 } };
    const action = Actions.updateReplicationStatus(replicationStatus);
    state = globalReducer(state, action);

    expect(state).to.deep.equal({
      replicationStatus: { a: 1, b: 2, c: 3 },
    });
  });

  it('should set android app version', () => {
    const version = '0.0.123';
    expect(globalReducer(state, Actions.setAndroidAppVersion(version))).to.deep.equal({
      androidAppVersion: '0.0.123',
    });
  });

  it('should update minimal tabs', () => {
    expect(globalReducer(state, Actions.setMinimalTabs(true))).to.deep.equal({ minimalTabs: true });
    expect(globalReducer(state, Actions.setMinimalTabs(false))).to.deep.equal({ minimalTabs: false });
  });

  it('should update snackbar content', () => {
    const content = 'this is just a random text';
    expect(globalReducer(state, Actions.setSnackbarContent(content))).to.deep.equal({
      snackbarContent: content,
    });
  });

  it('should update loading content', () => {
    expect(globalReducer(state, Actions.setLoadingContent(true))).to.deep.equal({ loadingContent: true });
    expect(globalReducer(state, Actions.setLoadingContent(false))).to.deep.equal({ loadingContent: false });
  });

  it('should update show action bar', () => {
    expect(globalReducer(state, Actions.setShowActionBar('yes'))).to.deep.equal({ showActionBar: 'yes' });
    expect(globalReducer(state, Actions.setShowActionBar('no'))).to.deep.equal({ showActionBar: 'no' });
  });

  it('should set forms', () => {
    const forms = [
      { _id: 'form1', some: 'data1' },
      { _id: 'form2', some: 'data2' },
      { _id: 'form3', some: 'data3' },
    ];
    state = globalReducer(state, Actions.setForms(forms));
    expect(state).to.deep.equal({
      forms: [
        { _id: 'form1', some: 'data1' },
        { _id: 'form2', some: 'data2' },
        { _id: 'form3', some: 'data3' },
      ],
    });
    const updatedForms = [
      { _id: 'form3', some: 'data2222' },
      { _id: 'form4', some: 'data4444' },
    ];
    state = globalReducer(state, Actions.setForms(updatedForms));
    expect(state).to.deep.equal({
      forms: [
        { _id: 'form3', some: 'data2222' },
        { _id: 'form4', some: 'data4444' },
      ],
    });
  });

  it('should clear filters', () => {
    state = {
      filters: {
        date: { from: 1, to: 22 },
        forms: [{ _id: 'form1' }, { _id: 'form2' }],
        search: 'lalala'
      },
    };
    state = globalReducer(state, Actions.clearFilters());
    expect(state).to.deep.equal({ filters: {} });
  });

  it('should set filters', () => {
    state = {};
    state = globalReducer(state, Actions.setFilters({ search: 'aaaaa' }));
    expect(state).to.deep.equal({ filters: { search: 'aaaaa' } });

    state = globalReducer(state, Actions.setFilters({ forms: [{ id: 'f1' }, { id: 'f2' }] }));
    expect(state).to.deep.equal({ filters: { forms: [{ id: 'f1' }, { id: 'f2' }] } });

    state = globalReducer(state, Actions.setFilters({ some: 'thing' }));
    expect(state).to.deep.equal({ filters: { some: 'thing' } });
  });

  it('should set filter', () => {
    state = {};
    state = globalReducer(state, Actions.setFilter({ search: 'aaaaa' }));
    expect(state).to.deep.equal({ filters: { search: 'aaaaa' } });

    state = globalReducer(state, Actions.setFilter({ forms: [{ id: 'f1' }, { id: 'f2' }] }));
    expect(state).to.deep.equal({ filters: { search: 'aaaaa', forms: [{ id: 'f1' }, { id: 'f2' }] } });

    state = globalReducer(state, Actions.setFilter({ forms: [{ id: 'f2' }, { id: 'f3' }] }));
    expect(state).to.deep.equal({ filters: { search: 'aaaaa', forms: [{ id: 'f2' }, { id: 'f3' }] } });
  });

  it('should set is Admin', () => {
    expect(globalReducer(state, Actions.setIsAdmin(true))).to.deep.equal({ isAdmin: true });
    expect(globalReducer(state, Actions.setIsAdmin(false))).to.deep.equal({ isAdmin: false });
  });

  it('should set left action bar', () => {
    const left = { some: 'settings' };

    expect(globalReducer(state, Actions.setLeftActionBar(left))).to.deep.equal({ actionBar: { left } });
    expect(globalReducer(state, Actions.setLeftActionBar(null))).to.deep.equal({ actionBar: { left: null } });
  });

  it('should set correct enketo status', () => {
    state = globalReducer(state, Actions.setEnketoStatus({ edited: true }));
    expect(state).to.deep.equal({ enketoStatus: { edited: true } });

    state = globalReducer(state, Actions.setEnketoStatus({ saving: true }));
    expect(state).to.deep.equal({ enketoStatus: { edited: true, saving: true }});

    state = globalReducer(state, Actions.setEnketoStatus({ saving: false, edited: false }));
    expect(state).to.deep.equal({ enketoStatus: { edited: false, saving: false }});
  });

  it('should set cancel callback', () => {
    const callback = () => 'anything';
    state = globalReducer(state, Actions.setCancelCallback(callback));
    expect(state).to.deep.equal({ cancelCallback: callback });
    expect(state.cancelCallback()).to.equal('anything');

    const otherCallback = () => 'otherthing';
    state = globalReducer(state, Actions.setCancelCallback(otherCallback));
    expect(state).to.deep.equal({ cancelCallback: otherCallback });
    expect(state.cancelCallback()).to.equal('otherthing');
  });

  it('should set right action bar', () => {
    const right = { field: 'a', settings: 'b' };
    state = globalReducer(state, Actions.setRightActionBar(right));
    expect(state).to.deep.equal({ actionBar: { right } });

    const otherRight = { field: 'c', other: 'e' };
    state = globalReducer(state, Actions.setRightActionBar(otherRight));
    expect(state).to.deep.equal({ actionBar: { right: { field: 'c', other: 'e' }}});
  });

  it('should set action bar right verified', () => {
    state = globalReducer(state, Actions.setRightActionBarVerified(true));
    expect(state).to.deep.equal({ actionBar: { right: { verified: true } } });
    state = globalReducer(state, Actions.setRightActionBar({ some: 'fields' }));
    state = globalReducer(state, Actions.setRightActionBarVerified(true));
    expect(state).to.deep.equal({ actionBar: { right: { some: 'fields', verified: true } } });
    state = globalReducer(state, Actions.setRightActionBarVerified(false));
    expect(state).to.deep.equal({ actionBar: { right: { some: 'fields', verified: false } } });
  });
});
