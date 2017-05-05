describe('MessageContacts service', function() {

  'use strict';

  var service,
      query,
      getContactSummaries;

  beforeEach(function() {
    query = sinon.stub();
    getContactSummaries = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ query: query }));
      $provide.value('GetContactSummaries', getContactSummaries);
    });
    inject(function($injector) {
      service = $injector.get('MessageContacts');
    });
  });

  describe('list', function() {

    it('builds admin list', function() {
      var expected = [ { value: 'a' }, { value: 'b' } ];
      query.returns(KarmaUtils.mockPromise(null, { rows: expected }));
      getContactSummaries.returns(KarmaUtils.mockPromise());
      return service({}).then(function(actual) {
        chai.expect(actual).to.deep.equal(expected);
        chai.expect(getContactSummaries.args[0][0]).to.deep.equal([ 'a', 'b' ]);
      });
    });

    it('returns errors from db query', function(done) {
      query.returns(KarmaUtils.mockPromise('server error'));
      service({})
        .then(function() {
          done(new Error('exception expected'));
        })
        .catch(function(err) {
          chai.expect(err).to.equal('server error');
          done();
        });
    });

  });

  describe('get', function() {

    it('builds admin conversation', function() {
      var expected = {
        rows: [ 'a', 'b' ]
      };
      query.returns(KarmaUtils.mockPromise(null, expected));
      return service({ id: 'abc'}).then(function(actual) {
        chai.expect(actual).to.deep.equal(expected.rows);
      });
    });

    it('builds admin conversation with skip', function() {
      var expected = {
        rows: [ 'a', 'b' ]
      };
      query.returns(KarmaUtils.mockPromise(null, expected));
      return service({ id: 'abc', skip: 45 }).then(function(actual) {
        chai.expect(actual).to.deep.equal(expected.rows);
      });
    });

    it('returns errors from db query', function(done) {
      query.returns(KarmaUtils.mockPromise('server error'));
      service({ id: 'abc' })
        .then(function() {
          done(new Error('expected exception'));
        })
        .catch(function(err) {
          chai.expect(err).to.equal('server error');
          done();
        });
    });

  });

});
