import sinon from 'sinon';
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

  it('should update snackbar content with a message', () => {
    const message = 'this is just a random text';
    expect(globalReducer(state, Actions.setSnackbarContent({ message }))).to.deep.equal({
      snackbarContent: { message, action: undefined },
    });
  });

  it('should update snackbar content with a message and an action', () => {
    const content = {
      message: 'this is just a random text',
      action: {
        label: 'click me',
        onClick: sinon.stub(),
      },
    };
    expect(globalReducer(state, Actions.setSnackbarContent(content))).to.deep.equal({
      snackbarContent: content,
    });
  });

  it('should update loading content', () => {
    expect(globalReducer(state, Actions.setLoadingContent(true))).to.deep.equal({ loadingContent: true });
    expect(globalReducer(state, Actions.setLoadingContent(false))).to.deep.equal({ loadingContent: false });
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

  it('should clear all filters', () => {
    state = {
      filters: {
        date: { from: 1, to: 22 },
        forms: [{ _id: 'form1' }, { _id: 'form2' }],
        search: 'lalala'
      },
    };
    state = globalReducer(state, Actions.clearFilters(undefined));
    expect(state).to.deep.equal({ filters: {} });
  });

  it('should skip one and clear the other filters', () => {
    state = {
      filters: {
        date: { from: 1, to: 22 },
        forms: [{ _id: 'form1' }, { _id: 'form2' }],
        search: 'lalala'
      },
    };
    state = globalReducer(state, Actions.clearFilters('search'));
    expect(state).to.deep.equal({ filters: { search: 'lalala' } });
  });

  it('should clear all filters if skip is not found', () => {
    state = {
      filters: {
        date: { from: 1, to: 22 },
        forms: [{ _id: 'form1' }, { _id: 'form2' }],
      },
    };
    state = globalReducer(state, Actions.clearFilters('search'));
    expect(state).to.deep.equal({ filters: {} });
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

  it('should clear sidebarFilter', () => {
    state = {
      sidebarFilter: {
        isOpen: false,
        filterCount: {
          total: 5,
          placeFilter: 3,
          formFilter: 2
        },
      },
    };

    state = globalReducer(state, Actions.clearSidebarFilter());

    expect(state).to.deep.equal({ sidebarFilter: {} });
  });

  it('should set correct enketo status', () => {
    state = globalReducer(state, Actions.setEnketoStatus({ edited: true }));
    expect(state).to.deep.equal({ enketoStatus: { edited: true, form: true } });

    state = globalReducer(state, Actions.setEnketoStatus({ saving: true }));
    expect(state).to.deep.equal({ enketoStatus: { edited: true, saving: true, form: true }});

    state = globalReducer(state, Actions.setEnketoStatus({ saving: false, edited: false }));
    expect(state).to.deep.equal({ enketoStatus: { edited: false, saving: false, form: true }});

    state = globalReducer(state, Actions.setEnketoStatus({ error: 'some error' }));
    expect(state).to.deep.equal({ enketoStatus: { edited: false, saving: false, error: 'some error', form: true }});
  });

  it('should clear enketo status', () => {
    state = globalReducer(state, Actions.clearEnketoStatus());
    expect(state).to.deep.equal({ enketoStatus: { edited: false, form: false, saving: false, error: null } });

    state.enketoStatus = { form: true, edited: false };
    state = globalReducer(state, Actions.clearEnketoStatus());
    expect(state).to.deep.equal({ enketoStatus: { edited: false, form: false, saving: false, error: null } });
  });

  it('should set cancel callback', () => {
    const callback = () => 'anything';
    state = globalReducer(state, Actions.setCancelCallback(callback));
    expect(state).to.deep.equal({ navigation: { cancelCallback: callback } });
    expect(state.navigation.cancelCallback()).to.equal('anything');

    const otherCallback = () => 'otherthing';
    state = globalReducer(state, Actions.setCancelCallback(otherCallback));
    expect(state).to.deep.equal({ navigation: { cancelCallback: otherCallback } });
    expect(state.navigation.cancelCallback()).to.equal('otherthing');

    state = globalReducer(state, Actions.setCancelCallback(null));
    expect(state).to.deep.equal({ navigation: { cancelCallback: null } });
  });

  it('should set navigation', () => {
    state = globalReducer(state, Actions.setNavigation({}));
    expect(state).to.deep.equal({
      navigation: {
        cancelCallback: undefined,
        preventNavigation: undefined,
        cancelTranslationKey: undefined,
        recordTelemetry: undefined,
      },
    });

    const callback = () => 'something';
    state = globalReducer(state, Actions.setNavigation({ cancelCallback: callback }));
    expect(state).to.deep.equal({
      navigation: {
        cancelCallback: callback,
        preventNavigation: undefined,
        cancelTranslationKey: undefined,
        recordTelemetry: undefined,
      },
    });

    state = globalReducer(state, Actions.setNavigation({ preventNavigation: true }));
    expect(state).to.deep.equal({
      navigation: {
        cancelCallback: undefined,
        preventNavigation: true,
        cancelTranslationKey: undefined,
        recordTelemetry: undefined,
      },
    });

    state = globalReducer(state, Actions.setNavigation({ cancelTranslationKey: 'my key' }));
    expect(state).to.deep.equal({
      navigation: {
        cancelCallback: undefined,
        preventNavigation: undefined,
        cancelTranslationKey: 'my key',
        recordTelemetry: undefined,
      },
    });

    state = globalReducer(state, Actions.setNavigation({ recordTelemetry: 'telemetry.entry' }));
    expect(state).to.deep.equal({
      navigation: {
        cancelCallback: undefined,
        preventNavigation: undefined,
        cancelTranslationKey: undefined,
        recordTelemetry: 'telemetry.entry',
      },
    });

    state = globalReducer(state, Actions.setNavigation({
      cancelCallback: callback,
      preventNavigation: false,
      recordTelemetry: '.entry',
      cancelTranslationKey: 'a key'
    }));
    expect(state).to.deep.equal({
      navigation: {
        cancelCallback: callback,
        preventNavigation: false,
        cancelTranslationKey: 'a key',
        recordTelemetry: '.entry',
      },
    });

    state = globalReducer(state, Actions.setNavigation({
      cancelCallback: callback,
      preventNavigation: false,
      recordTelemetry: '.entry',
      cancelTranslationKey: 'a key',
      extra: 'property',
      is: !'saved',
    }));
    expect(state).to.deep.equal({
      navigation: {
        cancelCallback: callback,
        preventNavigation: false,
        cancelTranslationKey: 'a key',
        recordTelemetry: '.entry',
      },
    });
  });

  it('should set preventNavigation', () => {
    state = globalReducer(state, Actions.setPreventNavigation(false));
    expect(state).to.deep.equal({ navigation: { preventNavigation: false } });

    state = globalReducer(state, Actions.setPreventNavigation(true));
    expect(state).to.deep.equal({ navigation: { preventNavigation: true } });

    const callback = () => {};
    state.navigation = { cancelCallback: callback, cancelTranslationKey: 'a', recordTelemetry: 'b' };
    state = globalReducer(state, Actions.setPreventNavigation(true));
    expect(state).to.deep.equal({
      navigation: {
        cancelCallback: callback,
        cancelTranslationKey: 'a',
        recordTelemetry: 'b',
        preventNavigation: true,
      },
    });
  });

  it('should set selectMode in state', () => {
    state = globalReducer(state, Actions.setSelectMode(true));
    expect(state).to.deep.equal({ selectMode: true });

    state = globalReducer(state, Actions.setSelectMode(false));
    expect(state).to.deep.equal({ selectMode: false });
  });

  it('should set processingReportVerification in state', () => {
    state = globalReducer(state, Actions.setProcessingReportVerification(true));
    expect(state).to.deep.equal({ processingReportVerification: true });

    state = globalReducer(state, Actions.setProcessingReportVerification(false));
    expect(state).to.deep.equal({ processingReportVerification: false });
  });

  it('should set showContent in state', () => {
    state = globalReducer(state, Actions.setShowContent(true));
    expect(state).to.deep.equal({ showContent: true });

    state = globalReducer(state, Actions.setShowContent(false));
    expect(state).to.deep.equal({ showContent: false });
  });

  it('should set trainingCard in state', () => {
    state = globalReducer(state, Actions.setTrainingCard({ formId: 'training:new_change' }));
    expect(state).to.deep.equal({ trainingCard: { formId: 'training:new_change' } });

    state = globalReducer(state, Actions.setTrainingCard({ formId: 'training:another_new_change' }));
    expect(state).to.deep.equal({ trainingCard: { formId: 'training:another_new_change' } });
  });

  it('should set userFacilityIds in state', () => {
    state = globalReducer(state, Actions.setUserFacilityIds('facility_id'));
    expect(state).to.deep.equal({ userFacilityIds: ['facility_id'] });

    state = globalReducer(state, Actions.setUserFacilityIds('other'));
    expect(state).to.deep.equal({ userFacilityIds: ['other'] });

    state = globalReducer(state, Actions.setUserFacilityIds(['others']));
    expect(state).to.deep.equal({ userFacilityIds: ['others'] });
  });

  it('should set userContactId in state', () => {
    state = globalReducer(state, Actions.setUserContactId('contact_id'));
    expect(state).to.deep.equal({ userContactId: 'contact_id' });

    state = globalReducer(state, Actions.setUserContactId('other'));
    expect(state).to.deep.equal({ userContactId: 'other' });
  });
});
