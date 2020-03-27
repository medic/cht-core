describe('Contacts Edit controller', () => {

  'use strict';

  let globalActions;
  let contactTypes;
  let createController;
  let scope;
  let $rootScope;
  let contactForm;
  let spyState;

  beforeEach(() => {
    module('inboxApp');
    KarmaUtils.setupMockStore();
  });

  beforeEach(inject((_$rootScope_, $controller, $ngRedux, GlobalActions) => {
    contactForm = { forEdit: sinon.stub(), forCreate: sinon.stub() };
    const stubbedGlobalActions = { setCancelCallback: sinon.stub() };
    globalActions = Object.assign({}, GlobalActions($ngRedux.dispatch), stubbedGlobalActions);
    $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    scope.clearSelected = sinon.stub();
    contactTypes = { get: sinon.stub().resolves({}) };
    scope.settingSelected = sinon.stub();
    const $translate = key => Promise.resolve(key + 'translated');
    $translate.instant = key => key + 'translated';

    spyState = {
      go: sinon.spy(),
      current: { name: 'my.state.is.great' },
      includes: () => { return true; },
      params: { parent_id: 'parent_id' }
    };

    createController = () => {
      return $controller('ContactsEditCtrl', {
        '$log': { error: sinon.stub() },
        '$q': Q,
        '$scope': scope,
        '$state': spyState,
        '$timeout': work => work(),
        '$translate': $translate,
        'GlobalActions': () => globalActions,
        'ContactForm': contactForm,
        'ContactSave': sinon.stub(),
        'ContactTypes': contactTypes,
        'Enketo': sinon.stub(),
        'LineageModelGenerator': { contact: sinon.stub().resolves() },
        'Snackbar': sinon.stub(),
        'SessionStorage': sessionStorage,
        'XmlForms': sinon.stub().resolves()
      });
    };
  }));

  it('cancelling redirects to contacts list when query has `from` param equal to `list`', () => {
    let cancelCallback;
    spyState.params.from = 'list';
    globalActions.setCancelCallback.callsFake(func => cancelCallback = func);

    createController();
    cancelCallback();
    chai.expect(spyState.go.callCount).to.equal(1);
    chai.expect(spyState.go.args[0]).to.deep.equal([ 'contacts.detail', { id: null } ]);
  });

  it('cancelling falls back to parent contact if new contact and query `from` param is not equal to `list`', () => {
    let cancelCallback;
    spyState.params.from = 'something';
    globalActions.setCancelCallback.callsFake(func => cancelCallback = func);

    createController();
    cancelCallback();
    chai.expect(spyState.go.callCount).to.equal(1);
    chai.expect(spyState.go.args[0]).to.deep.equal([ 'contacts.detail', { 'id': 'parent_id' } ]);
  });

  it('cancelling falls back to parent contact if new contact and query does not have `from` param', () => {
    let cancelCallback;
    globalActions.setCancelCallback.callsFake(func => cancelCallback = func);

    createController();
    cancelCallback();
    chai.expect(spyState.go.callCount).to.equal(1);
    chai.expect(spyState.go.args[0]).to.deep.equal([ 'contacts.detail', { 'id': 'parent_id' } ]);
  });

  it('cancelling falls back to contact if edit contact', () => {
    let cancelCallback;
    spyState.params.id = 'id';
    globalActions.setCancelCallback.callsFake(func => cancelCallback = func);

    createController();
    cancelCallback();
    chai.expect(spyState.go.callCount).to.equal(1);
    chai.expect(spyState.go.args[0]).to.deep.equal([ 'contacts.detail', { 'id': 'id' } ]);
  });

});
