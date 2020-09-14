describe('TranslationLoader service', function() {

  'use strict';

  let service;
  let Settings;
  let DBGet;

  beforeEach(function() {
    module('adminApp');
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
    const options = { key: 'err' };
    const expected = { status: 503 };
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
    const options = { key: 'notfound' };
    DBGet.returns(Promise.reject({ status: 404 }));
    return service(options).then(function(actual) {
      chai.expect(actual).to.deep.equal({});
      chai.expect(Settings.callCount).to.equal(0);
      chai.expect(DBGet.callCount).to.equal(1);
      chai.expect(DBGet.args[0][0]).to.equal('messages-notfound');
    });
  });

  it('returns values for the given key', function() {
    const options = { key: 'au' };
    const expected = {
      prawn: 'shrimp',
      bbq: 'barbie'
    };
    DBGet.returns(Promise.resolve({ custom: expected }));
    return service(options).then(function(actual) {
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(Settings.callCount).to.equal(0);
      chai.expect(DBGet.callCount).to.equal(1);
      chai.expect(DBGet.args[0][0]).to.equal('messages-au');
    });
  });

  it('falls back to settings default', function() {
    const options = { };
    const settings = { locale: 'us' };
    const expected = {
      prawn: 'prawn',
      bbq: 'grill'
    };
    Settings.returns(Promise.resolve(settings));
    DBGet.returns(Promise.resolve({ custom: expected }));
    return service(options).then(function(actual) {
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(Settings.callCount).to.equal(1);
      chai.expect(DBGet.callCount).to.equal(1);
      chai.expect(DBGet.args[0][0]).to.equal('messages-us');
    });
  });

  it('defaults to "en"', function() {
    const options = { };
    const settings = { };
    const expected = {
      prawn: 'prawn',
      bbq: 'barbeque'
    };
    Settings.returns(Promise.resolve(settings));
    DBGet.returns(Promise.resolve({ custom: expected }));
    return service(options).then(function(actual) {
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(Settings.callCount).to.equal(1);
      chai.expect(DBGet.callCount).to.equal(1);
      chai.expect(DBGet.args[0][0]).to.equal('messages-en');
    });
  });

  it('returns "en" wrapped in hypens for test locale', function() {
    const options = { key: 'test' };
    const doc = {
      prawn: 'prawn',
      bbq: 'barbeque'
    };
    const expected = {
      prawn: '-prawn-',
      bbq: '-barbeque-'
    };
    DBGet.returns(Promise.resolve({ custom: doc }));
    return service(options).then(function(actual) {
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(Settings.callCount).to.equal(0);
      chai.expect(DBGet.callCount).to.equal(1);
      chai.expect(DBGet.args[0][0]).to.equal('messages-en');
    });
  });

  describe('test method', () => {
    it('should return false when not matching', () => {
      chai.expect(service.test()).to.equal(undefined);
      chai.expect(service.test([])).to.equal(false);
      chai.expect(service.test({})).to.equal(false);
      chai.expect(service.test(100)).to.equal(false);
      chai.expect(service.test('04aa1bfa-f87d-467e-bf46-51eeb367370b')).to.equal(false);
      chai.expect(service.test('messages-')).to.equal(false);
    });

    it('should return true when matching', () => {
      chai.expect(service.test('messages-en')).to.equal(true);
      chai.expect(service.test('messages-fr')).to.equal(true);
      chai.expect(service.test('messages-any')).to.equal(true);
    });
  });

  describe('getCode', () => {
    it('should return false when not matching', () => {
      chai.expect(service.getCode()).to.equal(false);
      chai.expect(service.getCode([])).to.equal(null);
      chai.expect(service.getCode({})).to.equal(null);
      chai.expect(service.getCode(100)).to.equal(null);
      chai.expect(service.getCode('04aa1bfa-f87d-467e-bf46-51eeb367370b')).to.equal(null);
      chai.expect(service.getCode('messages-')).to.equal(null);
    });

    it('should return code when matching', () => {
      chai.expect(service.getCode('messages-en')).to.equal('en');
      chai.expect(service.getCode('messages-fr')).to.equal('fr');
      chai.expect(service.getCode('messages-any')).to.equal('any');
    });
  });
});
