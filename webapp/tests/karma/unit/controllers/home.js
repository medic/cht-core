describe('HomeCtrl controller', () => {

  'use strict';

  let createController;
  let Auth;
  let state;

  beforeEach(module('inboxApp'));

  beforeEach(inject(($controller) => {
    Auth = sinon.stub();
    createController = () => {
      return $controller('HomeCtrl', {
        '$q': Q,
        $log: { error: sinon.stub() },
        $state: { go: state },
        Auth: Auth
      });
    };
  }));

  it('handles no permissions', done => {
    Auth.rejects();
    state = stateName => {
      chai.expect(stateName).to.equal('error');
      done();
    };
    createController();
  });

  it('handles some permissions', done => {
    
    Auth
      .withArgs('can_view_messages_tab').rejects()
      .withArgs('can_view_tasks_tab').rejects()
      .withArgs('can_view_reports_tab').resolves()
      .withArgs('can_view_analytics_tab').rejects()
      .withArgs('can_view_contacts_tab').resolves();
    state = stateName => {
      chai.expect(stateName).to.equal('reports.detail');
      done();
    };
    createController();

  });

});
