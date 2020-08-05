describe('PrivacyPolicyCtrl controller', () => {

  'use strict';

  let createController;
  let privacyPolicies;
  let scope;
  let getGlobalState;
  let globalActions;

  beforeEach(() => {
    module('inboxApp');
    KarmaUtils.setupMockStore();
  });

  afterEach(() => sinon.restore());

  beforeEach(inject(($controller, _$rootScope_, $ngRedux, Selectors, GlobalActions) => {
    const $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    privacyPolicies = {
      getPrivacyPolicy: sinon.stub(),
      accept: sinon.stub(),
    };
    getGlobalState = () => Selectors.getGlobalState($ngRedux.getState());
    globalActions = GlobalActions($ngRedux.dispatch);

    createController = () => {
      return $controller('PrivacyPolicyCtrl', {
        '$scope': scope,
        'PrivacyPolicies': privacyPolicies,
        'GlobalActions': () => globalActions,
      });
    };
  }));

  it('loads when no privacy policy', () => {
    privacyPolicies.getPrivacyPolicy.resolves(false);
    globalActions.setShowPrivacyPolicy(true);
    globalActions.setPrivacyPolicyAccepted(true);
    const ctrl = createController();
    chai.expect(ctrl.loading).to.equal(true);
    return ctrl.setupPromise.then(() => {
      chai.expect(privacyPolicies.getPrivacyPolicy.callCount).to.equal(1);
      chai.expect(ctrl.privacyPolicy).to.equal(undefined);
      chai.expect(ctrl.loading).to.equal(false);
      const state = getGlobalState();
      chai.expect(state.showPrivacyPolicy).to.equal(false);
      chai.expect(state.privacyPolicyAccepted).to.equal(true);
    });
  });

  it('should load when privacy policy exists', () => {
    privacyPolicies.getPrivacyPolicy.resolves({
      html: 'html',
      digest: 'digest',
      language: 'en',
    });
    globalActions.setShowPrivacyPolicy(true);
    globalActions.setPrivacyPolicyAccepted(true);
    const ctrl = createController();
    chai.expect(ctrl.loading).to.equal(true);
    return ctrl.setupPromise.then(() => {
      chai.expect(privacyPolicies.getPrivacyPolicy.callCount).to.equal(1);
      chai.expect(ctrl.privacyPolicy).to.deep.equal({
        html: 'html',
        digest: 'digest',
        language: 'en',
      });
      chai.expect(ctrl.loading).to.equal(false);
      const state = getGlobalState();
      chai.expect(state.showPrivacyPolicy).to.equal(true);
      chai.expect(state.privacyPolicyAccepted).to.equal(true);
    });
  });

  it('should accept privacy policy', () => {
    privacyPolicies.getPrivacyPolicy.resolves({
      html: 'html',
      digest: 'my_digest',
      language: 'fr',
    });
    privacyPolicies.accept.resolves();
    globalActions.setShowPrivacyPolicy(true);
    globalActions.setPrivacyPolicyAccepted(false);

    const ctrl = createController();
    chai.expect(ctrl.loading).to.equal(true);
    return ctrl
      .setupPromise
      .then(() => {
        const state = getGlobalState();
        chai.expect(state.showPrivacyPolicy).to.equal(true);
        chai.expect(state.privacyPolicyAccepted).to.equal(false);

        chai.expect(ctrl.privacyPolicy).to.deep.equal({
          html: 'html',
          digest: 'my_digest',
          language: 'fr',
        });

        chai.expect(privacyPolicies.accept.callCount).to.equal(0);

        return ctrl.accept();
      })
      .then(() => {
        const state = getGlobalState();
        chai.expect(state.showPrivacyPolicy).to.equal(true);
        chai.expect(state.privacyPolicyAccepted).to.equal(true);
        chai.expect(privacyPolicies.accept.callCount).to.equal(1);
        chai.expect(privacyPolicies.accept.args[0]).to.deep.equal([{
          html: 'html',
          digest: 'my_digest',
          language: 'fr',
        }]);
      });
  });
});
