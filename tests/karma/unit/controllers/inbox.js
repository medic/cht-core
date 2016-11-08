describe('InboxCtrl controller', function() {

  'use strict';

  var createController,
      scope,
      snackbar,
      spyState,
      stubModal,
      dummyId = 'dummydummy';

  beforeEach(function() {
    snackbar = sinon.stub();
    module('inboxApp');

    module(function($provide) {
      $provide.factory('ActiveRequests', function() {
        return sinon.stub();
      });
      $provide.factory('Auth', function() {
        return function() {
          return Promise.resolve({});
        };
      });
      $provide.factory('Location', function() {
        return function() {
          return { path: 'localhost' };
        };
      });
      $provide.factory('DB', function() {
        return sinon.stub();
      });
      $provide.factory('WatchDesignDoc', function() {
        return sinon.stub();
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
      $provide.factory('DeleteDocs', function() {
        return KarmaUtils.nullPromise();
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
      $provide.factory('JsonForms', function() {
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
      $provide.factory('Modal', function() {
        stubModal = sinon.stub();
        // ConfirmModal : Always return as if user clicked delete. This ignores the DeleteDocs
        // altogether. The calling of the processingFunction is tested in
        // modal.js, not here.
        stubModal.returns(KarmaUtils.mockPromise());
        return stubModal;
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
          current: { name: 'my.state.is.great' },
          includes: function() { return true; }
        };
        return spyState;
      });
      $provide.factory('$timeout', function() {
        return sinon.stub();
      });
      $provide.factory('UpdateUser', function() {
        return sinon.stub();
      });
      $provide.factory('UpdateSettings', function() {
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
      createController = function() {
        return $controller('InboxCtrl', {
          '$scope': scope,
          '$rootScope': $rootScope
        });
      };
    });

    createController();
    spyState.go.reset();
    stubModal.reset();
  });

  afterEach(function() {});

  it('navigates back to contacts state after deleting contact', function(done) {
    scope.deleteDoc(dummyId);

    setTimeout(function() {
      scope.$apply(); // needed to resolve the promises

      chai.assert(spyState.go.called, 'Should change state');
      chai.expect(spyState.go.args[0][0]).to.equal(spyState.current.name);
      chai.expect(spyState.go.args[0][1]).to.deep.equal({ id: null });
      done();
    });
  });

  it('doesn\'t change state after deleting message', function(done) {
    spyState.includes = function(state) {
      return state === 'messages';
    };

    scope.deleteDoc(dummyId);

    setTimeout(function() {
      scope.$apply(); // needed to resolve the promises

      chai.assert.isFalse(spyState.go.called, 'state change should not happen');
      done();
    });
  });

  it('doesn\'t deleteContact if user cancels modal', function() {
    stubModal.reset();
    stubModal.returns(KarmaUtils.mockPromise({err: 'user cancelled'}));

    scope.deleteDoc(dummyId);

    setTimeout(function() {
      scope.$apply(); // needed to resolve the promises

      chai.assert.isFalse(spyState.go.called, 'state change should not happen');
      chai.assert.isFalse(snackbar.called, 'toast should be shown');
    });
  });

});
