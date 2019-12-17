describe('InboxCtrl controller', () => {
  'use strict';

  let createController;
  let scope;
  let RecurringProcessManager;
  let changes;
  let changesListener = {};
  let session;
  let rulesEnginePromise;

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
        isEnabled: sinon.stub().returns(true)
      });
      $provide.value('Changes', changes);
      $provide.value('CheckDate', sinon.stub());
      $provide.value('Contact', sinon.stub());
      $provide.value('CountMessages', { init: sinon.stub() });
      $provide.value('XmlForms', sinon.stub());
      $provide.value('Contacts', sinon.stub());
      $provide.value('PlaceHierarchy', () => Promise.resolve());
      $provide.value('JsonForms', () => Promise.resolve({}));
      $provide.value('Language', () => Promise.resolve({}));
      $provide.value('LiveListConfig', sinon.stub());
      $provide.value('ResourceIcons', { getAppTitle: () => Promise.resolve({}) });
      $provide.value('ReadMessages', sinon.stub());
      $provide.value('SendMessage', sinon.stub());
      $provide.value('Session', session);
      $provide.value('SetLanguageCookie', sinon.stub());
      $provide.value('Settings', () => Promise.resolve());
      $provide.value('$timeout', sinon.stub());
      $provide.value('UpdateUser', sinon.stub());
      $provide.value('UpdateSettings', sinon.stub());
      $provide.value('UserSettings', sinon.stub());
      $provide.value('Telemetry', { record: sinon.stub() });
      $provide.value('Tour', { getTours: () => Promise.resolve([]) });
      $provide.value('RulesEngine', { init: rulesEnginePromise.promise });
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
        });
      };
    });
  });

  afterEach(() => sinon.restore());

  it('should start the relative date update recurring process', done => {
    createController();
    rulesEnginePromise.resolve();
    setTimeout(() => {
      chai.expect(RecurringProcessManager.startUpdateRelativeDate.callCount).to.equal(1);
      done();
    });
  });

  it('should cancel the relative date update recurring process when destroyed', () => {
    createController();
    scope.$destroy();
    chai.expect(RecurringProcessManager.stopUpdateRelativeDate.callCount).to.equal(1);
  });

  it('should not start the UpdateUnreadDocsCount recurring process when not online', done => {
    createController();
    rulesEnginePromise.resolve();
    setTimeout(() => {
      chai.expect(RecurringProcessManager.startUpdateReadDocsCount.callCount).to.equal(0);
      scope.$destroy();
      chai.expect(RecurringProcessManager.stopUpdateReadDocsCount.callCount).to.equal(1);
      done();
    });
  });

  it('should start the UpdateUnreadDocsCount recurring process when online, after lazy load', done => {
    session.isOnlineOnly.returns(true);
    createController();
    rulesEnginePromise.resolve();
    setTimeout(() => {
      chai.expect(RecurringProcessManager.startUpdateReadDocsCount.callCount).to.equal(1);
      done();
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
    chai.expect(changesListener['inbox-user-context'].filter({ doc: { type: 'user-settings', name: 'a' }})).to.equal(false);
  });

  it('InboxUserContent Changes listener callback should check current session', () => {
    createController();
    changesListener['inbox-user-context'].callback();
    chai.expect(session.init.callCount).to.equal(1);
  });
});
