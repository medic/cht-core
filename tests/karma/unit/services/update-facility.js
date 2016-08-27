describe('UpdateFacility service', function() {

  'use strict';

  var service,
      get,
      put;

  beforeEach(function() {
    get = sinon.stub();
    put = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ get: get, put: put }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject(function(_UpdateFacility_) {
      service = _UpdateFacility_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(get, put);
  });

  it('updates the facility', function() {
    var message = {
      _id: 'abc',
      _rev: 1,
      errors: [
        { code: 'sys.facility_not_found' },
        { code: 'other error' }
      ]
    };
    var facility = { _id: 'xyz' };
    var expected = { 
      _id: 'abc',
      _rev: 1,
      errors: [
        { code: 'other error' }
      ],
      contact: {
        _id: 'xyz'
      }
    };

    get
      .onFirstCall().returns(KarmaUtils.mockPromise(null, message))
      .onSecondCall().returns(KarmaUtils.mockPromise(null, facility));
    put.returns(KarmaUtils.mockPromise(null, { _id: message._id, _rev: 2 }));

    return service('abc', 'xyz')
      .then(function() {
        chai.expect(put.calledOnce).to.equal(true);
        chai.expect(put.args[0][0]).to.deep.equal(expected);
      });
  });

  it('returns db errors', function(done) {
    get
      .onFirstCall().returns(KarmaUtils.mockPromise('errcode1'))
      .onSecondCall().returns(KarmaUtils.mockPromise(null, {}));
    service('abc', 'xyz')
      .then(function() {
        done(new Error('expected error to be thrown'));
      })
      .catch(function(err) {
        chai.expect(err).to.equal('errcode1');
        done();
      });
  });

  it('returns db errors from second call', function(done) {
    get
      .onFirstCall().returns(KarmaUtils.mockPromise(null, {}))
      .onSecondCall().returns(KarmaUtils.mockPromise('errcode2'));
    service('abc', 'xyz')
      .then(function() {
        done(new Error('expected error to be thrown'));
      })
      .catch(function(err) {
        chai.expect(err).to.equal('errcode2');
        done();
      });
  });

  it('returns save errors', function(done) {
    get
      .onFirstCall().returns(KarmaUtils.mockPromise(null, {}))
      .onSecondCall().returns(KarmaUtils.mockPromise(null, {}));
    put.returns(KarmaUtils.mockPromise('errcode3'));
    service('abc', 'xyz')
      .then(function() {
        done(new Error('expected error to be thrown'));
      })
      .catch(function(err) {
        chai.expect(err).to.equal('errcode3');
        done();
      });
  });

});