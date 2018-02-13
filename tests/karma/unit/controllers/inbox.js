describe('InboxCtrl controller', () => {

  'use strict';

  let createController,
      scope,
      snackbar,
      spyState,
      stubModal,
      dummyId = 'dummydummy';

  beforeEach(() => {
    snackbar = sinon.stub();
    module('inboxApp');

    module($provide => {
      $provide.value('ActiveRequests', sinon.stub());
      $provide.value('Auth', () => Promise.resolve({}));
      $provide.value('Location', () => {
        return { path: 'localhost' };
      });
      $provide.value('DB', () => {
        return {
          query: KarmaUtils.nullPromise(),
          info: KarmaUtils.nullPromise()
        };
      });
      $provide.value('WatchDesignDoc', sinon.stub());
      $provide.value('DBSync', sinon.stub());
      $provide.value('Changes', sinon.stub());
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
      $provide.value('Session', { init: sinon.stub(), isAdmin: sinon.stub() });
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
      $provide.value('RecurringProcessManager', {
          startUpdateRelativeDate: sinon.stub(),
          stopUpdateRelativeDate: sinon.stub()
      });
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
    spyState.go.reset();
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

});
