describe('Search service', function() {

  'use strict';

  let service;
  let GetDataRecords;
  let searchStub;
  let db;
  let clock;
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
    module('inboxApp');
    module(function ($provide) {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('DB', sinon.stub().returns(db));
      $provide.value('GetDataRecords', GetDataRecords);
      $provide.value('SearchFactory', function() {
        return searchStub;
      });
      $provide.value('Session', session);
      $provide.value('Telemetry', { record: () => Promise.resolve() });
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
        .then(function() {
          throw new Error('the second promise should be ignored');
        })
        .catch(() => done());
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
        .catch((err) => {
          window.__karma__.error(err);
        });
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
      GetDataRecords.resolves([{ _id: '1' }, { _id: '2' }, { _id: '3' }, { _id: '4' }]);
      searchStub.resolves({ docIds: ['1', '2', '3', '4'] });
      db.query
        .withArgs('medic-client/contacts_by_last_visited')
        .resolves({
          rows: [
            { key: '1', value: { max: moment('2018-08-10').valueOf() } },
            { key: '2', value: { max: moment('2018-08-18').valueOf() } },
            { key: '3', value: { max: moment('2018-07-13').valueOf() } },
            { key: '4', value: { max: -1 } },
            { key: '5', value: { max: moment('2018-07-21').valueOf() } },
            { key: '6', value: { max: moment('2018-06-01').valueOf() } },
            { key: '7', value: { max: moment('2018-07-29').valueOf() } },
            { key: '8', value: { max: moment('2018-07-30').valueOf() } },
          ]
        });

      db.query
        .withArgs('medic-client/visits_by_date')
        .resolves({
          rows: [
            { key: moment('2018-08-01').valueOf(), value: '1' },
            { key: moment('2018-08-02').valueOf(), value: '2' },
            { key: moment('2018-08-04').valueOf(), value: '2' },
            { key: moment('2018-08-04').valueOf(), value: '5' },
            { key: moment('2018-08-05').valueOf(), value: '5' },
            { key: moment('2018-08-08').valueOf(), value: '5' },
            { key: moment('2018-08-10').valueOf(), value: '1' },
            { key: moment('2018-08-10').valueOf(), value: '1' },
            { key: moment('2018-08-12').valueOf(), value: '6' },
            { key: moment('2018-08-13').valueOf(), value: '6' },
            { key: moment('2018-08-16').valueOf(), value: '2' },
            { key: moment('2018-08-18').valueOf(), value: '2' },
            { key: moment('2018-08-18').valueOf(), value: '2' },
          ]
        });

      return service('contacts', {}, {}, { displayLastVisitedDate: true })
        .then(result => {
          chai.expect(searchStub.callCount).to.equal(1);
          chai.expect(searchStub.args[0])
            .to.deep.equal(['contacts', {}, { limit: 50, skip: 0 }, { displayLastVisitedDate: true }]);
          chai.expect(db.query.callCount).to.equal(2);
          chai.expect(db.query.args[0]).to.deep.equal([
            'medic-client/visits_by_date',
            {
              start_key: moment('2018-08-01').startOf('day').valueOf(),
              end_key: moment('2018-08-01').endOf('month').valueOf()
            }
          ]);
          chai.expect(db.query.args[1]).to.deep.equal([
            'medic-client/contacts_by_last_visited',
            { reduce: true, group: true }
          ]);

          chai.expect(result).to.deep.equal([
            {
              _id: '1',
              lastVisitedDate: moment('2018-08-10 00:00:00').valueOf(),
              visitCountGoal: undefined,
              visitCount: 2,
              sortByLastVisitedDate: undefined
            },
            {
              _id: '2',
              lastVisitedDate: moment('2018-08-18 00:00:00').valueOf(),
              visitCountGoal: undefined,
              visitCount: 4,
              sortByLastVisitedDate: undefined
            },
            {
              _id: '3',
              lastVisitedDate: moment('2018-07-13 00:00:00').valueOf(),
              visitCountGoal: undefined,
              visitCount: 0,
              sortByLastVisitedDate: undefined
            },
            {
              _id: '4',
              lastVisitedDate: -1,
              visitCountGoal: undefined,
              visitCount: 0,
              sortByLastVisitedDate: undefined
            }
          ]);
        });
    });

    it('uses provided settings', () => {
      GetDataRecords.resolves([{ _id: '1' }, { _id: '2' }, { _id: '3' }]);
      searchStub.resolves({ docIds: ['1', '2', '3'] });
      db.query
        .withArgs('medic-client/contacts_by_last_visited')
        .resolves({
          rows: [
            { key: '1', value: { max: moment('2018-08-10').valueOf() } },
            { key: '2', value: { max: -1 } },
            { key: '3', value: { max: moment('2018-07-25').valueOf() } },
            { key: '4', value: { max: 0 } },
            { key: '5', value: { max: -1 } },
            { key: '6', value: { max: moment('2018-08-16').valueOf() } }
          ]
        });

      db.query
        .withArgs('medic-client/visits_by_date')
        .resolves({
          rows: [
            { key: moment('2018-07-25').valueOf(), value: '3' },
            { key: moment('2018-07-29').valueOf(), value: '1' },
            { key: moment('2018-08-02').valueOf(), value: '1' },
            { key: moment('2018-08-03').valueOf(), value: '1' },
            { key: moment('2018-08-10').valueOf(), value: '1' },
            { key: moment('2018-08-10').valueOf(), value: '1' },
            { key: moment('2018-08-16').valueOf(), value: '6' }
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
          chai.expect(db.query.callCount).to.equal(2);
          chai.expect(db.query.args[0]).to.deep.equal([
            'medic-client/visits_by_date',
            {
              start_key: moment('2018-07-25').startOf('day').valueOf(),
              end_key: moment('2018-08-24').endOf('day').valueOf()
            }
          ]);
          chai.expect(db.query.args[1])
            .to.deep.equal([ 'medic-client/contacts_by_last_visited', { reduce: true, group: true }]);

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

    it('counts two reports on the same day as the same visit - #4897', () => {
      GetDataRecords.resolves([{ _id: '1' }, { _id: '2' }]);
      searchStub.resolves({ docIds: ['1', '2'] });
      db.query
        .withArgs('medic-client/contacts_by_last_visited')
        .resolves({
          rows: [
            { key: '1', value: { max: moment('2018-08-12 00:01:00').valueOf() } },
            { key: '2', value: { max: moment('2018-08-11 20:00:00').valueOf() } },
            { key: '3', value: { max: moment('2018-08-03').valueOf() } },
            { key: '4', value: { max: moment('2018-08-04').valueOf() } },
            { key: '5', value: { max: moment('2018-08-05').valueOf() } },
            { key: '12', value: { max: moment('2018-08-08').valueOf() } },
          ]
        });
      db.query
        .withArgs('medic-client/visits_by_date')
        .resolves({
          rows: [
            { key: moment('2018-08-01').valueOf(), value: '3' },
            { key: moment('2018-08-03').valueOf(), value: '3' },
            { key: moment('2018-08-04').valueOf(), value: '4' },
            { key: moment('2018-08-05').valueOf(), value: '5' },
            { key: moment('2018-08-08').valueOf(), value: '12' },
            { key: moment('2018-08-10 23:59:00').valueOf(), value: '1' }, // count
            { key: moment('2018-08-11 00:01:00').valueOf(), value: '1' }, // count
            { key: moment('2018-08-11 12:00:00').valueOf(), value: '1' }, // dupe
            { key: moment('2018-08-11 23:59:00').valueOf(), value: '1' }, // dupe
            { key: moment('2018-08-12 00:01:00').valueOf(), value: '1' }, // count
            { key: moment('2018-08-11 12:00:00').valueOf(), value: '2' }, // count
            { key: moment('2018-08-11 20:00:00').valueOf(), value: '2' }, // dupe
          ]
        });

      const extensions = {
        displayLastVisitedDate: true,
        visitCountSettings: {
          visitCountGoal: 2,
          monthStartDate: 1
        }
      };

      return service('contacts', {}, {}, extensions).then(actual => {
        chai.expect(actual).to.deep.equal([
          {
            _id: '1',
            lastVisitedDate: moment('2018-08-12 00:01:00').valueOf(),
            visitCountGoal: 2,
            visitCount: 3,
            sortByLastVisitedDate: undefined
          },
          {
            _id: '2',
            lastVisitedDate: moment('2018-08-11 20:00:00').valueOf(),
            visitCountGoal: 2,
            visitCount: 1,
            sortByLastVisitedDate: undefined
          }
        ]);
      });
    });

    it('should query with keys when user is online', () => {
      GetDataRecords.resolves([{ _id: '1' }, { _id: '2' }, { _id: '3' }]);
      searchStub.resolves({ docIds: ['1', '2', '3'] });
      session.isOnlineOnly.returns(true);
      db.query
        .withArgs('medic-client/contacts_by_last_visited')
        .resolves({
          rows: [
            { key: '1', value: { max: moment('2018-08-10').valueOf() } },
            { key: '2', value: { max: -1 } },
            { key: '3', value: { max: moment('2018-07-25').valueOf() } }
          ]
        });

      db.query
        .withArgs('medic-client/visits_by_date')
        .resolves({
          rows: [
            { key: moment('2018-07-25').valueOf(), value: '3' },
            { key: moment('2018-07-29').valueOf(), value: '1' },
            { key: moment('2018-08-02').valueOf(), value: '1' },
            { key: moment('2018-08-03').valueOf(), value: '1' },
            { key: moment('2018-08-10').valueOf(), value: '1' },
            { key: moment('2018-08-10').valueOf(), value: '1' },
            { key: moment('2018-08-16').valueOf(), value: '6' }
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
          chai.expect(db.query.callCount).to.equal(2);
          chai.expect(db.query.args[0]).to.deep.equal([
            'medic-client/visits_by_date',
            {
              start_key: moment('2018-07-25').startOf('day').valueOf(),
              end_key: moment('2018-08-24').endOf('day').valueOf()
            }
          ]);
          chai.expect(db.query.args[1]).to.deep.equal([
            'medic-client/contacts_by_last_visited',
            { reduce: true, group: true, keys: ['1', '2', '3'] }
          ]);

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

    it('should handle max correctly', () => {
      GetDataRecords.resolves([{ _id: '1' }, { _id: '2' }, { _id: '3' }]);
      searchStub.resolves({ docIds: ['1', '2', '3'] });
      session.isOnlineOnly.returns(true);
      db.query
        .withArgs('medic-client/contacts_by_last_visited')
        .resolves({
          rows: [
            { key: '1', value: { max: 0 } },
            { key: '2', value: { max: -1 } },
            { key: '3', value: { max: moment('2018-07-25').valueOf() } }
          ]
        });

      db.query
        .withArgs('medic-client/visits_by_date')
        .resolves({
          rows: [
            { key: moment('2018-07-25').valueOf(), value: '3' },
            { key: moment('2018-08-16').valueOf(), value: '6' }
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
          chai.expect(db.query.callCount).to.equal(2);
          chai.expect(db.query.args[0]).to.deep.equal([
            'medic-client/visits_by_date',
            {
              start_key: moment('2018-07-25').startOf('day').valueOf(),
              end_key: moment('2018-08-24').endOf('day').valueOf()
            }
          ]);
          chai.expect(db.query.args[1]).to.deep.equal([
            'medic-client/contacts_by_last_visited',
            { reduce: true, group: true, keys: ['1', '2', '3'] }
          ]);

          chai.expect(result).to.deep.equal([
            {
              _id: '1',
              lastVisitedDate: 0,
              visitCountGoal: 2,
              visitCount: 0,
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

    it('should not query visits_by_date when receiving extended results from SearchLib', () => {
      searchStub.resolves({
        docIds: ['1', '2', '3', '4'],
        queryResultsCache: [
          { key: '1', value: moment('2018-08-10').valueOf() },
          { key: '2', value: moment('2018-08-18').valueOf() },
          { key: '3', value: moment('2018-07-13').valueOf() },
          { key: '4', value: -1 },
          { key: '5', value: moment('2018-07-21').valueOf() },
          { key: '6', value: moment('2018-06-01').valueOf() },
          { key: '7', value: moment('2018-07-29').valueOf() },
          { key: '8', value: moment('2018-07-30').valueOf() },
        ]
      });
      GetDataRecords.resolves([{ _id: '1' }, { _id: '2' }, { _id: '3' }, { _id: '4' }]);
      db.query
        .withArgs('medic-client/visits_by_date')
        .resolves({
          rows: [
            { key: moment('2018-08-01').valueOf(), value: '1' },
            { key: moment('2018-08-02').valueOf(), value: '2' },
            { key: moment('2018-08-04').valueOf(), value: '2' },
            { key: moment('2018-08-04').valueOf(), value: '5' },
            { key: moment('2018-08-05').valueOf(), value: '5' },
            { key: moment('2018-08-08').valueOf(), value: '5' },
            { key: moment('2018-08-10').valueOf(), value: '1' },
            { key: moment('2018-08-10').valueOf(), value: '1' },
            { key: moment('2018-08-12').valueOf(), value: '6' },
            { key: moment('2018-08-13').valueOf(), value: '6' },
            { key: moment('2018-08-16').valueOf(), value: '2' },
            { key: moment('2018-08-18').valueOf(), value: '2' },
            { key: moment('2018-08-18').valueOf(), value: '2' },
          ]
        });

      return service('contacts', {}, {}, { displayLastVisitedDate: true, sortByLastVisitedDate: true })
        .then(result => {
          chai.expect(searchStub.callCount).to.equal(1);
          chai.expect(searchStub.args[0]).to.deep.equal([
            'contacts',
            {},
            { limit: 50, skip: 0 },
            { displayLastVisitedDate: true, sortByLastVisitedDate: true }
          ]);
          chai.expect(db.query.callCount).to.equal(1);
          chai.expect(db.query.args[0]).to.deep.equal([
            'medic-client/visits_by_date',
            {
              start_key: moment('2018-08-01').startOf('day').valueOf(),
              end_key: moment('2018-08-01').endOf('month').valueOf()
            }
          ]);

          chai.expect(result).to.deep.equal([
            {
              _id: '1',
              lastVisitedDate: moment('2018-08-10 00:00:00').valueOf(),
              visitCountGoal: undefined,
              visitCount: 2,
              sortByLastVisitedDate: true
            },
            {
              _id: '2',
              lastVisitedDate: moment('2018-08-18 00:00:00').valueOf(),
              visitCountGoal: undefined,
              visitCount: 4,
              sortByLastVisitedDate: true
            },
            {
              _id: '3',
              lastVisitedDate: moment('2018-07-13 00:00:00').valueOf(),
              visitCountGoal: undefined,
              visitCount: 0,
              sortByLastVisitedDate: true
            },
            {
              _id: '4',
              lastVisitedDate: -1,
              visitCountGoal: undefined,
              visitCount: 0,
              sortByLastVisitedDate: true
            }
          ]);
        });
    });
  });

  describe('provided docIds', () => {
    it('merges provided docIds with search results', () => {
      searchStub.resolves({ docIds: [1, 2, 3, 4] });
      GetDataRecords.withArgs([1, 2, 3, 4, 5, 6, 7, 8]).resolves([
        { _id: 1 }, { _id: 2 }, { _id: 3 }, { _id: 4 }, { _id: 5 }, { _id: 6 }, { _id: 7 }, { _id: 8 }
      ]);

      return service('contacts', {}, {}, {}, [5, 6, 7, 8]).then(result => {
        chai.expect(GetDataRecords.callCount).to.equal(1);
        chai.expect(GetDataRecords.args[0][0]).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8]);
        chai.expect(result).to.deep.equal([
          { _id: 1 }, { _id: 2 }, { _id: 3 }, { _id: 4 }, { _id: 5 }, { _id: 6 }, { _id: 7 }, { _id: 8 }
        ]);
      });
    });

    it('merges the lists keeping records unique', () => {
      searchStub.resolves({ docIds: [1, 2, 3, 4] });
      GetDataRecords.withArgs([1, 2, 3, 4, 5]).resolves([
        { _id: 1 }, { _id: 2 }, { _id: 3 }, { _id: 4 }, { _id: 5 }
      ]);

      return service('contacts', {}, {}, {}, [1, 2, 3, 4, 5]).then(result => {
        chai.expect(GetDataRecords.callCount).to.equal(1);
        chai.expect(GetDataRecords.args[0][0]).to.deep.equal([1, 2, 3, 4, 5]);
        chai.expect(result).to.deep.equal([
          { _id: 1 }, { _id: 2 }, { _id: 3 }, { _id: 4 }, { _id: 5 }
        ]);
      });
    });

    it('queries for last visited date with the full list of ids', () => {
      searchStub.resolves({ docIds: ['1', '2'] });
      GetDataRecords.withArgs(['1', '2', '3', '4']).resolves([
        { _id: '1' }, { _id: '2' }, { _id: '3' }, { _id: '4' }
      ]);

      db.query.withArgs('medic-client/visits_by_date').resolves({ rows: []});
      db.query
        .withArgs('medic-client/contacts_by_last_visited')
        .resolves({ rows: [
          { key: '1', value: { max: 1 } },
          { key: '2', value: { max: 2 } },
          { key: '3', value: { max: 3 } },
          { key: '4', value: { max: 4 } },
        ]});

      const extensions = { displayLastVisitedDate: true };

      return service('contacts', {}, {}, extensions, ['3', '4']).then(results => {
        chai.expect(GetDataRecords.callCount).to.equal(1);
        chai.expect(GetDataRecords.args[0][0]).to.deep.equal(['1', '2', '3', '4']);
        chai.expect(db.query.callCount).to.equal(2);
        chai.expect(db.query.args[0]).to.deep.equal([
          'medic-client/visits_by_date',
          { start_key: moment().startOf('month').valueOf(), end_key: moment().endOf('month').valueOf() }
        ]);
        chai.expect(db.query.args[1])
          .to.deep.equal([ 'medic-client/contacts_by_last_visited', { reduce: true, group: true } ]);

        chai.expect(results).to.deep.equal([
          { _id: '1', lastVisitedDate: 1, visitCount: 0, visitCountGoal: undefined, sortByLastVisitedDate: undefined },
          { _id: '2', lastVisitedDate: 2, visitCount: 0, visitCountGoal: undefined, sortByLastVisitedDate: undefined },
          { _id: '3', lastVisitedDate: 3, visitCount: 0, visitCountGoal: undefined, sortByLastVisitedDate: undefined },
          { _id: '4', lastVisitedDate: 4, visitCount: 0, visitCountGoal: undefined, sortByLastVisitedDate: undefined }
        ]);
      });
    });

    it('works for reports too', () => {
      searchStub.resolves({ docIds: [1, 2, 3] });
      GetDataRecords.withArgs([1, 2, 3, 4, 5]).resolves([
        { _id: 1 }, { _id: 2 }, { _id: 3 }, { _id: 4 }, { _id: 5 }
      ]);

      return service('reports', {}, {}, {}, [1, 2, 3, 4, 5]).then(result => {
        chai.expect(GetDataRecords.callCount).to.equal(1);
        chai.expect(GetDataRecords.args[0][0]).to.deep.equal([1, 2, 3, 4, 5]);
        chai.expect(result).to.deep.equal([
          { _id: 1 }, { _id: 2 }, { _id: 3 }, { _id: 4 }, { _id: 5 }
        ]);
      });
    });

    it('has no effect when docIds is empty', () => {
      searchStub.resolves({ docIds: [1, 2, 3] });
      GetDataRecords.withArgs([1, 2, 3]).resolves([
        { _id: 1 }, { _id: 2 }, { _id: 3 }
      ]);

      return service('reports', {}, {}, {}, []).then(result => {
        chai.expect(GetDataRecords.callCount).to.equal(1);
        chai.expect(GetDataRecords.args[0][0]).to.deep.equal([1, 2, 3]);
        chai.expect(result).to.deep.equal([
          { _id: 1 }, { _id: 2 }, { _id: 3 }
        ]);
      });
    });

    it('has no effect when docIds is undefined', () => {
      searchStub.resolves({ docIds: [1, 2, 3] });
      GetDataRecords.withArgs([1, 2, 3]).resolves([
        { _id: 1 }, { _id: 2 }, { _id: 3 }
      ]);

      return service('reports', {}, {}, {}, undefined).then(result => {
        chai.expect(GetDataRecords.callCount).to.equal(1);
        chai.expect(GetDataRecords.args[0][0]).to.deep.equal([1, 2, 3]);
        chai.expect(result).to.deep.equal([
          { _id: 1 }, { _id: 2 }, { _id: 3 }
        ]);
      });
    });
  });
});
