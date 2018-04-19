describe('ImportProperties service', function() {

  'use strict';

  var service,
      Settings,
      put,
      UpdateSettings,
      rootScope;

  beforeEach(function() {
    Settings = sinon.stub();
    UpdateSettings = sinon.stub();
    put = sinon.stub();
    module('adminApp');
    module(function($provide) {
      $provide.value('translateFilter', function(key) {
        return '{' + key + '}';
      });
      $provide.value('Settings', Settings);
      $provide.value('UpdateSettings', UpdateSettings);
      $provide.factory('DB', KarmaUtils.mockDB({ put: put }));
    });
    inject(function($injector, $rootScope) {
      rootScope = $rootScope;
      service = $injector.get('ImportProperties');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(Settings, UpdateSettings, put);
  });

  it('updates settings', function() {
    var content = 'Hello = Bonjour\n' +
                  'Goodbye = Au revoir';
    var doc = {
      code: 'fr',
      values: {
        'Hello': 'hello',
        'Goodbye': 'bye'
      }
    };
    Settings.returns(Promise.resolve({}));
    put.returns(Promise.resolve({}));
    setTimeout(function() {
      rootScope.$digest();
      setTimeout(function() {
        rootScope.$digest();
      });
    });
    return service(content, doc)
      .then(function() {
        chai.expect(put.args[0][0]).to.deep.equal({
          code: 'fr',
          values: {
            'Hello': 'Bonjour',
            'Goodbye': 'Au revoir'
          }
        });
        chai.expect(UpdateSettings.callCount).to.equal(0);
      });

  });

  it('updates locale docs', function() {
    var content = 'Hello = Bonjour\n' +
                  'Goodbye = Au revoir';
    var doc = {
      code: 'fr',
      values: {
        'Hello': 'hello'
      }
    };
    Settings.returns(Promise.resolve({}));
    put.returns(Promise.resolve({}));
    setTimeout(function() {
      rootScope.$digest();
      setTimeout(function() {
        rootScope.$digest();
        setTimeout(function() {
          rootScope.$digest();
        });
      });
    });
    return service(content, doc).then(function() {
      chai.expect(put.args[0][0]).to.deep.equal({
        code: 'fr',
        values: {
          'Hello': 'Bonjour',
          'Goodbye': 'Au revoir'
        }
      });
      chai.expect(UpdateSettings.callCount).to.equal(0);
    });

  });

});
