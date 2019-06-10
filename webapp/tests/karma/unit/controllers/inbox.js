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
    session;

  beforeEach(() => {
    snackbar = sinon.stub();
    module('inboxApp');

    RecurringProcessManager = {
      startUpdateRelativeDate: sinon.stub(),
      stopUpdateRelativeDate: sinon.stub(),
      startUpdateReadDocsCount: sinon.stub(),
      stopUpdateReadDocsCount: sinon.stub()
    };

    changes = options => {
      changesListener[options.key] = options;
    };

    session = {
      init: sinon.stub(),
      isAdmin: sinon.stub(),
      userCtx: sinon.stub(),
      isOnlineOnly: sinon.stub()
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
        };
      });
      $provide.value('WatchDesignDoc', sinon.stub());
      $provide.value('DBSync', {
        addUpdateListener: sinon.stub(),
        sync: sinon.stub(),
      });
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
      $provide.value('ResourceIcons', { getAppTitle: () => Promise.resolve({}) });
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
          includes: () => {
            return true;
          },
        };
        return spyState;
      });
      $provide.value('$timeout', sinon.stub());
      $provide.value('UpdateUser', sinon.stub());
      $provide.value('UpdateSettings', sinon.stub());
      $provide.value('UserSettings', sinon.stub());
      $provide.value('Telemetry', { record: sinon.stub() });
      $provide.value('Tour', { getTours: () => Promise.resolve([]) });
      $provide.value('RulesEngine', { init: KarmaUtils.nullPromise()() });
      $provide.value('RecurringProcessManager', RecurringProcessManager);
      $provide.value('Enketo', sinon.stub());
      $provide.constant('APP_CONFIG', {
        name: 'name',
        version: 'version',
      });
    });

    inject(($rootScope, $controller) => {
      scope = $rootScope.$new();
      createController = () => {
        return $controller('InboxCtrl', {
          $scope: scope,
          $rootScope: $rootScope,
        });
      };
    });

    createController();
    spyState.go.resetHistory();
  });

  afterEach(() => sinon.restore());

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

  it('does not change state after deleting message', done => {
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

  it('does not deleteContact if user cancels modal', done => {
    stubModal.reset();
    stubModal.returns(Promise.reject({ err: 'user cancelled' }));

    scope.deleteDoc(dummyId);

    setTimeout(() => {
      scope.$apply(); // needed to resolve the promises

      chai.assert.isFalse(spyState.go.called, 'state change should not happen');
      chai.assert.isFalse(snackbar.called, 'toast should be shown');
      done();
    });
  });

  it('should start the relative date update recurring process', done => {
    setTimeout(() => {
      scope.$apply();

      chai
        .expect(RecurringProcessManager.startUpdateRelativeDate.callCount)
        .to.equal(1);
      done();
    });
  });

  it('should cancel the relative date update recurring process when destroyed', () => {
    scope.$destroy();
    chai
      .expect(RecurringProcessManager.stopUpdateRelativeDate.callCount)
      .to.equal(1);
  });

  it('should not start the UpdateUnreadDocsCount recurring process when not online', () => {
    chai.expect(RecurringProcessManager.startUpdateReadDocsCount.callCount).to.equal(0);
    scope.$destroy();
    chai.expect(RecurringProcessManager.stopUpdateReadDocsCount.callCount).to.equal(1);
  });

  it('should start the UpdateUnreadDocsCount recurring process when online', () => {
    session.isOnlineOnly.returns(true);
    createController();
    chai.expect(RecurringProcessManager.startUpdateReadDocsCount.callCount).to.equal(1);
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
    chai.expect(changesListener['inbox-user-context'].filter({ id: 'something' })).to.equal(false);
    chai.expect(changesListener['inbox-user-context'].filter({ id: 'someperson' })).to.equal(false);
    chai.expect(changesListener['inbox-user-context'].filter({ id: 'org.couchdb.user:someone' })).to.equal(false);
    chai.expect(changesListener['inbox-user-context'].filter({ id: 'org.couchdb.user:adm' })).to.equal(true);

    session.userCtx.returns(false);
    createController();
    chai
      .expect(
        changesListener['inbox-user-context'].filter({
          doc: { type: 'user-settings', name: 'a' },
        })
      )
      .to.equal(false);
  });

  it('InboxUserContent Changes listener callback should check current session', () => {
    changesListener['inbox-user-context'].callback();
    chai.expect(session.init.callCount).to.equal(2);
  });
});
