describe('ScheduledForms service', function() {

  'use strict';

  let service;
  let Settings;

  beforeEach(function() {
    Settings = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('Settings', function() {
        return Settings;
      });
    });
    inject(function($injector) {
      service = $injector.get('ScheduledForms');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(Settings);
  });

  it('returns error when Settings errors', function(done) {
    Settings.returns(Promise.reject('boom'));
    service()
      .then(function() {
        done(new Error('expected go boom'));
      })
      .catch(function(err) {
        chai.expect(err).to.equal('boom');
        done();
      });
  });

  it('returns empty if no scheduled forms', function(done) {
    Settings.returns(Promise.resolve({}));
    service()
      .then(function(actual) {
        chai.expect(actual).to.deep.equal([]);
        done();
      })
      .catch(done);
  });

  it('returns empty if no reporting config', function(done) {
    Settings.returns(Promise.resolve({
      forms: { R: 'registration', D: 'delivery' }
    }));
    service()
      .then(function(actual) {
        chai.expect(actual).to.deep.equal([]);
        done();
      })
      .catch(done);
  });

  it('returns multiple forms', function(done) {
    Settings.returns(Promise.resolve({
      forms: { R: 'registration', D: 'delivery', F: 'flag' },
      'kujua-reporting': [ { code: 'R' }, { code: 'X' }, { code: 'D' } ]
    }));
    service()
      .then(function(actual) {
        chai.expect(actual).to.deep.equal([ 'registration', 'delivery', ]);
        done();
      })
      .catch(done);
  });
});
