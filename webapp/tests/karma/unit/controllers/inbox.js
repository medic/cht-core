
describe('InboxCtrl controller', () => {
  'use strict';

  let createController;
  let scope;
  let RecurringProcessManager;
  let changes;
  const changesListener = {};
  let session;
  let rulesEnginePromise;
  let isSyncInProgress;
  let privacyPoliciesPromise;
  let sync;
  let updateUser;


  beforeEach(() => {
    module('inboxApp');
    window.startupTimes = {};

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
      init: sinon.stub().resolves(),
      isAdmin: sinon.stub(),
      userCtx: sinon.stub(),
      isOnlineOnly: sinon.stub()
    };

    rulesEnginePromise = Q.defer();

    updateUser = sinon.spy();

    isSyncInProgress = sinon.stub();
    sync = sinon.stub();

    privacyPoliciesPromise = Q.defer();

    module($provide => {
      $provide.value('ActiveRequests', sinon.stub());
      $provide.value('Auth', {
        has: () => Promise.resolve(true),
      });
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
        isEnabled: sinon.stub().returns(true),
        sync,
        isSyncInProgress
      });
      $provide.value('Changes', changes);
      $provide.value('CheckDate', sinon.stub());
      $provide.value('Contact', sinon.stub());
      $provide.value('CountMessages', { init: sinon.stub() });
      $provide.value('DeleteDocs', KarmaUtils.nullPromise());
      $provide.value('Debug', { set: sinon.stub() });
      $provide.value('XmlForms', sinon.stub());
      $provide.value('Contacts', sinon.stub());
      $provide.value('PlaceHierarchy', () => Promise.resolve());
      $provide.value('JsonForms', () => Promise.resolve({}));
      $provide.value('Language', () => Promise.resolve({}));
      $provide.value('LiveListConfig', sinon.stub());
      $provide.value('ResourceIcons', { getAppTitle: () => Promise.resolve({}) });
      $provide.value('ReadMessages', sinon.stub());
      $provide.value('PrivacyPolicies', { hasAccepted: sinon.stub().returns(privacyPoliciesPromise.promise) });
      $provide.value('SendMessage', sinon.stub());
      $provide.value('Session', session);
      $provide.value('SetLanguageCookie', sinon.stub());
      $provide.value('Settings', () => Promise.resolve({ setup_complete: true }));
      $provide.value('$timeout', sinon.stub());
      $provide.value('UpdateUser', updateUser);
      $provide.value('UpdateSettings', sinon.stub());
      $provide.value('UserSettings', () =>  Promise.resolve({ known: false }));
      $provide.value('Telemetry', { record: sinon.stub() });
      $provide.value('Tour', { endCurrent: () => {} });
      $provide.value('RulesEngine', { isEnabled: () => rulesEnginePromise.promise });
      $provide.value('RecurringProcessManager', RecurringProcessManager);
      $provide.value('Enketo', sinon.stub());
      $provide.constant('APP_CONFIG', {
        name: 'name',
        version: 'version',
      });
    });

    inject(($rootScope, $controller, _$translate_) => {
      scope = $rootScope.$new();
      _$translate_.onReady = sinon.stub().resolves();

      createController = () => {
        return $controller('InboxCtrl', {
          $scope: scope,
          $rootScope: $rootScope,
          $window: {
            addEventListener: () => {},
            location: { href: '' },
            localStorage: {
              getItem: sinon.stub(),
            },
            startupTimes: {},
            PouchDB: {},
          },
        });
      };
    });

  });

  afterEach(() => sinon.restore());
  it('should start the relative date update recurring process', () => {
    const ctrl = createController();
    privacyPoliciesPromise.resolve();
    rulesEnginePromise.resolve();
    return ctrl.setupPromise.then(() => {
      chai.expect(RecurringProcessManager.startUpdateRelativeDate.callCount).to.equal(1);
    });
  });

  it('should cancel the relative date update recurring process when destroyed', () => {
    createController();
    scope.$destroy();
    chai.expect(RecurringProcessManager.stopUpdateRelativeDate.callCount).to.equal(1);
  });

  it('should not start the UpdateUnreadDocsCount recurring process when not online', () => {
    const ctrl = createController();
    privacyPoliciesPromise.resolve();
    rulesEnginePromise.resolve();
    return ctrl.setupPromise.then(() => {
      chai.expect(RecurringProcessManager.startUpdateReadDocsCount.callCount).to.equal(0);
      scope.$destroy();
      chai.expect(RecurringProcessManager.stopUpdateReadDocsCount.callCount).to.equal(1);
    });
  });

  it('should start the UpdateUnreadDocsCount recurring process when online, after lazy load', () => {
    session.isOnlineOnly.returns(true);
    const ctrl = createController();
    privacyPoliciesPromise.resolve();
    rulesEnginePromise.resolve();
    return ctrl.setupPromise.then(() => {
      chai.expect(RecurringProcessManager.startUpdateReadDocsCount.callCount).to.equal(1);
    });
  });

  it('should watch changes in translations, ddoc and user context', () => {
    createController();
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
    chai.expect(changesListener['inbox-user-context'].filter({ doc: { type: 'user-settings', name: 'a' }}))
      .to.equal(false);
  });

  it('InboxUserContent Changes listener callback should check current session', () => {
    createController();
    chai.expect(session.init.callCount).to.equal(1);
    changesListener['inbox-user-context'].callback();
    chai.expect(session.init.callCount).to.equal(2);
  });

  describe('sync status changes', () => {

    it('does nothing if sync in progress', () => {
      createController();
      isSyncInProgress.returns(true);
      chai.expect(changesListener['sync-status']).to.be.an('object');
      changesListener['sync-status'].callback();
      chai.expect(sync.callCount).to.equal(0);
    });

    it('calls sync if not currently syncing', () => {
      createController();
      isSyncInProgress.returns(false);
      chai.expect(changesListener['sync-status']).to.be.an('object');
      changesListener['sync-status'].callback();
      chai.expect(sync.callCount).to.equal(1);
    });

  });
});
