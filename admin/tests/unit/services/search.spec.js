describe('Search service', function() {

  'use strict';

  let service;
  let GetDataRecords;
  let searchStub;
  let db;
  let session;

  let qAll;

  const objectToIterable = () => {
    qAll = Q.all;

    Q.all = map => {
      if (!map || typeof map[Symbol.iterator] === 'function') {
        return qAll(map);
      }

      const keys = Object.keys(map);
      const iterable = keys.map(key => map[key]);

      return qAll(iterable).then(results => {
        const resultMap = {};
        results.forEach((result, key) => resultMap[keys[key]] = result);
        return resultMap;
      });
    };
  };

  beforeEach(function() {
    objectToIterable();
    GetDataRecords = sinon.stub();
    searchStub = sinon.stub();
    searchStub.returns(Promise.resolve({}));
    db = { query: sinon.stub().resolves() };
    session = { isOnlineOnly: sinon.stub() };
    module('adminApp');
    module(function ($provide) {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('DB', sinon.stub().returns(db));
      $provide.value('GetDataRecords', GetDataRecords);
      $provide.value('SearchFactory', function() {
        return searchStub;
      });
      $provide.value('Session', session);
    });
    inject(function($injector) {
      service = $injector.get('Search');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(GetDataRecords);
    Q.all = qAll;
  });

  describe('debouncing', function() {

    it('debounces if the same query is executed twice', function(done) {
      const expected = [ { id: 'a' } ];
      GetDataRecords.returns(Promise.resolve(expected));
      service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
          setTimeout(done); // defer execution to give the second query time to execute
        })
        .catch((err) => {
          done(err);
        });
      service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.be.empty;
        })
        .catch((err) => done(err));
    });

    it('does not debounce if the same query is executed twice with the force option', (done) => {
      const expected = [ { id: 'a' } ];
      GetDataRecords.returns(Promise.resolve(expected));
      let firstReturned = false;
      service('reports', {})
        .then(function(actual) {
          firstReturned = true;
          chai.expect(actual).to.deep.equal(expected);
        })
        .catch(err => done(err));
      service('reports', {}, { force: true })
        .then(function(actual) {
          chai.expect(firstReturned).to.equal(true);
          chai.expect(actual).to.deep.equal([ { id: 'a' } ]);
          done();
        })
        .catch(err => done(err));
    });

    it('does not debounce different queries - medic/medic/issues/4331)', (done) => {
      GetDataRecords
        .onFirstCall().returns(Promise.resolve([ { id: 'a' } ]))
        .onSecondCall().returns(Promise.resolve([ { id: 'b' } ]));

      let firstReturned = false;
      const filters = { foo: 'bar' };
      service('reports', filters)
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([ { id: 'a' } ]);
          firstReturned = true;
        })
        .catch(err => done(err));

      filters.foo = 'test';
      service('reports', filters)
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([ { id: 'b' } ]);
          chai.expect(firstReturned).to.equal(true);
          done();
        })
        .catch(err => done(err));
    });

    it('does not debounce different queries', (done) => {
      GetDataRecords
        .onFirstCall().returns(Promise.resolve([ { id: 'a' } ]))
        .onSecondCall().returns(Promise.resolve([ { id: 'b' } ]));
      let firstReturned = false;
      service('reports', { freetext: 'first' })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([ { id: 'a' } ]);
          firstReturned = true;
        })
        .catch(err => done(err));
      service('reports', { freetext: 'second' })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([ { id: 'b' } ]);
          chai.expect(firstReturned).to.equal(true);
          done();
        })
        .catch(err => done(err));
    });

    it('does not debounce subsequent queries', function() {
      const expected = [ { id: 'a' } ];
      GetDataRecords.returns(Promise.resolve(expected));
      return service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
        })
        .then(function() {
          return service('reports', {});
        })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
          chai.expect(GetDataRecords.callCount).to.equal(2);
        });
    });

  });
});
