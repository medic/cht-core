describe('Contacts Edit controller', () => {

  'use strict';

  let globalActions;
  let contactTypes;
  let createController;
  let scope;
  let $rootScope;
  let contactForm;
  let spyState;
  let lineageModelGenerator;
  let db;
  let enketo;

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
    contactTypes = { get: sinon.stub(), getTypeId: sinon.stub() };
    scope.settingSelected = sinon.stub();
    const $translate = key => Promise.resolve(key + 'translated');
    $translate.instant = key => key + 'translated';
    $translate.onReady = sinon.stub().resolves();
    lineageModelGenerator = { contact: sinon.stub() };
    db = { get: sinon.stub() };
    enketo = { renderContactForm: sinon.stub() };

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
        'DB': sinon.stub().returns(db),
        'Enketo': enketo,
        'LineageModelGenerator': lineageModelGenerator,
        'Snackbar': sinon.stub(),
        'SessionStorage': sessionStorage,
        'XmlForms': sinon.stub().resolves()
      });
    };
  }));

  const tick = () => new Promise(resolve => setTimeout(resolve, 20));

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
    lineageModelGenerator.contact.resolves({});

    createController();
    cancelCallback();
    chai.expect(spyState.go.callCount).to.equal(1);
    chai.expect(spyState.go.args[0]).to.deep.equal([ 'contacts.detail', { 'id': 'id' } ]);
  });

  it('should select correct form for correct type', () => {
    const contact = {
      _id: 'contact_uuid',
      type: 'person',
      contact_type: 'whatever',
    };
    const form = {
      _id: 'form:correct_edit_form',
      internal_id: 'correct_edit_form',
      type: 'form',
    };

    lineageModelGenerator.contact.resolves({ doc: contact });
    spyState.params.id = contact._id;
    contactTypes.getTypeId.returns('the correct type id');
    contactTypes.get.resolves({ id: 'the correct type id', edit_form: 'correct_edit_form' });
    db.get.resolves(form);

    const controller = createController();
    return tick().then(() => {
      chai.expect(lineageModelGenerator.contact.callCount).to.equal(1);
      chai.expect(lineageModelGenerator.contact.args[0]).to.deep.equal(['contact_uuid', { merge: true }]);
      chai.expect(contactTypes.getTypeId.callCount).to.equal(3);
      chai.expect(contactTypes.getTypeId.args[0]).to.deep.equal([contact]);
      chai.expect(contactTypes.getTypeId.args[1]).to.deep.equal([contact]);
      chai.expect(contactTypes.get.callCount).to.equal(1);
      chai.expect(contactTypes.get.args[0]).to.deep.equal(['the correct type id']);
      chai.expect(db.get.callCount).to.equal(1);
      chai.expect(db.get.args[0]).to.deep.equal(['correct_edit_form']);
      chai.expect(enketo.renderContactForm.callCount).to.equal(1);
      chai.expect(enketo.renderContactForm.args[0][1]).to.deep.equal(form);
      chai.expect(controller.contact).to.deep.equal(contact);
      chai.expect(controller.enketoContact).to.deep.equal({
        type: 'the correct type id',
        docId: 'contact_uuid',
        formInstance: undefined,
      });
    });
  });
});
