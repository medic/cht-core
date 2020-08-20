describe('StartupModalsCtrl controller', () => {

  'use strict';

  let session;
  let updateSettings;
  let userSettings;
  let updateUser;
  let tour;
  let settings;
  let actions;
  let createController;

  beforeEach(module('inboxApp'));

  beforeEach(inject(($controller, $rootScope) => {
    session = { userCtx: sinon.stub() };
    updateSettings = sinon.stub();
    updateUser = sinon.stub();
    tour = { getTours: sinon.stub() };
    settings = sinon.stub();
    userSettings = sinon.stub();
    actions = {};

    createController = () => {
      return $controller('StartupModalsCtrl', {
        '$q': Q,
        '$scope': $rootScope.$new(),
        'GlobalActions': sinon.stub().resolves(actions),
        'Modal': sinon.stub().resolves(),
        'Session': session,
        'Settings': settings,
        'Tour': tour,
        'UpdateUser': updateUser,
        'UpdateSettings': updateSettings,
        'UserSettings': userSettings,
      });
    };
  }));


  it('Tour modal should not be displayed if no tours are available', () => {
    settings.resolves({ setup_complete: true });
    userSettings.resolves({ name: 'person' });
    tour.getTours.resolves([]);
    session.userCtx.returns({ name: 'no_error'});
    const ctrl = createController();
    return ctrl.setupPromise.then(() => {
      chai.expect(updateUser.callCount).to.equal(0);
    });
  });

  it('Tour modal should be displayed if tours are available', () => {
    tour.getTours.resolves([{}]);
    session.userCtx.returns({ name: 'no_error'});
    settings.resolves({ setup_complete: true });
    userSettings.resolves({ name: 'person' });
    const ctrl = createController();
    ctrl.openTourSelect = sinon.stub().resolves();
    return ctrl.setupPromise.then(() => {
      chai.expect(updateUser.callCount).to.equal(1);
      chai.expect(updateUser.args[0]).to.deep.equal(['no_error', { known: true }]);
    });
  });
});
