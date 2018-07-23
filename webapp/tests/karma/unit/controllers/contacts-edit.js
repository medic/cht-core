describe('Contacts Edit controller', () => {

  'use strict';

  let buttonLabel,
      childType,
      contactSchema,
      createController,
      icon,
      scope,
      typeLabel,
      $rootScope,
      contactForm,
      sessionStorage,
      spyState;

  beforeEach(module('inboxApp'));

  beforeEach(inject((_$rootScope_, $controller) => {
    childType = 'childType';
    icon = 'fa-la-la-la-la';
    buttonLabel = 'ClICK ME!!';
    typeLabel = 'District';
    contactForm = { forEdit: sinon.stub(), forCreate: sinon.stub() };
    sessionStorage = { get: sinon.stub() };
    $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    scope.setTitle = sinon.stub();
    scope.clearSelected = sinon.stub();
    scope.setShowContent = sinon.stub();
    scope.setCancelTarget = sinon.stub();
    contactSchema = {
      get: sinon.stub().returns({ icon: icon, addButtonLabel : buttonLabel, label: typeLabel, fields: { parent: '' } })
    };
    var $translate = key => Promise.resolve(key + 'translated');
    $translate.instant = key => key + 'translated';

    spyState = {
      go: sinon.spy(),
      current: { name: 'my.state.is.great' },
      includes: () => { return true; },
      params: { parent_id: 'id' }
    };

    createController = () => {
      return $controller('ContactsEditCtrl', {
        '$log': { error: sinon.stub() },
        '$q': Q,
        '$scope': scope,
        '$state': spyState,
        '$timeout': work => work(),
        '$translate': $translate,
        'ContactForm': contactForm,
        'ContactSave': sinon.stub(),
        'ContactSchema': contactSchema,
        'Enketo': sinon.stub(),
        'LineageModelGenerator': sinon.stub(),
        'Snackbar': sinon.stub(),
        'SessionStorage': sessionStorage
      });
    };
  }));

  it('cancelling directs to previous state if saved in session storage and valid', () => {
    let cancelTarget;
    sessionStorage.get.returns({ state: { name: 'somestate' }, params: 'someparams' });
    scope.setCancelTarget.callsFake(func => cancelTarget = func);

    createController();
    cancelTarget();
    chai.expect(sessionStorage.get.callCount).to.equal(1);
    chai.expect(spyState.go.callCount).to.equal(1);
    chai.expect(spyState.go.args[0]).to.deep.equal(['somestate', 'someparams']);
  });

  it('cancelling falls back to parent contact if prev state saved in session storage is not valid', () => {
    let cancelTarget;
    sessionStorage.get.returns({ state: { }, params: 'someparams' });
    scope.setCancelTarget.callsFake(func => cancelTarget = func);

    createController();
    cancelTarget();
    chai.expect(sessionStorage.get.callCount).to.equal(1);
    chai.expect(spyState.go.callCount).to.equal(1);
    chai.expect(spyState.go.args[0]).to.deep.equal([ 'contacts.detail', { 'id': 'id' } ]);
  });

  it('cancelling falls back to parent contact if prev state saved in session storage is not valid', () => {
    let cancelTarget;
    sessionStorage.get.returns({});
    scope.setCancelTarget.callsFake(func => cancelTarget = func);

    createController();
    cancelTarget();
    chai.expect(sessionStorage.get.callCount).to.equal(1);
    chai.expect(spyState.go.callCount).to.equal(1);
    chai.expect(spyState.go.args[0]).to.deep.equal([ 'contacts.detail', { 'id': 'id' } ]);
  });

  it('cancelling falls back to parent contact if previous state is not saved in session storage', () => {
    let cancelTarget;
    sessionStorage.get.returns(false);
    scope.setCancelTarget.callsFake(func => cancelTarget = func);

    createController();
    cancelTarget();
    chai.expect(sessionStorage.get.callCount).to.equal(1);
    chai.expect(spyState.go.callCount).to.equal(1);
    chai.expect(spyState.go.args[0]).to.deep.equal([ 'contacts.detail', { 'id': 'id' } ]);
  });

});
