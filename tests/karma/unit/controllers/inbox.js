describe('InboxCtrl controller', function() {

  'use strict';

  var createController,
    spyDeleteDoc,
    scope,
    snackbar,
    spyState;
  var dummyId = 'dummydummy';

  beforeEach(function() {
    snackbar = sinon.stub();
    module('inboxApp');

    module(function($provide) {
      $provide.factory('ActiveRequests', function() {
        return sinon.stub();
      });
      $provide.factory('AnalyticsModules', function() {
        return function() {
          return Promise.resolve({});
        };
      });
      $provide.factory('Auth', function() {
        return function() {
          return Promise.resolve({});
        };
      });
      $provide.factory('BaseUrlService', function() {
        return sinon.stub();
      });
      $provide.factory('DB', function() {
        return {
          watchDesignDoc: function() {}
        };
      });
      $provide.factory('DBSync', function() {
        return sinon.stub();
      });
      $provide.factory('Changes', function() {
        return sinon.stub();
      });
      $provide.factory('CheckDate', function() {
        return sinon.stub();
      });
      $provide.factory('Contact', function() {
        return sinon.stub();
      });
      $provide.factory('CountMessages', function() {
        return {
          init: sinon.stub()
        };
      });
      $provide.factory('DeleteDoc', function() {
        spyDeleteDoc = sinon.spy();
        return spyDeleteDoc;
      });
      $provide.factory('DownloadUrl', function() {
        return sinon.stub();
      });
      $provide.factory('XmlForms', function() {
        return sinon.stub();
      });
      $provide.factory('Facility', function() {
        return sinon.stub();
      });
      $provide.factory('FacilityHierarchy', function() {
        return sinon.stub();
      });
      $provide.factory('Form', function() {
        return function() {
          return Promise.resolve({});
        };
      });
      $provide.factory('Language', function() {
        return KarmaUtils.nullPromise();
      });
      $provide.factory('LiveListConfig', function() {
        return sinon.stub();
      });
      $provide.factory('ReadMessages', function() {
        return sinon.stub();
      });
      $provide.factory('SendMessage', function() {
        return sinon.stub();
      });
      $provide.factory('Session', function() {
        return {
          init: sinon.stub()
        };
      });
      $provide.factory('SetLanguageCookie', function() {
        return sinon.stub();
      });
      $provide.factory('Settings', function() {
        return KarmaUtils.nullPromise();
      });
      $provide.factory('Snackbar', function() {
        return snackbar;
      });
      $provide.factory('$state', function() {
        spyState = {
          go: sinon.spy(),
          current: { name: 'contacts.detail' }
        };
        return spyState;
      });
      $provide.factory('$timeout', function() {
        return sinon.stub();
      });
      $provide.factory('TrafficStats', function() {
        return sinon.stub();
      });
      $provide.factory('translateFilter', function() {
        return sinon.stub();
      });
      $provide.factory('UpdateUser', function() {
        return sinon.stub();
      });
      $provide.factory('UpdateSettings', function() {
        return sinon.stub();
      });
      $provide.factory('UserDistrict', function() {
        return sinon.stub();
      });
      $provide.factory('UserSettings', function() {
        return sinon.stub();
      });
      $provide.value('RulesEngine', { init: KarmaUtils.nullPromise()() });
      $provide.factory('$window', function() {
        return sinon.stub();
      });
      $provide.constant('APP_CONFIG', {
        name: 'name',
        version: 'version'
      });
    });

    inject(function($rootScope, $controller) {
      scope = $rootScope.$new();
      scope.fetchAnalyticsModules = function() {
        return Promise.resolve({});
      };
      createController = function() {
        return $controller('InboxCtrl', {
          '$scope': scope,
          '$rootScope': $rootScope
        });
      };
    });

    createController();
    spyDeleteDoc.reset();
    spyState.go.reset();
  });

  afterEach(function() {});

  it('deletes contact', function() {
    scope.deleteDoc(dummyId);
    scope.deleteDocConfirm();
    chai.expect(spyDeleteDoc.getCall(0).args[0]).to.equal(dummyId);
  });

  it('navigates back to contacts state after deleting contact', function() {
    scope.deleteDoc(dummyId);
    scope.deleteDocConfirm();
    var callback = spyDeleteDoc.getCall(0).args[1];
    // Call callback without err.
    callback();
    chai.expect(spyState.go.args[0][0]).to.equal('contacts.detail');
    chai.expect(spyState.go.args[0][1]).to.deep.equal({ id: null });
    chai.assert(snackbar.called, 'Should display toast');
  });

  it('doesn\'t navigate back to contacts state after failed contact deletion', function() {
    scope.deleteDoc(dummyId);
    scope.deleteDocConfirm();
    var callback = spyDeleteDoc.getCall(0).args[1];
    var err = {};
    callback(err);
    chai.assert.isFalse(spyState.go.called, 'state change should not happen');
    chai.assert.isFalse(snackbar.called, 'Shoud not display toast');
  });

  it('can\'t deleteContact before user confirmed', function() {
    // Don't call deleteDoc first.
    scope.deleteDocConfirm();
    chai.assert.isFalse(spyDeleteDoc.called, 'Deletion should not happen');
    chai.assert.isFalse(spyState.go.called, 'state change should not happen');
  });
});
