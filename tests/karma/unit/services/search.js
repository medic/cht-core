describe('Search service', function() {

  'use strict';

  var service,
      GetDataRecords,
      searchStub;

  beforeEach(function() {
    GetDataRecords = sinon.stub();
    searchStub = sinon.stub();
    searchStub.returns(Promise.resolve());
    module('inboxApp');
    module(function ($provide) {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('GetDataRecords', GetDataRecords);
      $provide.value('SearchFactory', function() {
        return searchStub;
      });
    });
    inject(function($injector) {
      service = $injector.get('Search');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(GetDataRecords);
  });

  describe('debouncing', function() {

    it('debounces if the same query is executed twice', function(done) {
      var expected = [ { id: 'a' } ];
      GetDataRecords.returns(Promise.resolve(expected));
      service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
          setTimeout(done); // defer execution to give the second query time to execute
        });
      service('reports', {})
        .then(function() {
          throw new Error('the second promise should be ignored');
        });
    });

    it('does not debounce if the same query is executed twice with the force option', function() {
      var expected = [ { id: 'a' } ];
      GetDataRecords.returns(Promise.resolve(expected));
      var firstReturned = false;
      service('reports', {})
        .then(function(actual) {
          firstReturned = true;
          chai.expect(actual).to.deep.equal(expected);
        });
      return service('reports', {}, { force: true })
        .then(function(actual) {
          chai.expect(firstReturned).to.equal(true);
          chai.expect(actual).to.deep.equal([ { id: 'a' } ]);
        });
    });

    it('does not debounce different queries', function() {
      GetDataRecords
        .onFirstCall().returns(Promise.resolve([ { id: 'a' } ]))
        .onSecondCall().returns(Promise.resolve([ { id: 'b' } ]));
      var firstReturned = false;
      service('reports', { freetext: 'first' })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([ { id: 'a' } ]);
          firstReturned = true;
        });
      return service('reports', { freetext: 'second' })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([ { id: 'b' } ]);
          chai.expect(firstReturned).to.equal(true);
        });
    });

    it('does not debounce subsequent queries', function() {
      var expected = [ { id: 'a' } ];
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
