describe('Settings service', function() {

  'use strict';

  var service,
      $httpBackend;

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('BaseUrlService', function() {
        return 'BASEURL';
      });
    });
    inject(function($injector) {
      $httpBackend = $injector.get('$httpBackend');
      service = $injector.get('Settings');
    });
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  it('retrieves settings', function(done) {

    var expected = {
      isTrue: true,
      isString: 'hello'
    };
    $httpBackend
      .expect('GET', 'BASEURL/app_settings/medic')
      .respond({ settings: expected });

    service(function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.isTrue).to.equal(expected.isTrue);
      chai.expect(actual.isString).to.equal(expected.isString);
      done();
    });

    $httpBackend.flush();

  });

  it('merges settings with defaults', function(done) {

    var expected = {
      date_format: 'YYYY'
    };
    $httpBackend
      .expect('GET', 'BASEURL/app_settings/medic')
      .respond({ settings: expected });

    service(function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.date_format).to.equal(expected.date_format);
      // date format from defaults: kujua_sms/views/lib/app_settings
      chai.expect(actual.reported_date_format).to.equal('DD-MMM-YYYY HH:mm:ss');
      done();
    });

    $httpBackend.flush();

  });

  it('merges translations with defaults', function(done) {

    var expected = {
      translations: [
        { key: 'test-a' },
        { key: 'test-b' },
        { key: 'test-c' }
      ]
    };
    $httpBackend
      .expect('GET', 'BASEURL/app_settings/medic')
      .respond({ settings: expected });

    service(function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.translations.length).to.be.above(expected.translations.length);
      var found = 0;
      expected.translations.forEach(function(e) {
        actual.translations.forEach(function(a) {
          if (e.key === a.key) {
            found++;
          }
        });
      });

      chai.expect(found).to.equal(expected.translations.length);
      done();
    });
    $httpBackend.flush();

  });

  it('returns errors', function(done) {

    $httpBackend
      .expect('GET', 'BASEURL/app_settings/medic')
      .respond(404, '');

    service(function(err) {
      chai.expect(err).to.not.equal(null);
      chai.expect(err.status).to.equal(404);
      done();
    });

    $httpBackend.flush();

  });
});