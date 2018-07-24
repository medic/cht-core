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
      spyState;

  beforeEach(module('inboxApp'));

  beforeEach(inject((_$rootScope_, $controller) => {
    childType = 'childType';
    icon = 'fa-la-la-la-la';
    buttonLabel = 'ClICK ME!!';
    typeLabel = 'District';
    contactForm = { forEdit: sinon.stub(), forCreate: sinon.stub() };
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
        'ContactForm': contactForm,
        'ContactSave': sinon.stub(),
        'ContactSchema': contactSchema,
        'Enketo': sinon.stub(),
        'LineageModelGenerator': { contact: sinon.stub().resolves() },
        'Snackbar': sinon.stub(),
        'SessionStorage': sessionStorage
      });
    };
  }));

  it('cancelling redirects to contacts list when route has redirectToList param', () => {
    let cancelTarget;
    spyState.params.redirectToList = true;
    scope.setCancelTarget.callsFake(func => cancelTarget = func);

    createController();
    cancelTarget();
    chai.expect(spyState.go.callCount).to.equal(1);
    chai.expect(spyState.go.args[0]).to.deep.equal([ 'contacts.detail', { id: null } ]);
  });

  it('cancelling falls back to parent contact if new contact and route does not have redirectToList', () => {
    let cancelTarget;
    scope.setCancelTarget.callsFake(func => cancelTarget = func);

    createController();
    cancelTarget();
    chai.expect(spyState.go.callCount).to.equal(1);
    chai.expect(spyState.go.args[0]).to.deep.equal([ 'contacts.detail', { 'id': 'parent_id' } ]);
  });

  it('cancelling falls back to contact if edit contact', () => {
    let cancelTarget;
    spyState.params.id = 'id';
    scope.setCancelTarget.callsFake(func => cancelTarget = func);

    createController();
    cancelTarget();
    chai.expect(spyState.go.callCount).to.equal(1);
    chai.expect(spyState.go.args[0]).to.deep.equal([ 'contacts.detail', { 'id': 'id' } ]);
  });

});
