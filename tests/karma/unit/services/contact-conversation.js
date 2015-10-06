describe('ContactConversation service', function() {

  'use strict';

  var service,
      district,
      districtErr,
      unallocated,
      settingsErr,
      query;

  beforeEach(function() {
    query = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.value('BaseUrlService', function() {
        return 'BASEURL';
      });
      $provide.value('UserDistrict', function(callback) {
        callback(districtErr, district);
      });
      $provide.value('Settings', function(callback) {
        callback(settingsErr, { district_admins_access_unallocated_messages: unallocated });
      });
      $provide.factory('DB', KarmaUtils.mockDB({ query: query }));
    });
    inject(function($injector) {
      service = $injector.get('ContactConversation');
    });
    district = null;
    districtErr = null;
    unallocated = false;
    settingsErr = null;
  });

  afterEach(function() {
    KarmaUtils.restore(query);
  });

  it('builds admin conversation', function(done) {
    var expected = {
      rows: [ 'a', 'b' ]
    };
    query.returns(KarmaUtils.mockPromise(null, expected));
    service({ id: 'abc'}, function(err, actual) {
      chai.expect(actual).to.deep.equal(expected.rows);
      done();
    });
  });

  it('builds district admin conversation', function(done) {
    var expected = {
      rows: [ 'a', 'b' ]
    };
    district = 'xyz';
    query.returns(KarmaUtils.mockPromise(null, expected));
    service({ id: 'abc' }, function(err, actual) {
      chai.expect(actual).to.deep.equal(expected.rows);
      done();
    });
  });

  it('builds admin conversation with skip', function(done) {
    var expected = {
      rows: [ 'a', 'b' ]
    };
    query.returns(KarmaUtils.mockPromise(null, expected));
    service({ id: 'abc', skip: 45 }, function(err, actual) {
      chai.expect(actual).to.deep.equal(expected.rows);
      done();
    });
  });

  it('returns errors from db query', function(done) {
    query.returns(KarmaUtils.mockPromise('server error'));
    service({ id: 'abc' }, function(err) {
      chai.expect(err).to.equal('server error');
      done();
    });
  });

});