describe('HomeCtrl controller', () => {

  'use strict';

  let createController;
  let hasAuth;
  let state;

  beforeEach(module('inboxApp'));

  beforeEach(inject(($controller) => {
    hasAuth = sinon.stub();
    createController = () => {
      return $controller('HomeCtrl', {
        '$q': Q,
        $log: { error: sinon.stub() },
        $state: { go: state },
        Auth: {
          has: hasAuth,
        },
      });
    };
  }));

  it('handles no permissions', done => {
    hasAuth.resolves(false);
    state = stateName => {
      chai.expect(stateName).to.equal('error');
      done();
    };
    createController();
  });

  it('handles some permissions', done => {
    
    hasAuth
      .withArgs('can_view_messages_tab').resolves(false)
      .withArgs('can_view_tasks_tab').resolves(false)
      .withArgs('can_view_reports_tab').resolves(true)
      .withArgs('can_view_analytics_tab').resolves(false)
      .withArgs('can_view_contacts_tab').resolves(true);
    state = stateName => {
      chai.expect(stateName).to.equal('reports.detail');
      done();
    };
    createController();

  });

});
