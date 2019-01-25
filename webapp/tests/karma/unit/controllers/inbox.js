describe('InboxCtrl controller', () => {

  'use strict';

  let createController,
      scope,
      snackbar,
      spyState,
      stubModal,
      dummyId = 'dummydummy',
      RecurringProcessManager,
      changes,
      changesListener = {},
      changesSpy,
      session
  ;

  beforeEach(() => {
    snackbar = sinon.stub();
    module('inboxApp');

    RecurringProcessManager = {
      startUpdateRelativeDate: sinon.stub(),
      stopUpdateRelativeDate: sinon.stub()
    };

    changes = (options) => {
      changesListener[options.key] = options;
    };
    changesSpy = sinon.spy(changes);

    session = {
      init: sinon.stub(),
      isAdmin: sinon.stub(),
      userCtx: sinon.stub(),
    };

    module($provide => {
      $provide.value('ActiveRequests', sinon.stub());
      $provide.value('Auth', () => Promise.resolve({}));
      $provide.value('Location', () => {
        return { path: 'localhost' };
      });
      $provide.value('DB', () => {
        return {
          query: KarmaUtils.nullPromise(),
          info: KarmaUtils.nullPromise(),
          get: KarmaUtils.nullPromise(),
        };
      });
      $provide.value('WatchDesignDoc', sinon.stub());
      $provide.value('DBSync', sinon.stub());
      $provide.value('Changes', changes);
      $provide.value('CheckDate', sinon.stub());
      $provide.value('Contact', sinon.stub());
      $provide.value('CountMessages', { init: sinon.stub() });
      $provide.value('DeleteDocs', KarmaUtils.nullPromise());
      $provide.value('XmlForms', sinon.stub());
      $provide.value('Contacts', sinon.stub());
      $provide.value('PlaceHierarchy', () => Promise.resolve());
      $provide.value('JsonForms', () => Promise.resolve({}));
      $provide.value('Language', () => Promise.resolve({}));
      $provide.value('LiveListConfig', sinon.stub());
      $provide.factory('Modal', () => {
        stubModal = sinon.stub();
        // ConfirmModal : Always return as if user clicked delete. This ignores the DeleteDocs
        // altogether. The calling of the processingFunction is tested in
        // modal.js, not here.
        stubModal.returns(Promise.resolve());
        return stubModal;
      });
      $provide.value('ReadMessages', sinon.stub());
      $provide.value('SendMessage', sinon.stub());
      $provide.value('Session', session);
      $provide.value('SetLanguageCookie', sinon.stub());
      $provide.value('Settings', () => KarmaUtils.nullPromise());
      $provide.value('Snackbar', () => snackbar);
      $provide.factory('$state', () => {
        spyState = {
          go: sinon.spy(),
          current: { name: 'my.state.is.great' },
          includes: () => { return true; }
        };
        return spyState;
      });
      $provide.value('$timeout', sinon.stub());
      $provide.value('UpdateUser', sinon.stub());
      $provide.value('UpdateSettings', sinon.stub());
      $provide.value('UserSettings', sinon.stub());
      $provide.value('Tour', { getTours: () => Promise.resolve([]) });
      $provide.value('RulesEngine', { init: KarmaUtils.nullPromise()() });
      $provide.value('RecurringProcessManager', RecurringProcessManager);
      $provide.value('Enketo', sinon.stub());
      $provide.constant('APP_CONFIG', {
        name: 'name',
        version: 'version'
      });
    });

    inject(($rootScope, $controller) => {
      scope = $rootScope.$new();
      createController = () => {
        return $controller('InboxCtrl', {
          '$scope': scope,
          '$rootScope': $rootScope
        });
      };
    });

    createController();
    spyState.go.resetHistory();
  });

  it('navigates back to contacts state after deleting contact', done => {
    scope.deleteDoc(dummyId);

    setTimeout(() => {
      scope.$apply(); // needed to resolve the promises

      chai.assert(spyState.go.called, 'Should change state');
      chai.expect(spyState.go.args[0][0]).to.equal(spyState.current.name);
      chai.expect(spyState.go.args[0][1]).to.deep.equal({ id: null });
      done();
    });
  });

  it('doesn\'t change state after deleting message', done => {
    spyState.includes = state => {
      return state === 'messages';
    };

    scope.deleteDoc(dummyId);

    setTimeout(() => {
      scope.$apply(); // needed to resolve the promises

      chai.assert.isFalse(spyState.go.called, 'state change should not happen');
      done();
    });
  });

  it('doesn\'t deleteContact if user cancels modal', () => {
    stubModal.reset();
    stubModal.returns(Promise.reject({err: 'user cancelled'}));

    scope.deleteDoc(dummyId);

    setTimeout(() => {
      scope.$apply(); // needed to resolve the promises

      chai.assert.isFalse(spyState.go.called, 'state change should not happen');
      chai.assert.isFalse(snackbar.called, 'toast should be shown');
    });
  });

  it('should start the relative date update recurring process', () => {
    setTimeout(() => {
      scope.$apply();

      chai.expect(RecurringProcessManager.startUpdateRelativeDate.callCount).to.equal(1);
    });
  });

  it('should cancel the relative date update recurring process when destroyed', () => {
    scope.$destroy();
    chai.expect(RecurringProcessManager.stopUpdateRelativeDate.callCount).to.equal(1);
  });

  it('should watch changes in facilities, translations, ddoc and user context', () => {
    chai.expect(changesListener['inbox-facilities']).to.be.an('object');
    chai.expect(changesListener['inbox-translations']).to.be.an('object');
    chai.expect(changesListener['inbox-ddoc']).to.be.an('object');
    chai.expect(changesListener['inbox-user-context']).to.be.an('object');
  });

  it('InboxUserContent Changes listener should filter only logged in user, if exists', () => {
    session.userCtx.returns({ name: 'adm', roles: ['alpha', 'omega'] });
    createController();
    chai.expect(changesListener['inbox-user-context'].filter({ doc: {} })).to.equal(false);
    chai.expect(changesListener['inbox-user-context'].filter({ doc: { type: 'person'} })).to.equal(false);
    chai.expect(changesListener['inbox-user-context'].filter({ doc: { type: 'user-settings'} })).to.equal(false);
    chai.expect(changesListener['inbox-user-context'].filter({ doc: { type: 'user-settings', name: 'a'} })).to.equal(false);
    chai.expect(changesListener['inbox-user-context'].filter({ doc: { type: 'user-settings', name: 'adm'} })).to.equal(true);

    session.userCtx.returns(false);
    createController();
    chai.expect(changesListener['inbox-user-context'].filter({ doc: { type: 'user-settings', name: 'a'} })).to.equal(false);
  });

  it('InboxUserContent Changes listener callback should check current session', () => {
    changesListener['inbox-user-context'].callback();
    chai.expect(session.init.callCount).to.equal(2);
  });
});
