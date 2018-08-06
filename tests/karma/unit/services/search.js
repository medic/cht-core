describe('Search service', function() {

  'use strict';

  var service,
      GetDataRecords,
      searchStub,
      db,
      clock;

  beforeEach(function() {
    GetDataRecords = sinon.stub();
    searchStub = sinon.stub();
    searchStub.returns(Promise.resolve());
    db = { query: sinon.stub().resolves() };
    module('inboxApp');
    module(function ($provide) {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('DB', sinon.stub().returns(db));
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

  describe('dateLastVisited', () => {
    beforeEach(() => {
      clock = sinon.useFakeTimers(moment('2018-08-20 18:18:18').valueOf());
    });

    afterEach(function() {
      clock.restore();
    });

    it('sends correct params to search service', () => {
      GetDataRecords.resolves([{ _id: 'a' }]);
      return service('contacts', {}, {}, { extensions: true })
        .then(result => {
          chai.expect(searchStub.callCount).to.equal(1);
          chai.expect(searchStub.args[0])
            .to.deep.equal(['contacts', {}, { limit: 50, skip: 0 }, { extensions: true }]);
          chai.expect(result).to.deep.equal([{ _id: 'a' }]);
        });
    });

    it('does not query last visited dates when not set', () => {
      GetDataRecords.resolves([{ _id: 'a' }]);
      return service('contacts', {}, {}, { displayLastVisitedDate: false })
        .then(result => {
          chai.expect(searchStub.callCount).to.equal(1);
          chai.expect(searchStub.args[0])
            .to.deep.equal(['contacts', {}, { limit: 50, skip: 0 }, { displayLastVisitedDate: false }]);
          chai.expect(result).to.deep.equal([{ _id: 'a' }]);
          chai.expect(db.query.callCount).to.equal(0);
        });
    });

    it('queries last visited dates when set', () => {
      GetDataRecords.resolves([{ _id: '1' }, { _id: '2' }, { _id: '3' }]);
      searchStub.resolves(['1', '2', '3']);
      db.query
        .withArgs('medic-client/contacts_by_last_visited')
        .resolves({
          rows: [
            { key: '1', value: 0 },
            { key: '1', value: moment('2017-09-10').valueOf() },
            { key: '1', value: moment('2017-12-10').valueOf() },
            { key: '1', value: moment('2018-01-10').valueOf() },
            { key: '1', value: moment('2018-01-22').valueOf() },
            { key: '1', value: moment('2018-03-20').valueOf() },
            { key: '1', value: moment('2018-04-20').valueOf() },
            { key: '1', value: moment('2018-07-31').valueOf() },
            { key: '1', value: moment('2018-08-01').valueOf() },
            { key: '1', value: moment('2018-08-10').valueOf() },
            { key: '1', value: moment('2018-08-02').valueOf() },

            { key: '2', value: -1 },

            { key: '3' , value: 0 },
            { key: '3' , value: moment('2018-07-10').valueOf() },
            { key: '3' , value: moment('2018-07-11').valueOf() },
            { key: '3' , value: moment('2018-07-12').valueOf() },
            { key: '3' , value: moment('2018-07-13').valueOf() },
          ]
        });

      return service('contacts', {}, {}, { displayLastVisitedDate: true })
        .then(result => {
          chai.expect(searchStub.callCount).to.equal(1);
          chai.expect(searchStub.args[0])
            .to.deep.equal(['contacts', {}, { limit: 50, skip: 0 }, { displayLastVisitedDate: true }]);
          chai.expect(db.query.callCount).to.equal(1);
          chai.expect(db.query.args[0])
            .to.deep.equal([ 'medic-client/contacts_by_last_visited', {reduce: false, keys: ['1', '2', '3']} ]);

          console.log(result);
          chai.expect(result).to.deep.equal([
            {
              _id: '1',
              lastVisitedDate: moment('2018-08-10 00:00:00').valueOf(),
              visitCountGoal: undefined,
              visitCount: 3,
              sortByLastVisitedDate: undefined
            },
            {
              _id: '2',
              lastVisitedDate: -1,
              visitCountGoal: undefined,
              visitCount: 0,
              sortByLastVisitedDate: undefined
            },
            {
              _id: '3',
              lastVisitedDate: moment('2018-07-13 00:00:00').valueOf(),
              visitCountGoal: undefined,
              visitCount: 0,
              sortByLastVisitedDate: undefined
            }
          ]);
        });
    });

    it('uses provided settings', () => {
      GetDataRecords.resolves([{ _id: '1' }, { _id: '2' }, { _id: '3' }]);
      searchStub.resolves(['1', '2', '3']);
      db.query
        .withArgs('medic-client/contacts_by_last_visited')
        .resolves({
          rows: [
            { key: '1', value: 0 },
            { key: '1', value: moment('2017-09-10').valueOf() },
            { key: '1', value: moment('2017-12-10').valueOf() },
            { key: '1', value: moment('2018-01-10').valueOf() },
            { key: '1', value: moment('2018-01-22').valueOf() },
            { key: '1', value: moment('2018-03-20').valueOf() },
            { key: '1', value: moment('2018-04-20').valueOf() },
            { key: '1', value: moment('2018-07-24').valueOf() },
            { key: '1', value: moment('2018-07-31').valueOf() },
            { key: '1', value: moment('2018-08-01').valueOf() },
            { key: '1', value: moment('2018-08-10').valueOf() },
            { key: '1', value: moment('2018-08-02').valueOf() },

            { key: '2' , value: -1 },

            { key: '3' , value: 0 },
            { key: '3' , value: moment('2018-07-10').valueOf() },
            { key: '3' , value: moment('2018-07-11').valueOf() },
            { key: '3' , value: moment('2018-07-12').valueOf() },
            { key: '3' , value: moment('2018-07-13').valueOf() },
            { key: '3' , value: moment('2018-07-25').valueOf() }
          ]
        });

      const extensions = {
        displayLastVisitedDate: true,
        visitCountSettings: {
          visitCountGoal: 2,
          monthStartDate: 25
        },
        sortByLastVisitedDate: 'yes!!!!'
      };

      return service('contacts', {}, {}, extensions )
        .then(result => {
          chai.expect(searchStub.callCount).to.equal(1);
          chai.expect(searchStub.args[0])
            .to.deep.equal(['contacts', {}, { limit: 50, skip: 0 }, extensions]);
          chai.expect(db.query.callCount).to.equal(1);
          chai.expect(db.query.args[0])
            .to.deep.equal([ 'medic-client/contacts_by_last_visited', { reduce: false, keys: ['1', '2', '3']} ]);

          chai.expect(result).to.deep.equal([
            {
              _id: '1',
              lastVisitedDate: moment('2018-08-10 00:00:00').valueOf(),
              visitCountGoal: 2,
              visitCount: 4,
              sortByLastVisitedDate: 'yes!!!!'
            },
            {
              _id: '2',
              lastVisitedDate: -1,
              visitCountGoal: 2,
              visitCount: 0,
              sortByLastVisitedDate: 'yes!!!!'
            },
            {
              _id: '3',
              lastVisitedDate: moment('2018-07-25 00:00:00').valueOf(),
              visitCountGoal: 2,
              visitCount: 1,
              sortByLastVisitedDate: 'yes!!!!'
            }
          ]);
        });
    });
  });

});
