describe('TranslationLoader service', function() {

  'use strict';

  var service,
      Settings,
      DBGet;

  beforeEach(function() {
    module('inboxApp');
    DBGet = sinon.stub();
    Settings = sinon.stub();
    module(function ($provide) {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.factory('DB', KarmaUtils.mockDB({ get: DBGet }));
      $provide.value('Settings', Settings);
    });
    inject(function($injector) {
      service = $injector.get('TranslationLoader');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(DBGet, Settings);
  });

  it('returns error when db throws error', function(done) {
    var options = { key: 'err' };
    var expected = { status: 503 };
    DBGet.returns(Promise.reject(expected));
    service(options)
      .then(function() {
        done(new Error('expected error to be thrown'));
      })
      .catch(function(actual) {
        chai.expect(actual).to.deep.equal(expected);
        done();
      });
  });

  it('returns empty when no translation document', function() {
    var options = { key: 'notfound' };
    DBGet.returns(Promise.reject({ status: 404 }));
    return service(options).then(function(actual) {
      chai.expect(actual).to.deep.equal({});
      chai.expect(Settings.callCount).to.equal(0);
      chai.expect(DBGet.callCount).to.equal(1);
      chai.expect(DBGet.args[0][0]).to.equal('messages-notfound');
    });
  });

  it('returns values for the given key', function() {
    var options = { key: 'au' };
    var expected = {
      prawn: 'shrimp',
      bbq: 'barbie'
    };
    DBGet.returns(Promise.resolve({ values: expected }));
    return service(options).then(function(actual) {
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(Settings.callCount).to.equal(0);
      chai.expect(DBGet.callCount).to.equal(1);
      chai.expect(DBGet.args[0][0]).to.equal('messages-au');
    });
  });

  it('falls back to settings default', function() {
    var options = { };
    var settings = { locale: 'us' };
    var expected = {
      prawn: 'prawn',
      bbq: 'grill'
    };
    Settings.returns(Promise.resolve(settings));
    DBGet.returns(Promise.resolve({ values: expected }));
    return service(options).then(function(actual) {
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(Settings.callCount).to.equal(1);
      chai.expect(DBGet.callCount).to.equal(1);
      chai.expect(DBGet.args[0][0]).to.equal('messages-us');
    });
  });

  it('defaults to "en"', function() {
    var options = { };
    var settings = { };
    var expected = {
      prawn: 'prawn',
      bbq: 'barbeque'
    };
    Settings.returns(Promise.resolve(settings));
    DBGet.returns(Promise.resolve({ values: expected }));
    return service(options).then(function(actual) {
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(Settings.callCount).to.equal(1);
      chai.expect(DBGet.callCount).to.equal(1);
      chai.expect(DBGet.args[0][0]).to.equal('messages-en');
    });
  });

  it('returns "en" wrapped in hypens for test locale', function() {
    var options = { key: 'test' };
    var doc = {
      prawn: 'prawn',
      bbq: 'barbeque'
    };
    var expected = {
      prawn: '-prawn-',
      bbq: '-barbeque-'
    };
    DBGet.returns(Promise.resolve({ values: doc }));
    return service(options).then(function(actual) {
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(Settings.callCount).to.equal(0);
      chai.expect(DBGet.callCount).to.equal(1);
      chai.expect(DBGet.args[0][0]).to.equal('messages-en');
    });
  });
});
