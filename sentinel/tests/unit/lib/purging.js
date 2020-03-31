const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const moment = require('moment');

const registrationUtils = require('@medic/registration-utils');
const tombstoneUtils = require('@medic/tombstone-utils');
const config = require('../../../src/config');
const purgingUtils = require('@medic/purging-utils');
const request = require('request-promise-native');
const db = require('../../../src/db');

let service;
let clock;

describe('ServerSidePurge', () => {
  beforeEach(() => {
    service = rewire('../../../src/lib/purging');
  });

  afterEach(() => {
    sinon.restore();
    clock && clock.restore();
  });

  describe('getPurgeFn', () => {
    beforeEach(() => {
      sinon.stub(config, 'get');
    });

    it('should return undefined when purge is not configured', () => {
      config.get.returns(undefined);
      chai.expect(service.__get__('getPurgeFn')()).to.equal(undefined);
      chai.expect(config.get.callCount).to.equal(1);
      chai.expect(config.get.args[0][0]).to.equal('purge');
    });

    it('should return undefined when purge fn is not configured', () => {
      config.get.returns({});
      chai.expect(service.__get__('getPurgeFn')()).to.equal(undefined);
      chai.expect(config.get.callCount).to.equal(1);
      chai.expect(config.get.args[0][0]).to.equal('purge');
    });

    it('should return undefined when purge fn cannot be eval-ed', () => {
      config.get.returns({ fn: 'whatever' });
      chai.expect(service.__get__('getPurgeFn')()).to.equal(undefined);
      chai.expect(config.get.callCount).to.equal(1);
      chai.expect(config.get.args[0][0]).to.equal('purge');
    });

    it('should return undefined when purge fn is not a function', () => {
      config.get.returns({ fn: '"whatever"' });
      chai.expect(service.__get__('getPurgeFn')()).to.equal(undefined);
      chai.expect(config.get.callCount).to.equal(1);
      chai.expect(config.get.args[0][0]).to.equal('purge');
    });

    it('should return eval-ed when purge fn is correct', () => {
      const purgeFn = function(n) { return n * n; };
      config.get.returns({ fn: purgeFn.toString() });
      const result = service.__get__('getPurgeFn')();
      chai.expect(config.get.callCount).to.equal(1);
      chai.expect(config.get.args[0][0]).to.equal('purge');
      chai.expect(result(4)).to.equal(16);
      chai.expect(result(3)).to.equal(9);
    });
  });

  describe('getRoles', () => {
    beforeEach(() => {
      sinon.stub(db.users, 'allDocs');
    });

    it('should throw allDocs errors', () => {
      db.users.allDocs.rejects({ some: 'err' });
      return service.__get__('getRoles')().catch(err => {
        chai.expect(err).to.deep.equal({ some: 'err' });
        chai.expect(db.users.allDocs.callCount).to.equal(1);
        chai.expect(db.users.allDocs.args[0]).to.deep.equal([{ include_docs: true }]);
      });
    });

    it('should return all unique role groups', () => {
      sinon.stub(purgingUtils, 'isOffline').returns(true);
      sinon.stub(purgingUtils, 'getRoleHash').callsFake(roles => JSON.stringify(roles));
      db.users.allDocs.resolves({ rows: [
        { id: 'user1', doc: { roles: ['a', 'b'], name: 'user1' }},
        { id: 'user2', doc: { roles: ['b', 'a'], name: 'user2' }},
        { id: 'user3', doc: { roles: ['b', 'c'], name: 'user3' }},
        { id: 'user4', doc: { roles: ['c', 'a'], name: 'user4' }},
        { id: 'user5', doc: { roles: ['a', 'b', 'c'], name: 'user5' }},
        { id: 'user5', doc: { roles: ['c', 'b', 'c', 'a'], name: 'user5' }},
        { id: 'user6', doc: { roles: ['c', 'b', 'c', 'a'], name: 'user5' }},
        { id: 'user7' },
        { id: 'user7', doc: { roles: 'aaa' } },
        { id: 'user7', doc: { roles: [] } },
      ]});

      return service.__get__('getRoles')().then(roles => {
        chai.expect(Object.keys(roles)).to.deep.equal([
          JSON.stringify(['a', 'b']),
          JSON.stringify(['b', 'c']),
          JSON.stringify(['a', 'c']),
          JSON.stringify(['a', 'b', 'c']),
        ]);
        chai.expect(roles[JSON.stringify(['a', 'b'])]).to.deep.equal(['a', 'b']);
        chai.expect(roles[JSON.stringify(['b', 'c'])]).to.deep.equal(['b', 'c']);
        chai.expect(roles[JSON.stringify(['a', 'c'])]).to.deep.equal(['a', 'c']);
        chai.expect(roles[JSON.stringify(['a', 'b', 'c'])]).to.deep.equal(['a', 'b', 'c']);
      });
    });
  });

  describe('initPurgeDbs', () => {
    beforeEach(() => {
      sinon.stub(db, 'get');
    });

    it('should initialize purge dbs for provided roles', () => {
      const purgedb = { put: sinon.stub().resolves() };
      db.get.returns(purgedb);
      const roles = {
        'hash1': ['a'],
        'hash2': ['b'],
        'hash3': ['c'],
      };
      db.medicDbName = 'dummy';

      return service.__get__('initPurgeDbs')(roles).then(() => {
        chai.expect(db.get.callCount).to.equal(3);
        chai.expect(db.get.args[0]).to.deep.equal(['dummy-purged-role-hash1']);
        chai.expect(db.get.args[1]).to.deep.equal(['dummy-purged-role-hash2']);
        chai.expect(db.get.args[2]).to.deep.equal(['dummy-purged-role-hash3']);
        chai.expect(purgedb.put.callCount).to.equal(3);
        chai.expect(purgedb.put.calledWith({ _id: '_local/info', roles: ['a'] })).to.equal(true);
        chai.expect(purgedb.put.calledWith({ _id: '_local/info', roles: ['b'] })).to.equal(true);
        chai.expect(purgedb.put.calledWith({ _id: '_local/info', roles: ['c'] })).to.equal(true);
      });
    });

    it('should catch info doc save conflicts', () => {
      const purgedb = { put: sinon.stub().rejects({ status: 409 }) };
      db.get.returns(purgedb);
      const roles = {
        'hash': ['1'],
        'hash-': ['2', '3'],
        'hash--': ['4', '5', '6'],
      };
      db.medicDbName = 'not-medic';

      return service.__get__('initPurgeDbs')(roles).then(() => {
        chai.expect(db.get.callCount).to.equal(3);
        chai.expect(db.get.args[0]).to.deep.equal(['not-medic-purged-role-hash']);
        chai.expect(db.get.args[1]).to.deep.equal(['not-medic-purged-role-hash-']);
        chai.expect(db.get.args[2]).to.deep.equal(['not-medic-purged-role-hash--']);
        chai.expect(purgedb.put.callCount).to.equal(3);
        chai.expect(purgedb.put.calledWith({ _id: '_local/info', roles: ['1'] })).to.equal(true);
        chai.expect(purgedb.put.calledWith({ _id: '_local/info', roles: ['2', '3'] })).to.equal(true);
        chai.expect(purgedb.put.calledWith({ _id: '_local/info', roles: ['4', '5', '6'] })).to.equal(true);
      });
    });

    it('should always reinitialize the db objects', () => {
      const purgedb = { put: sinon.stub().resolves() };
      db.get.returns(purgedb);
      const roles = { 'hash': ['1'] };
      db.medicDbName = 'not-medic';

      return service.__get__('initPurgeDbs')(roles).then(() => {
        chai.expect(db.get.callCount).to.equal(1);
        chai.expect(db.get.args[0]).to.deep.equal(['not-medic-purged-role-hash']);
        chai.expect(purgedb.put.callCount).to.equal(1);
        chai.expect(purgedb.put.calledWith({ _id: '_local/info', roles: ['1'] })).to.equal(true);
      });
    });

    it('should throw db save errors', () => {
      const purgedb = { put: sinon.stub().rejects({ some: 'err' }) };
      db.get.returns(purgedb);
      const roles = {
        'hash': ['1'],
        'hash-': ['2', '3'],
        'hash--': ['4', '5', '6'],
      };
      db.medicDbName = 'not-medic';

      return service
        .__get__('initPurgeDbs')(roles)
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'err' });
        });
    });
  });

  describe('closePurgeDbs', () => {
    it('should not crash when no purge DBs are cached', () => {
      service.__get__('closePurgeDbs')();
    });

    it('should not crash for falsy dbs', () => {
      sinon.stub(db, 'close');
      service.__set__('purgeDbs', { one: false, two: undefined, three: null });
      service.__get__('closePurgeDbs')();
      chai.expect(db.close.callCount).to.equal(3);
      chai.expect(db.close.args).to.deep.equal([[false], [undefined], [null]]);
    });

    it('should call close function for every db', () => {
      sinon.stub(db, 'close');
      const dbs = { one: 'one', two: 'two', three: 'three', four: false };
      const purgeDbs = Object.assign({}, dbs);
      service.__set__('purgeDbs', purgeDbs);
      service.__get__('closePurgeDbs')();
      chai.expect(db.close.callCount).to.equal(4);
      chai.expect(db.close.args).to.deep.equal([['one'], ['two'], ['three'], [false]]);
      chai.expect(Object.keys(purgeDbs)).to.deep.equal([]);
    });
  });

  describe('getAlreadyPurgedDocs', () => {
    let purgeDbChanges;

    beforeEach(() => {
      purgeDbChanges = sinon.stub();
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges });
    });

    it('should work with no ids', () => {
      return service.__get__('getAlreadyPurgedDocs')(['a', 'b']).then(results => {
        chai.expect(results).to.deep.equal({ 'a': {}, 'b': {} });
        chai.expect(db.get.callCount).to.equal(0);
      });
    });

    it('should throw db errors', () => {
      purgeDbChanges.rejects({ some: 'err' });
      return service.__get__('getAlreadyPurgedDocs')(['a', 'b'], [1, 2]).catch(err => {
        chai.expect(err).to.deep.equal({ some: 'err' });
      });
    });

    it('should request changes with purged ids for every purge db', () => {
      const hashes = ['a', 'b', 'c'];
      const ids = ['1', '2', '3', '4'];
      purgeDbChanges.resolves({ results: [] });
      return service.__get__('getAlreadyPurgedDocs')(hashes, ids).then(results => {
        chai.expect(results).to.deep.equal({ 'a': {}, 'b': {}, 'c': {} });
        chai.expect(db.get.callCount).to.equal(3);
        chai.expect(purgeDbChanges.callCount).to.equal(3);
        chai.expect(purgeDbChanges.args[0]).to.deep.equal([{
          doc_ids: ['purged:1', 'purged:2', 'purged:3', 'purged:4'],
          batch_size: 5,
          seq_interval: 4
        }]);
        chai.expect(purgeDbChanges.args[1]).to.deep.equal(purgeDbChanges.args[0]);
        chai.expect(purgeDbChanges.args[2]).to.deep.equal(purgeDbChanges.args[0]);
      });
    });

    it('should group purges by roles and id, skipping deleted purges', () => {
      const hashes = ['a', 'b', 'c'];
      const ids = ['1', '2', '3', '4', '5', '6'];

      purgeDbChanges.onCall(0).resolves({
        results: [
          { id: 'purged:2', changes: [{ rev: '2-rev' }] },
          { id: 'purged:3', changes: [{ rev: '3-rev' }] },
          { id: 'purged:4', changes: [{ rev: '4-rev' }], deleted: true },
          { id: 'purged:5', changes: [{ rev: '5-rev' }] },
        ]
      });

      purgeDbChanges.onCall(1).resolves({
        results: [
          { id: 'purged:1', changes: [{ rev: '1-rev' }] },
          { id: 'purged:6', changes: [{ rev: '6-rev' }] },
        ]
      });

      purgeDbChanges.onCall(2).resolves({
        results: [
          { id: 'purged:1', changes: [{ rev: '1-rev' }], deleted: true },
          { id: 'purged:3', changes: [{ rev: '3-rev' }] },
          { id: 'purged:4', changes: [{ rev: '4-rev' }] },
          { id: 'purged:6', changes: [{ rev: '6-rev' }], deleted: true },
        ]
      });

      return service.__get__('getAlreadyPurgedDocs')(hashes, ids).then(results => {
        chai.expect(results).to.deep.equal({
          'a': { '2': '2-rev', '3': '3-rev', '5': '5-rev' },
          'b': { '1': '1-rev', '6': '6-rev' },
          'c': { '3': '3-rev', '4': '4-rev' },
        });
      });
    });
  });

  describe('updatePurgedDocs', () => {
    let purgeDbBulkDocs;
    beforeEach(() => {
      purgeDbBulkDocs = sinon.stub();
      sinon.stub(db, 'get').returns({ bulkDocs: purgeDbBulkDocs });
    });

    it('should update nothing if nothing provided', () => {
      return service.__get__('updatePurgedDocs')(['a'], ['1', '2', '3'], { 'a': {}}, { 'a': {}}).then(() => {
        chai.expect(purgeDbBulkDocs.callCount).to.equal(0);
      });
    });

    it('should throw db errors', () => {
      const roles = ['a', 'b'];
      const ids = ['1', '2', '3', '4'];
      const currentlyPurged = {
        'a': { '1': '1-rev', '3': '3-rev' },
        'b': { '2': '2-rev', '4': '4-rev' },
      };

      const newPurged = {
        'a': { '1': true, '2': true },
        'b': {'1': true, '4': true },
      };

      purgeDbBulkDocs.onCall(1).rejects({ some: 'err' });

      return service.__get__('updatePurgedDocs')(roles, ids, currentlyPurged, newPurged).catch(err => {
        chai.expect(err).to.deep.equal({ some: 'err' });
      });
    });

    it('should add new purges and remove old purges', () => {
      const roles = ['a', 'b'];
      const ids = ['1', '2', '3', '4'];
      const currentlyPurged = {
        'a': {
          '1': '1-rev',
          '3': '3-rev',
        },
        'b': {
          '2': '2-rev',
          '4': '4-rev',
        }
      };

      const newPurged = {
        'a': {
          '1': true,
          '2': true,
        },
        b: {
          '1': true,
          '4': true,
        }
      };

      return service.__get__('updatePurgedDocs')(roles, ids, currentlyPurged, newPurged).then(() => {
        chai.expect(purgeDbBulkDocs.callCount).to.equal(2);
        chai.expect(purgeDbBulkDocs.args[0]).to.deep.equal([{ docs: [
          { _id: 'purged:2' },
          { _id: 'purged:3', _rev: '3-rev', _deleted: true }
        ]}]);
        chai.expect(purgeDbBulkDocs.args[1]).to.deep.equal([{ docs: [
          { _id: 'purged:1' },
          { _id: 'purged:2', _rev: '2-rev', _deleted: true }
        ]}]);
      });
    });

    it('should skip empty updates', () => {
      const roles = ['a', 'b', 'c'];
      const ids = ['1', '2', '3', '4'];
      const currentlyPurged = {
        'a': { '1': '1', '3': '3' },
        'b': { '2': '2', '4': '4' },
        'c': {  },
      };

      const newPurged = {
        'a': { '1': true, '2': true },
        'b': { '2': true, '4': true },
        'c': { }
      };

      return service.__get__('updatePurgedDocs')(roles, ids, currentlyPurged, newPurged).then(() => {
        chai.expect(purgeDbBulkDocs.callCount).to.equal(1);
        chai.expect(purgeDbBulkDocs.args[0]).to.deep.equal([{ docs: [
          { _id: 'purged:2' },
          { _id: 'purged:3', _rev: '3', _deleted: true }
        ]}]);
      });
    });
  });

  describe('batchedContactsPurge', () => {
    let roles;
    let purgeFn;

    beforeEach(() => {
      roles = { 'a': [1, 2, 3], 'b': [4, 5, 6] };
      purgeFn = sinon.stub();
      db.couchUrl = 'http://a:p@localhost:6500/medic';
    });

    it('should grab contacts_by_type', () => {
      sinon.stub(request, 'get').resolves({ rows: [] });
      sinon.stub(db, 'get').resolves({});
      sinon.stub(db.medic, 'query').resolves({ rows: [] });

      return service.__get__('batchedContactsPurge')(roles, purgeFn).then(() => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(request.get.args[0]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic-client/_view/contacts_by_type',
          {
            qs: {
              limit: 1000,
              start_key:  JSON.stringify(''),
              startkey_docid: '',
              include_docs: true
            },
            json: true
          }
        ]);
      });
    });

    it('should continue requesting contacts_by_type until no more new results are received', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 'first', key: 'district', doc: { _id: 'first' } },
        { id: 'f1', key: 'health_center', doc: { _id: 'f1' } },
        { id: 'f2', key: 'person', doc: { _id: 'f2', patient_id: 's2' } },
        { id: 'f3', key: 'person', doc: { _id: 'f3', patient_id: 's3' } },
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 'f3', key: 'person', doc: { _id: 'f3', patient_id: 's3', } },
        { id: 'f4', key: 'health_center', doc: { _id: 'f4' } },
        { id: 'f5', key: 'clinic', doc: { _id: 'f5', place_id: 's5' } },
      ]});

      request.get.onCall(2).resolves({ rows: [
        { id: 'f5', key: 'clinic', doc: { _id: 'f5', place_id: 's5' } },
        { id: 'f6', key: 'district', doc: { _id: 'f6' } },
        { id: 'f7', key: 'person', doc: { _id: 'f7', patient_id: 's7' } },
        { id: 'f8', key: 'health_center', doc: { _id: 'f8', place_id: 's8' } },
      ]});

      request.get.onCall(3).resolves({ rows: [
        { id: 'f8', key: 'health_center', doc: { _id: 'f8', place_id: 's8' } },
      ]});

      sinon.stub(db.medic, 'query').resolves({ rows: [] });
      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });

      return service.__get__('batchedContactsPurge')(roles, purgeFn).then(() => {
        chai.expect(request.get.callCount).to.equal(4);
        chai.expect(request.get.args[0]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic-client/_view/contacts_by_type',
          {
            qs: {
              limit: 1000,
              start_key: JSON.stringify(''),
              startkey_docid: '',
              include_docs: true,
            },
            json: true
          }
        ]);

        chai.expect(request.get.args[1]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic-client/_view/contacts_by_type',
          {
            qs: {
              limit: 1000,
              start_key: JSON.stringify('person'),
              startkey_docid: 'f3',
              include_docs: true,
            },
            json: true
          }
        ]);

        chai.expect(request.get.args[2]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic-client/_view/contacts_by_type',
          {
            qs: {
              limit: 1000,
              start_key: JSON.stringify('clinic'),
              startkey_docid: 'f5',
              include_docs: true,
            },
            json: true
          }
        ]);

        chai.expect(request.get.args[3]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic-client/_view/contacts_by_type',
          {
            qs: {
              limit: 1000,
              start_key:  JSON.stringify('health_center'),
              startkey_docid: 'f8',
              include_docs: true,
            },
            json: true
          }
        ]);
      });
    });

    it('should set correct start_key and startkey_docid when last result is a tombstone', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 'first', key: 'district', doc: { _id: 'first', place_id: 'firsts' } },
        { id: 'f1', key: 'district', doc: { _id: 'f1', place_id: 's1' } },
        { id: 'f2', key: 'health_center', doc: { _id: 'f2', place_id: 's3' } },
        { id: 'f3-tombstone', key: 'health_center',
          doc: { _id: 'f3-tombstone', tombstone: { _id: 'f3', place_id: 's3' } } },
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 'f3-tombstone', key: 'health_center',
          doc: { _id: 'f3-tombstone', tombstone: { _id: 'f3', place_id: 's3' } } },
        { id: 'f4-tombstone', key: 'clinic', doc: { _id: 'f4-tombstone', tombstone: { _id: 'f4', place_id: 's4' } } },
        { id: 'f5', key: 'person', doc: { _id: 'f5', patient_id: 's5' } },
      ]});

      request.get.onCall(2).resolves({ rows: [
        { id: 'f5', key: 'person', doc: { _id: 'f5', patient_id: 's5' } },
        { id: 'f6-tombstone', key: 'person', doc: { _id: 'f6-tombstone', tombstone: { _id: 'f6', patient_id: 's6' } } },
        { id: 'f7', key: 'person', doc: { _id: 'f7', patient_id: 's7' } },
        { id: 'f8-tombstone', key: 'person', doc: { _id: 'f8-tombstone', tombstone: { _id: 'f8', patient_id: 's8' } } },
      ]});

      request.get.onCall(3).resolves({ rows: [
        { id: 'f8-tombstone', key: 'person', doc: { _id: 'f8-tombstone', tombstone: { _id: 'f8', patient_id: 's8' } } },
      ]});

      sinon.stub(tombstoneUtils, 'isTombstoneId').callsFake(id => id.includes('tombstone'));
      sinon.stub(tombstoneUtils, 'extractStub').callsFake(id => ({ id: id.replace('-tombstone', '') }));

      sinon.stub(db.medic, 'query').resolves({ rows: [] });
      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });

      return service.__get__('batchedContactsPurge')(roles, purgeFn).then(() => {
        chai.expect(request.get.callCount).to.equal(4);
        chai.expect(request.get.args[0]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic-client/_view/contacts_by_type',
          {
            qs: {
              limit: 1000,
              start_key: JSON.stringify(''),
              startkey_docid: '',
              include_docs: true,
            },
            json: true
          }
        ]);

        chai.expect(request.get.args[1]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic-client/_view/contacts_by_type',
          {
            qs: {
              limit: 1000,
              start_key: JSON.stringify('health_center'),
              startkey_docid: 'f3-tombstone',
              include_docs: true,
            },
            json: true
          }
        ]);

        chai.expect(request.get.args[2]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic-client/_view/contacts_by_type',
          {
            qs: {
              limit: 1000,
              start_key:  JSON.stringify('person'),
              startkey_docid: 'f5',
              include_docs: true,
            },
            json: true
          }
        ]);

        chai.expect(request.get.args[3]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic-client/_view/contacts_by_type',
          {
            qs: {
              limit: 1000,
              start_key:  JSON.stringify('person'),
              startkey_docid: 'f8-tombstone',
              include_docs: true,
            },
            json: true
          }
        ]);
      });
    });

    it('should get all docs_by_replication_key using the retrieved contacts and purge docs', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 'first', key: 'health_center', doc: { _id: 'first', type: 'district_hospital' } },
        { id: 'f1', key: 'clinic', doc: { _id: 'f1', place_id: 's1', type: 'clinic' } },
        { id: 'f2', key: 'person', doc: { _id: 'f2', type: 'person' } },
        { id: 'f4', key: 'clinic', doc: { _id: 'f4', place_id: 's4', type: 'clinic' }},
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 'f4', key: 'clinic', doc: { _id: 'f4', place_id: 's4' }},
      ]});

      sinon.stub(tombstoneUtils, 'isTombstoneId').callsFake(id => id.includes('tombstone'));
      sinon.stub(registrationUtils, 'getSubjectId').callsFake(doc => doc.patient_id);

      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });

      sinon.stub(db.medic, 'query');
      db.medic.query.onCall(0).resolves({ rows: [
        { id: 'first', key: 'first', doc: { _id: 'first', type: 'district_hospital' }},
        { id: 'f1', key: 'f1', doc: { _id: 'f1', place_id: 's1', type: 'clinic' }},
        { id: 'f1-r1', key: 's1', doc: { _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' } },
        { id: 'f1-m1', key: 'f1', doc: { _id: 'f1-m1', type: 'data_record', sms_message: 'a' } },
        { id: 'f1-r2', key: 's1', doc: { _id: 'f1-r2', type: 'data_record', form: 'b', patient_id: 's1' } },
        { id: 'f1-m2', key: 'f1', doc: { _id: 'f1-m2', type: 'data_record', sms_message: 'b' } },
        { id: 'f2', key: 'f2', doc: { _id: 'f2', type: 'person' }},
        { id: 'f2-r1', key: 'f2', doc: { _id: 'f2-r1', type: 'data_record', form: 'a', patient_id: 'f2' } },
        { id: 'f2-r2', key: 'f2', doc: { _id: 'f2-r2', type: 'data_record', form: 'b', patient_id: 'f2' } },
        { id: 'f4', key: 'f4', doc: { _id: 'f4', place_id: 's4', type: 'clinic' }},
        { id: 'f4-m1', key: 'f4', doc: { _id: 'f4-m1', type: 'data_record', sms_message: 'b' } },
        { id: 'f4-m2', key: 'f4', doc: { _id: 'f4-m2', type: 'data_record', sms_message: 'b' } },
      ] });
      db.medic.query.onCall(1).resolves({ rows: [] });

      return service.__get__('batchedContactsPurge')(roles, purgeFn).then(() => {
        chai.expect(request.get.callCount).to.equal(2);
        chai.expect(db.medic.query.callCount).to.equal(2);
        chai.expect(db.medic.query.args[0]).to.deep.equal([
          'medic/docs_by_replication_key',
          { keys: ['first', 'f1', 's1', 'f2', 'f4', 's4'], include_docs: true }
        ]);
        chai.expect(purgeDbChanges.callCount).to.equal(2);
        chai.expect(purgeDbChanges.args[0]).to.deep.equal([{
          doc_ids: [
            'purged:first',
            'purged:f1', 'purged:f1-m1', 'purged:f1-m2', 'purged:f1-r1', 'purged:f1-r2',
            'purged:f2', 'purged:f2-r1', 'purged:f2-r2',
            'purged:f4', 'purged:f4-m1', 'purged:f4-m2',
          ],
          batch_size: 13,
          seq_interval: 12
        }]);

        chai.expect(purgeDbChanges.args[1]).to.deep.equal([{
          doc_ids: [
            'purged:first',
            'purged:f1', 'purged:f1-m1', 'purged:f1-m2', 'purged:f1-r1', 'purged:f1-r2',
            'purged:f2', 'purged:f2-r1', 'purged:f2-r2',
            'purged:f4', 'purged:f4-m1', 'purged:f4-m2',
          ],
          batch_size: 13,
          seq_interval: 12
        }]);

        chai.expect(purgeFn.callCount).to.equal(8);
        chai.expect(purgeFn.args[0]).to.deep.equal([
          { roles: roles['a'] },
          { _id: 'first', type: 'district_hospital' },
          [],
          []
        ]);
        chai.expect(purgeFn.args[1]).deep.to.equal([
          { roles: roles['b'] },
          { _id: 'first', type: 'district_hospital' },
          [],
          []
        ]);

        chai.expect(purgeFn.args[2]).deep.to.equal([
          { roles: roles['a'] },
          { _id: 'f1', type: 'clinic', place_id: 's1' },
          [
            { _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' },
            { _id: 'f1-r2', type: 'data_record', form: 'b', patient_id: 's1' }
          ],
          [
            { _id: 'f1-m1', type: 'data_record', sms_message: 'a' },
            { _id: 'f1-m2', type: 'data_record', sms_message: 'b' }
          ]
        ]);
        chai.expect(purgeFn.args[3]).deep.to.equal([
          { roles: roles['b'] },
          { _id: 'f1', type: 'clinic', place_id: 's1' },
          [
            { _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' },
            { _id: 'f1-r2', type: 'data_record', form: 'b', patient_id: 's1' }
          ],
          [
            { _id: 'f1-m1', type: 'data_record', sms_message: 'a' },
            { _id: 'f1-m2', type: 'data_record', sms_message: 'b' }
          ]
        ]);

        chai.expect(purgeFn.args[4]).deep.to.equal([
          { roles: roles['a'] },
          { _id: 'f2', type: 'person' },
          [
            { _id: 'f2-r1', type: 'data_record', form: 'a', patient_id: 'f2' },
            { _id: 'f2-r2', type: 'data_record', form: 'b', patient_id: 'f2' }
          ],
          []
        ]);
        chai.expect(purgeFn.args[5]).deep.to.equal([
          { roles: roles['b'] },
          { _id: 'f2', type: 'person' },
          [
            { _id: 'f2-r1', type: 'data_record', form: 'a', patient_id: 'f2' },
            { _id: 'f2-r2', type: 'data_record', form: 'b', patient_id: 'f2' }
          ],
          []
        ]);

        chai.expect(purgeFn.args[6]).deep.to.equal([
          { roles: roles['a'] },
          { _id: 'f4', type: 'clinic', place_id: 's4' },
          [],
          [
            { _id: 'f4-m1', type: 'data_record', sms_message: 'b' },
            { _id: 'f4-m2', type: 'data_record', sms_message: 'b' }
          ]
        ]);
        chai.expect(purgeFn.args[7]).deep.to.equal([
          { roles: roles['b'] },
          { _id: 'f4', type: 'clinic', place_id: 's4' },
          [],
          [
            { _id: 'f4-m1', type: 'data_record', sms_message: 'b' },
            { _id: 'f4-m2', type: 'data_record', sms_message: 'b' }
          ]
        ]);
      });
    });

    it('should correctly group messages and reports for tombstones and tombstoned reports', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 'first', key: 'district_hospital', doc: { _id: 'first', type: 'district_hospital' } },
        { id: 'f1-tombstone', key: 'clinic',
          doc: { _id: 'f1-tombstone', tombstone: { _id: 'f1', type: 'clinic', place_id: 's1'  } } },
        { id: 'f2-tombstone', key: 'person',
          doc: { _id: 'f2-tombstone', tombstone: { _id: 'f2', type: 'person' } } },
        { id: 'f3', key: 'health_center', doc: { _id: 'f3', type: 'health_center' } },
        { id: 'f4-tombstone', key: 'person',
          doc: { _id: 'f4-tombstone', tombstone: { _id: 'f4', type: 'person', patient_id: 's4' } } },
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 'f4-tombstone', key: 'person',
          doc: { _id: 'f4-tombstone', tombstone: { _id: 'f4', type: 'person', patient_id: 's4' } } },
      ]});

      sinon.stub(tombstoneUtils, 'isTombstoneId').callsFake(id => id.includes('tombstone'));
      sinon.stub(tombstoneUtils, 'extractStub').callsFake(id => ({ id: id.replace('-tombstone', '') }));
      sinon.stub(registrationUtils, 'getSubjectId').callsFake(doc => doc.patient_id);

      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });

      sinon.stub(db.medic, 'query');
      db.medic.query.onCall(0).resolves({ rows: [
        { id: 'first', key: 'first', doc: { _id: 'first', type: 'district_hospital' }},
        { id: 'f1-tombstone', key: 'f1',
          doc: { _id: 'f1-tombstone', tombstone: { _id: 'f1', type: 'clinic', place_id: 's1'  } } },
        { id: 'f1-r1', key: 's1', doc: { _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' } },
        { id: 'f1-m1', key: 'f1', doc: { _id: 'f1-m1', type: 'data_record', sms_message: 'a' } },
        { id: 'f1-r2', key: 's1', doc: { _id: 'f1-r2', type: 'data_record', form: 'b', patient_id: 's1' } },
        { id: 'f1-m2', key: 'f1', doc: { _id: 'f1-m2', type: 'data_record', sms_message: 'b' } },
        { id: 'f2-tombstone', key: 'f2',
          doc: { _id: 'f1-tombstone', tombstone: { _id: 'f1', type: 'clinic', place_id: 's1'  } }},
        { id: 'f2-r1', key: 'f2', doc: { _id: 'f2-r1', type: 'data_record', form: 'a', patient_id: 'f2' } },
        { id: 'f2-r2', key: 'f2', doc: { _id: 'f2-r2', type: 'data_record', sms_message: 'b' } },
        { id: 'f3', key: 'f3', doc: { _id: 'f3', type: 'health_center' }},
        { id: 'f3-m1-tombstone', key: 'f3', doc: { _id: 'f3-m1-tombstone', type: 'tombstone' } },
        { id: 'f3-r1-tombstone', key: 'f3', doc: { _id: 'f3-r1-tombstone', type: 'tombstone' } },
        { id: 'f3-m2', key: 'f3', doc: { _id: 'f3-m2', type: 'data_record', sms_message: 'b' } },
        { id: 'f3-r2', key: 'f3', doc: { _id: 'f3-r2', type: 'data_record', sms_message: 'b' } },
        { id: 'f4-tombstone', key: 'f4',
          doc: { _id: 'f4-tombstone', tombstone: { _id: 'f4', type: 'person', patient_id: 's4' } }},
      ] });
      db.medic.query.onCall(1).resolves({ rows: [] });

      return service.__get__('batchedContactsPurge')(roles, purgeFn).then(() => {
        chai.expect(request.get.callCount).to.equal(2);
        chai.expect(db.medic.query.callCount).to.equal(2);
        chai.expect(db.medic.query.args[0]).to.deep.equal([
          'medic/docs_by_replication_key',
          { keys: ['first', 'f1', 's1', 'f2', 'f3', 'f4', 's4'], include_docs: true }
        ]);
        chai.expect(purgeDbChanges.callCount).to.equal(2);
        chai.expect(purgeDbChanges.args[0]).to.deep.equal([{
          doc_ids: [
            'purged:first',
            'purged:f1-m1', 'purged:f1-m2', 'purged:f1-r1', 'purged:f1-r2',
            'purged:f2-r2', 'purged:f2-r1',
            'purged:f3', 'purged:f3-m2', 'purged:f3-r2'
          ],
          batch_size: 11,
          seq_interval: 10
        }]);

        chai.expect(purgeDbChanges.args[1]).to.deep.equal([{
          doc_ids: [
            'purged:first',
            'purged:f1-m1', 'purged:f1-m2', 'purged:f1-r1', 'purged:f1-r2',
            'purged:f2-r2', 'purged:f2-r1',
            'purged:f3', 'purged:f3-m2', 'purged:f3-r2'
          ],
          batch_size: 11,
          seq_interval: 10
        }]);

        chai.expect(purgeFn.callCount).to.equal(8);
        chai.expect(purgeFn.args[0]).to.deep.equal([
          { roles: roles['a'] },
          { _id: 'first', type: 'district_hospital' },
          [],
          []
        ]);

        chai.expect(purgeFn.args[2]).to.deep.equal([
          { roles: roles['a'] },
          { _deleted: true },
          [
            { _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' },
            { _id: 'f1-r2', type: 'data_record', form: 'b', patient_id: 's1' }
          ],
          [
            { _id: 'f1-m1', type: 'data_record', sms_message: 'a' },
            { _id: 'f1-m2', type: 'data_record', sms_message: 'b' }
          ]
        ]);

        chai.expect(purgeFn.args[4]).to.deep.equal([
          { roles: roles['a'] },
          { _deleted: true },
          [{ _id: 'f2-r1', type: 'data_record', form: 'a', patient_id: 'f2' }],
          [{ _id: 'f2-r2', type: 'data_record', sms_message: 'b' }]
        ]);

        chai.expect(purgeFn.args[6]).to.deep.equal([
          { roles: roles['a'] },
          { _id: 'f3', type: 'health_center' },
          [],
          [
            { _id: 'f3-m2', type: 'data_record', sms_message: 'b' },
            { _id: 'f3-r2', type: 'data_record', sms_message: 'b' }
          ]
        ]);
      });
    });

    it('should correctly group reports that emit their submitter', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 'first', key: 'first', doc: { _id: 'first', type: 'district_hospital' } },
        { id: 'f1', key: 'clinic', doc: { _id: 'f1', type: 'clinic', place_id: 's1' } },
        { id: 'f2', key: 'person', doc: { _id: 'f2', type: 'person', patient_id: 's2' } },
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 'f2', key: 'person', doc: { _id: 'f2', type: 'person', patient_id: 's2' } },
      ]});

      sinon.stub(tombstoneUtils, 'isTombstoneId').callsFake(id => id.includes('tombstone'));
      sinon.stub(registrationUtils, 'getSubjectId').callsFake(doc => doc.patient_id || doc.place_id);

      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });

      sinon.stub(db.medic, 'query');
      db.medic.query.onCall(0).resolves({ rows: [
        { id: 'first', key: 'first', doc: { _id: 'first', type: 'district_hospital' }},
        { id: 'f1', key: 'f1', doc: { _id: 'f1', type: 'clinic', place_id: 's1' }},
        { id: 'f1-r1', key: 's1', doc: { _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' } },
        { id: 'f1-m1', key: 'f1', doc: { _id: 'f1-m1', type: 'data_record', sms_message: 'a' } },
        { id: 'f2', key: 'f2', doc: { _id: 'f2', type: 'person', patient_id: 's2' }},
        { id: 'f2-r1', key: 'f2', doc: { _id: 'f2-r1', type: 'data_record', form: 'a' } },
        { id: 'f2-r2', key: 'f2', doc: { _id: 'f2-r2', type: 'data_record', form: 'b' } },
        { id: 'f2-r3', key: 's2', doc: { _id: 'f2-r3', type: 'data_record', form: 'a', patient_id: 's2' } },
        { id: 'f2-m1', key: 'f2', doc: { _id: 'f2-m1', type: 'data_record' } },
      ] });
      db.medic.query.onCall(1).resolves({ rows: [] });

      return service.__get__('batchedContactsPurge')(roles, purgeFn).then(() => {
        chai.expect(request.get.callCount).to.equal(2);
        chai.expect(db.medic.query.callCount).to.equal(2);
        chai.expect(db.medic.query.args[0]).to.deep.equal([
          'medic/docs_by_replication_key',
          { keys: ['first', 'f1', 's1', 'f2', 's2'], include_docs: true }
        ]);
        chai.expect(purgeDbChanges.callCount).to.equal(2);
        chai.expect(purgeDbChanges.args[0]).to.deep.equal([{
          doc_ids: [
            'purged:first',
            'purged:f1', 'purged:f1-m1', 'purged:f1-r1',
            'purged:f2', 'purged:f2-m1', 'purged:f2-r3', 'purged:f2-r1', 'purged:f2-r2',
          ],
          batch_size: 10,
          seq_interval: 9
        }]);

        chai.expect(purgeFn.callCount).to.equal(10);
        chai.expect(purgeFn.args[0]).to.deep.equal([
          { roles: roles['a'] },
          { _id: 'first', type: 'district_hospital' },
          [],
          []
        ]);

        chai.expect(purgeFn.args[2]).deep.to.equal([
          { roles: roles['a'] },
          { _id: 'f1', type: 'clinic', place_id: 's1' },
          [{ _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' }],
          [{ _id: 'f1-m1', type: 'data_record', sms_message: 'a' }]
        ]);

        chai.expect(purgeFn.args[4]).deep.to.equal([
          { roles: roles['a'] },
          { _id: 'f2', type: 'person', patient_id: 's2' },
          [{ _id: 'f2-r3', type: 'data_record', form: 'a', patient_id: 's2' }],
          [{ _id: 'f2-m1', type: 'data_record' }]
        ]);

        chai.expect(purgeFn.args[6]).deep.to.equal([
          { roles: roles['a'] },
          {},
          [{ _id: 'f2-r1', type: 'data_record', form: 'a' }],
          []
        ]);

        chai.expect(purgeFn.args[8]).deep.to.equal([
          { roles: roles['a'] },
          {},
          [{ _id: 'f2-r2', type: 'data_record', form: 'b' }],
          []
        ]);
      });
    });

    it('should correctly ignore reports with needs_signoff when they emit submitter lineage', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 'first', key: 'district_hospital', doc: { _id: 'first', type: 'district_hospital' } },
        { id: 'f1', key: 'clinic', doc: { _id: 'f1', type: 'clinic', place_id: 's1' } },
        { id: 'f2', key: 'person', doc: { _id: 'f2', type: 'person' } },
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 'f2', key: 'person', doc: { _id: 'f2', type: 'person' } },
      ]});

      sinon.stub(tombstoneUtils, 'isTombstoneId').callsFake(id => id.includes('tombstone'));
      sinon.stub(registrationUtils, 'getSubjectId').callsFake(doc => doc.patient_id);

      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });

      sinon.stub(db.medic, 'query');
      db.medic.query.onCall(0).resolves({ rows: [
        { id: 'first', key: 'first', doc: { _id: 'first', type: 'district_hospital' } },
        { id: 'f1', key: 'f1', doc: { _id: 'f1', type: 'clinic', place_id: 's1' } },
        { id: 'f1-r1', key: 's1',
          doc: { _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1', needs_signoff: true } },
        { id: 'f1-m1', key: 'f1', doc: { _id: 'f1-m1', type: 'data_record', sms_message: 'a' } },
        { id: 'f2', key: 'f2', doc: { _id: 'f2', type: 'person' } },
        { id: 'f2-r1', key: 'f2',
          doc: { _id: 'f2-r1', type: 'data_record', form: 'a', patient_id: 'random', needs_signoff: true,
            contact: { _id: 'f2' } } },
        { id: 'f2-r2', key: 'f2',
          doc: { _id: 'f2-r2', type: 'data_record', form: 'b', patient_id: 'random', needs_signoff: true,
            contact: { _id: 'other' } } },
        { id: 'f2-r3', key: 'f2',
          doc: { _id: 'f2-r3', type: 'data_record', form: 'a', needs_signoff: true, contact: { _id: 'f2' } } },
        { id: 'f2-r4', key: 'f2',
          doc: { _id: 'f2-r4', type: 'data_record', form: 'a', needs_signoff: true, contact: { _id: 'other' } } },
      ] });
      db.medic.query.onCall(1).resolves({ rows: [] });

      return service.__get__('batchedContactsPurge')(roles, purgeFn).then(() => {
        chai.expect(request.get.callCount).to.equal(2);
        chai.expect(db.medic.query.callCount).to.equal(2);
        chai.expect(db.medic.query.args[0]).to.deep.equal([
          'medic/docs_by_replication_key',
          { keys: ['first', 'f1', 's1', 'f2'], include_docs: true }
        ]);
        chai.expect(purgeDbChanges.callCount).to.equal(2);
        chai.expect(purgeDbChanges.args[0]).to.deep.equal([{
          doc_ids: [
            'purged:first',
            'purged:f1', 'purged:f1-m1',  'purged:f1-r1',
            'purged:f2', 'purged:f2-r3',
          ],
          batch_size: 7,
          seq_interval: 6
        }]);

        chai.expect(purgeFn.callCount).to.equal(8);
        chai.expect(purgeFn.args[0]).to.deep.equal([
          { roles: roles['a'] },
          { _id: 'first', type: 'district_hospital' },
          [],
          []
        ]);

        chai.expect(purgeFn.args[2]).deep.to.equal([
          { roles: roles['a'] },
          { _id: 'f1', type: 'clinic', place_id: 's1' },
          [{ _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1', needs_signoff: true }],
          [{ _id: 'f1-m1', type: 'data_record', sms_message: 'a' }]
        ]);

        chai.expect(purgeFn.args[4]).deep.to.equal([
          { roles: roles['a'] },
          { _id: 'f2', type: 'person' },
          [],
          []
        ]);

        chai.expect(purgeFn.args[6]).deep.to.equal([
          { roles: roles['a'] },
          {},
          [{ _id: 'f2-r3', type: 'data_record', form: 'a', needs_signoff: true, contact: { _id: 'f2' } }],
          []
        ]);
      });
    });

    it('should purge existent and new docs correctly and remove old purges', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 'first', key: 'district_hospital', doc: { _id: 'first', type: 'district_hospital' } },
        { id: 'f1', key: 'clinic', doc: { _id: 'f1', type: 'clinic', place_id: 's1' } },
        { id: 'f2', key: 'person', doc: { _id: 'f2', type: 'person' } },
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 'f2', value: null },
      ]});

      sinon.stub(tombstoneUtils, 'isTombstoneId').callsFake(id => id.includes('tombstone'));
      sinon.stub(registrationUtils, 'getSubjectId').callsFake(doc => doc.patient_id);

      sinon.stub(db.medic, 'query');
      db.medic.query.onCall(0).resolves({ rows: [
        { id: 'first', key: 'first', doc: { _id: 'first', type: 'district_hospital' } },
        { id: 'f1', key: 'f1', doc: { _id: 'f1', type: 'clinic' } },
        { id: 'f1-r1', key: 's1', doc: { _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' } },
        { id: 'f1-m1', key: 'f1', doc: { _id: 'f1-m1', type: 'data_record', sms_message: 'a' } },
        { id: 'f2', key: 'f2', doc: { _id: 'f2', type: 'person' } },
        { id: 'f2-r1', key: 'f2', doc: { _id: 'f2-r1', type: 'data_record', form: 'a', patient_id: 'f2' } },
        { id: 'f2-r2', key: 'f2', doc: { _id: 'f2-r2', type: 'data_record', form: 'b', patient_id: 'f2' } },
        { id: 'f2-m1', key: 'f2', doc: { _id: 'f2-m1', type: 'data_record' } },
        { id: 'f2-r3', key: 'f2', doc: { _id: 'f2-r3', type: 'data_record', form: 'a', patient_id: 'f2' } },
      ] });
      db.medic.query.onCall(1).resolves({ rows: [] });

      const dbA = { changes: sinon.stub(), bulkDocs: sinon.stub().resolves([]) };
      const dbB = { changes: sinon.stub(), bulkDocs: sinon.stub().resolves([]) };
      dbA.changes.resolves({
        results: [
          { id: 'purged:f1-r1', changes: [{ rev: '1' }] },
          { id: 'purged:f2-r2', changes: [{ rev: '2' }], deleted: true },
          { id: 'purged:f2-r3', changes: [{ rev: '2' }]}
        ]
      });
      dbB.changes.resolves({
        results: [
          { id: 'purged:f1-m1', changes: [{ rev: '1' }] },
          { id: 'purged:f2-r1', changes: [{ rev: '2' }], deleted: true },
          { id: 'purged:f2-m1', changes: [{ rev: '2' }]}
        ]
      });
      sinon.stub(db, 'get')
        .onCall(0).returns(dbA)
        .onCall(1).returns(dbB);

      purgeFn.withArgs({ roles: roles['a'] }, { _id: 'first', type: 'district_hospital' }).returns([]);
      purgeFn.withArgs({ roles: roles['b'] }, { _id: 'first', type: 'district_hospital' }).returns([]);
      purgeFn.withArgs({ roles: roles['a'] }, { _id: 'f1', type: 'clinic', place_id: 's1' }).returns(['f1-m1']);
      purgeFn.withArgs({ roles: roles['b'] }, { _id: 'f1', type: 'clinic', place_id: 's1' })
        .returns(['f1-m1', 'f1-r1']);
      purgeFn.withArgs({ roles: roles['a'] }, { _id: 'f2', type: 'person' }).returns(['f2-m1', 'f2-r1']);
      purgeFn.withArgs({ roles: roles['b'] }, { _id: 'f2', type: 'person' }).returns(['f2-r1']);

      return service.__get__('batchedContactsPurge')(roles, purgeFn).then(() => {
        chai.expect(dbA.changes.callCount).to.equal(1);
        chai.expect(dbA.changes.args[0]).to.deep.equal([{
          doc_ids: [
            'purged:first',
            'purged:f1', 'purged:f1-m1', 'purged:f1-r1',
            'purged:f2', 'purged:f2-m1', 'purged:f2-r1', 'purged:f2-r2', 'purged:f2-r3',
          ],
          batch_size: 10,
          seq_interval: 9
        }]);

        chai.expect(dbB.changes.callCount).to.equal(1);
        chai.expect(dbB.changes.args[0]).to.deep.equal([{
          doc_ids: [
            'purged:first',
            'purged:f1', 'purged:f1-m1', 'purged:f1-r1',
            'purged:f2', 'purged:f2-m1', 'purged:f2-r1', 'purged:f2-r2', 'purged:f2-r3',
          ],
          batch_size: 10,
          seq_interval: 9
        }]);

        chai.expect(purgeFn.callCount).to.equal(6);

        chai.expect(dbA.bulkDocs.callCount).to.equal(1);
        chai.expect(dbA.bulkDocs.args[0]).to.deep.equal([{ docs: [
          { _id: 'purged:f1-m1' },
          { _id: 'purged:f1-r1', _deleted: true, _rev: '1' },
          { _id: 'purged:f2-m1' },
          { _id: 'purged:f2-r1' },
          { _id: 'purged:f2-r3', _deleted: true, _rev: '2' },
        ]}]);
        chai.expect(dbB.bulkDocs.callCount).to.equal(1);
        chai.expect(dbB.bulkDocs.args[0]).to.deep.equal([{ docs: [
          { _id: 'purged:f1-r1' },
          { _id: 'purged:f2-m1', _deleted: true, _rev: '2' },
          { _id: 'purged:f2-r1' },
        ]}]);
      });
    });

    it('should not allow random ids from being purged', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 'first', key: 'district_hospital', doc: { _id: 'first', type: 'district_hospital' } },
        { id: 'f1', key: 'clinic', doc: { _id: 'f1', type: 'clinic', place_id: 's1' } },
        { id: 'f2', key: 'clinic', doc: { _id: 'f2', type: 'clinic' } },
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 'f2', key: 'clinic', doc: { _id: 'f2', type: 'clinic' } },
      ]});

      sinon.stub(tombstoneUtils, 'isTombstoneId').callsFake(id => id.includes('tombstone'));
      sinon.stub(registrationUtils, 'getSubjectId').callsFake(doc => doc.patient_id);

      sinon.stub(db.medic, 'query');
      db.medic.query.onCall(0).resolves({ rows: [
        { id: 'first', key: 'first', doc: { _id: 'first', type: 'district_hospital' } },
        { id: 'f1', key: 'f1', doc: { _id: 'f1', type: 'clinic', place_id: 's1' } },
        { id: 'f1-r1', key: 's1', doc: { _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' } },
        { id: 'f1-m1', key: 'f1', doc: { _id: 'f1-m1', type: 'data_record', sms_message: 'a' } },
        { id: 'f2', key: 'f2', doc: { _id: 'f2', type: 'clinic' }},
      ] });
      db.medic.query.onCall(1).resolves({ rows: [] });

      const dbA = { changes: sinon.stub().resolves({ results: [] }), bulkDocs: sinon.stub().resolves([])};
      const dbB = { changes: sinon.stub().resolves({ results: [] }), bulkDocs: sinon.stub().resolves([])};
      sinon.stub(db, 'get')
        .onCall(0).returns(dbA)
        .onCall(1).returns(dbB);

      purgeFn.withArgs({ roles: roles['a'] }, { _id: 'first', type: 'district_hospital' }).returns(['a', 'b']);
      purgeFn.withArgs({ roles: roles['b'] }, { _id: 'first', type: 'district_hospital' }).returns(['c', 'd']);
      purgeFn.withArgs({ roles: roles['a'] }, { _id: 'f1', type: 'clinic', place_id: 's1' }).returns(['f1-m1']);
      purgeFn.withArgs({ roles: roles['b'] }, { _id: 'f1', type: 'clinic', place_id: 's1' })
        .returns(['f1-m1', 'random']);
      purgeFn.withArgs({ roles: roles['a'] }, { _id: 'f2', type: 'clinic' }).returns(['f2-m1']);
      purgeFn.withArgs({ roles: roles['b'] }, { _id: 'f2', type: 'clinic' }).returns(['f2']);

      return service.__get__('batchedContactsPurge')(roles, purgeFn).then(() => {
        chai.expect(dbA.changes.callCount).to.equal(1);
        chai.expect(dbA.changes.args[0]).to.deep.equal([{
          doc_ids: ['purged:first', 'purged:f1', 'purged:f1-m1', 'purged:f1-r1', 'purged:f2',  ],
          batch_size: 6,
          seq_interval: 5
        }]);

        chai.expect(dbB.changes.callCount).to.equal(1);
        chai.expect(dbB.changes.args[0]).to.deep.equal([{
          doc_ids: ['purged:first', 'purged:f1', 'purged:f1-m1', 'purged:f1-r1', 'purged:f2',  ],
          batch_size: 6,
          seq_interval: 5
        }]);

        chai.expect(purgeFn.callCount).to.equal(6);
        chai.expect(purgeFn.args[0]).to.deep.equal([
          { roles: roles['a'] },
          { _id: 'first', type: 'district_hospital' },
          [],
          []
        ]);

        chai.expect(purgeFn.args[2]).to.deep.equal([
          { roles: roles['a'] },
          { _id: 'f1', type: 'clinic', place_id: 's1' },
          [{ _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' }],
          [{ _id: 'f1-m1', type: 'data_record', sms_message: 'a' }]
        ]);

        chai.expect(purgeFn.args[4]).to.deep.equal([
          { roles: roles['a'] },
          { _id: 'f2', type: 'clinic' },
          [],
          []
        ]);

        chai.expect(dbA.bulkDocs.callCount).to.equal(1);
        chai.expect(dbA.bulkDocs.args[0]).to.deep.equal([{ docs: [{ _id: 'purged:f1-m1' }] }]);
        chai.expect(dbB.bulkDocs.callCount).to.equal(1);
        chai.expect(dbB.bulkDocs.args[0]).to.deep.equal([{ docs: [{ _id: 'purged:f1-m1' }, { _id: 'purged:f2' } ] }]);
      });
    });

    it('should handle random results from purgefn', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 'first', key: 'district_hospital', doc: { _id: 'first', type: 'district_hospital' } },
        { id: 'f1', key: 'clinic', doc: { _id: 'f1', type: 'clinic' } },
        { id: 'f2', key: 'clinic', doc: { _id: 'f2', type: 'clinic' } },
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 'f2', key: 'clinic', doc: { _id: 'f2', type: 'clinic' } },
      ]});

      sinon.stub(tombstoneUtils, 'isTombstoneId').callsFake(id => id.includes('tombstone'));
      sinon.stub(registrationUtils, 'getSubjectId').callsFake(doc => doc.patient_id);

      sinon.stub(db.medic, 'query');
      db.medic.query.onCall(0).resolves({ rows: [
        { id: 'first', key: 'first', doc: { _id: 'first', type: 'district_hospital' }},
        { id: 'f1', key: 'f1', doc: { _id: 'f1', type: 'clinic' }},
        { id: 'f1-r1', key: 's1', doc: { _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' } },
        { id: 'f1-m1', key: 'f1', doc: { _id: 'f1-m1', type: 'data_record', sms_message: 'a' } },
        { id: 'f2', key: 'f2', doc: { _id: 'f2', type: 'clinic' }},
      ] });
      db.medic.query.onCall(1).resolves({ rows: [] });

      const dbA = {
        changes: sinon.stub().resolves({ results: [ { id: 'purged:f1-m1', changes: [{ rev: '1' }] } ] }),
        bulkDocs: sinon.stub().resolves([])
      };
      const dbB = {
        changes: sinon.stub().resolves({ results: [] }),
        bulkDocs: sinon.stub().resolves([])
      };
      sinon.stub(db, 'get')
        .onCall(0).returns(dbA)
        .onCall(1).returns(dbB);

      purgeFn.withArgs({ roles: roles['a'] }, { _id: 'first', type: 'district_hospital' }).returns('string');
      purgeFn.withArgs({ roles: roles['b'] }, { _id: 'first', type: 'district_hospital' }).returns({});
      purgeFn.withArgs({ roles: roles['a'] }, { _id: 'f1', type: 'clinic' }).returns([]);
      purgeFn.withArgs({ roles: roles['b'] }, { _id: 'f1', type: 'clinic' }).returns(23);
      purgeFn.withArgs({ roles: roles['a'] }, { _id: 'f2', type: 'clinic' }).returns(false);
      purgeFn.withArgs({ roles: roles['b'] }, { _id: 'f2', type: 'clinic' }).returns(null);

      return service.__get__('batchedContactsPurge')(roles, purgeFn).then(() => {
        chai.expect(dbA.bulkDocs.callCount).to.equal(1);
        chai.expect(dbA.bulkDocs.args[0]).to.deep.equal([{docs: [{_id: 'purged:f1-m1', _rev: '1', _deleted: true}]}]);
        chai.expect(dbB.bulkDocs.callCount).to.equal(0);
      });
    });

    it('should skip any other types than data_records', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 'first', key: 'district_hospital', doc: { _id: 'first', type: 'district_hospital' } },
        { id: 'f1', key: 'clinic', doc: { _id: 'f1', type: 'clinic', place_id: 's1' } },
        { id: 'f2', key: 'person', doc: { _id: 'f2', type: 'person' } },
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 'f2', key: 'person', doc: { _id: 'f2', type: 'person' } },
      ]});

      sinon.stub(registrationUtils, 'getSubjectId').callsFake(doc => doc.patient_id);
      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });

      sinon.stub(db.medic, 'query');
      db.medic.query.onCall(0).resolves({ rows: [
        { id: 'first', key: 'first', doc: { _id: 'first', type: 'district_hospital' } },
        { id: 'f1', key: 'f1', doc: { _id: 'f1', type: 'clinic', place_id: 's1' } },
        { id: 'target~one', key: 's1', doc: { _id: 'target~one', type: 'target', owner: 's1' } },
        { id: 'random~two', key: 'f2', doc: { _id: 'random~two', type: 'random2', form: 'a', contact: 'other' } },
        { id: 'f1-r1', key: 's1',
          doc: { _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' } },
        { id: 'f1-m1', key: 'f1', doc: { _id: 'f1-m1', type: 'data_record', sms_message: 'a' } },
        { id: 'f2', key: 'f2', doc: { _id: 'f2', type: 'person' } },
        { id: 'target~two', key: 'f2', doc: { _id: 'target~two', type: 'target', owner: 'f2' } },
        { id: 'random~one', key: 'f2', doc: { _id: 'random~one', type: 'random', form: 'a', contact: { _id: 'f2' } } },

      ] });
      db.medic.query.onCall(1).resolves({ rows: [] });

      return service.__get__('batchedContactsPurge')(roles, purgeFn).then(() => {
        chai.expect(request.get.callCount).to.equal(2);
        chai.expect(db.medic.query.callCount).to.equal(2);
        chai.expect(db.medic.query.args[0]).to.deep.equal([
          'medic/docs_by_replication_key',
          { keys: ['first', 'f1', 's1', 'f2'], include_docs: true }
        ]);
        chai.expect(purgeDbChanges.callCount).to.equal(2);
        chai.expect(purgeDbChanges.args[0]).to.deep.equal([{
          doc_ids: [
            'purged:first',
            'purged:f1', 'purged:f1-m1',  'purged:f1-r1',
            'purged:f2',
          ],
          batch_size: 6,
          seq_interval: 5
        }]);

        chai.expect(purgeFn.callCount).to.equal(6);
        chai.expect(purgeFn.args[0]).to.deep.equal([
          { roles: roles['a'] },
          { _id: 'first', type: 'district_hospital' },
          [],
          []
        ]);

        chai.expect(purgeFn.args[2]).deep.to.equal([
          { roles: roles['a'] },
          { _id: 'f1', type: 'clinic', place_id: 's1' },
          [{ _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' }],
          [{ _id: 'f1-m1', type: 'data_record', sms_message: 'a' }]
        ]);

        chai.expect(purgeFn.args[4]).deep.to.equal([
          { roles: roles['a'] },
          { _id: 'f2', type: 'person' },
          [],
          []
        ]);
      });
    });

    it('should throw contacts_by_type errors', () => {
      sinon.stub(request, 'get').rejects({ some: 'err' });
      sinon.stub(db, 'get').resolves({});
      sinon.stub(db.medic, 'query');

      return service.__get__('batchedContactsPurge')(roles, purgeFn).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(err).to.deep.equal({some: 'err'});
        chai.expect(db.medic.query.callCount).to.equal(0);
      });
    });

    it('should throw docs_by_replication_key errors ', () => {
      sinon.stub(request, 'get').resolves({ rows: [{ id: 'first', key: 'district_hospital', doc: { _id: 'first' } }]});
      sinon.stub(db.medic, 'query').rejects({ some: 'err' });

      return service.__get__('batchedContactsPurge')(roles, purgeFn).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(err).to.deep.equal({some: 'err'});
      });
    });

    it('should throw purgedb changes errors', () => {
      sinon.stub(request, 'get').resolves({ rows: [{ id: 'first', key: 'district_hospital', doc: { _id: 'first' } }]});
      sinon.stub(db.medic, 'query').resolves({ rows: [{ id: 'first', doc: { _id: 'first' } }] });
      const purgeDbChanges = sinon.stub().rejects({ some: 'err' });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });

      return service.__get__('batchedContactsPurge')(roles, purgeFn).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(err).to.deep.equal({ some: 'err' });
      });
    });

    it('should throw purgefn errors', () => {
      sinon.stub(request, 'get').resolves({ rows: [{ id: 'first', key: 'district_hospital', doc: { _id: 'first' } }]});
      sinon.stub(db.medic, 'query').resolves({ rows: [{ id: 'first', doc: { _id: 'first' } }] });
      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });
      purgeFn.throws(new Error('error'));

      return service.__get__('batchedContactsPurge')(roles, purgeFn).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(purgeDbChanges.callCount).to.equal(2);
        chai.expect(err.message).to.deep.equal('error');
      });
    });

    it('should throw purgedb _bulk_docs errors', () => {
      sinon.stub(request, 'get').resolves({ rows: [{ id: 'first', key: 'district_hospital', doc: { _id: 'first' } }]});
      sinon.stub(db.medic, 'query').resolves({ rows: [{ id: 'first', doc: { _id: 'first' } }] });
      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub().rejects({ some: 'err' }) });
      purgeFn.returns(['first']);

      return service.__get__('batchedContactsPurge')(roles, purgeFn).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(purgeDbChanges.callCount).to.equal(2);
        chai.expect(purgeFn.callCount).to.equal(2);
        chai.expect(err).to.deep.equal({ some: 'err' });
      });
    });
  });

  describe('batchedUnallocatedPurge', () => {
    let roles;
    let purgeFn;

    beforeEach(() => {
      roles = { 'a': [1, 2, 3], 'b': [4, 5, 6] };
      purgeFn = sinon.stub();
      db.couchUrl = 'http://a:p@localhost:6500/medic';
    });

    it('should request first batch', () => {
      sinon.stub(request, 'get').resolves({ rows:[] });
      return service.__get__('batchedUnallocatedPurge')(roles, purgeFn).then(() => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(request.get.args[0]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/docs_by_replication_key',
          {
            qs: {
              limit: 1000,
              key: JSON.stringify('_unassigned'),
              startkey_docid: '',
              include_docs: true
            },
            json: true
          }
        ]);
      });
    });

    it('should stop after no longer getting results', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 'r1', doc: { _id: 'r1', form: 'a' } },
        { id: 'r2', doc: { _id: 'r2', form: 'a' } },
        { id: 'r3', doc: { _id: 'r3' } },
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 'r3', doc: { _id: 'r3' } },
        { id: 'r4', doc: { _id: 'r4', form: 'a' } },
        { id: 'r5', doc: { _id: 'r5' } },
      ]});

      request.get.onCall(2).resolves({ rows: [
        { id: 'r5', doc: { _id: 'r5' } },
      ]});

      sinon.stub(db, 'get').returns({ changes: sinon.stub().resolves({ results: [] }) });

      return service.__get__('batchedUnallocatedPurge')(roles, purgeFn).then(() => {
        chai.expect(request.get.callCount).to.equal(3);
        chai.expect(request.get.args[0]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/docs_by_replication_key',
          {
            qs: {
              limit: 1000,
              key: JSON.stringify('_unassigned'),
              startkey_docid: '',
              include_docs: true
            },
            json: true
          }]);

        chai.expect(request.get.args[1]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/docs_by_replication_key',
          {
            qs: {
              limit: 1000,
              key: JSON.stringify('_unassigned'),
              startkey_docid: 'r3',
              include_docs: true
            },
            json: true
          }]);

        chai.expect(request.get.args[2]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/docs_by_replication_key',
          {
            qs: {
              limit: 1000,
              key: JSON.stringify('_unassigned'),
              startkey_docid: 'r5',
              include_docs: true
            },
            json: true
          }]);
      });
    });

    it('should run purge function over every doc individually', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 'r1', doc: { _id: 'r1', form: 'a' } },
        { id: 'r2', doc: { _id: 'r2', form: 'a' } },
        { id: 'r3', doc: { _id: 'r3' } },
        { id: 'r4', doc: { _id: 'r4', form: 'a' } },
        { id: 'r5', doc: { _id: 'r5' } },
        { id: 'r6', doc: { _id: 'r6', form: 'a' } },
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 'r6', doc: { _id: 'r6' } },
      ]});

      sinon.stub(db, 'get').returns({ changes: sinon.stub().resolves({ results: [] }) });

      return service.__get__('batchedUnallocatedPurge')(roles, purgeFn).then(() => {
        chai.expect(request.get.callCount).to.equal(2);
        chai.expect(purgeFn.callCount).to.equal(12);
        chai.expect(purgeFn.args[0]).to.deep.equal([{ roles: roles['a'] }, {}, [{ _id: 'r1', form: 'a' }], []]);
        chai.expect(purgeFn.args[1]).to.deep.equal([{ roles: roles['b'] }, {}, [{ _id: 'r1', form: 'a' }], []]);
        chai.expect(purgeFn.args[2]).to.deep.equal([{ roles: roles['a'] }, {}, [{ _id: 'r2', form: 'a' }], []]);
        chai.expect(purgeFn.args[3]).to.deep.equal([{ roles: roles['b'] }, {}, [{ _id: 'r2', form: 'a' }], []]);
        chai.expect(purgeFn.args[4]).to.deep.equal([{ roles: roles['a'] }, {}, [], [{ _id: 'r3' }]]);
        chai.expect(purgeFn.args[5]).to.deep.equal([{ roles: roles['b'] }, {}, [], [{ _id: 'r3' }]]);
        chai.expect(purgeFn.args[6]).to.deep.equal([{ roles: roles['a'] }, {}, [{ _id: 'r4', form: 'a' }], []]);
        chai.expect(purgeFn.args[8]).to.deep.equal([{ roles: roles['a'] }, {}, [], [{ _id: 'r5' }]]);
        chai.expect(purgeFn.args[10]).to.deep.equal([{ roles: roles['a'] }, {}, [{ _id: 'r6', form: 'a' }], []]);
      });
    });

    it('should save new purges and remove old purges', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 'r1', doc: { _id: 'r1', form: 'a' } },
        { id: 'r2', doc: { _id: 'r2', form: 'a' } },
        { id: 'r3', doc: { _id: 'r3' } },
        { id: 'r4', doc: { _id: 'r4', form: 'a' } },
        { id: 'r5', doc: { _id: 'r5' } },
        { id: 'r6', doc: { _id: 'r6', form: 'a' } },
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 'r6', doc: { _id: 'r6' } },
      ]});

      const dbA = { changes: sinon.stub(), bulkDocs: sinon.stub() };
      const dbB = { changes: sinon.stub(), bulkDocs: sinon.stub() };
      sinon.stub(db, 'get')
        .onCall(0).returns(dbA)
        .onCall(1).returns(dbB);

      dbA.changes.resolves({ results: [
        { id: 'purged:r1', changes: [{ rev: 'r1-rev' }] },
        { id: 'purged:r2', changes: [{ rev: 'r2-rev' }] },
        { id: 'purged:r5', changes: [{ rev: 'r5-rev' }], deleted: true },
        { id: 'purged:r6', changes: [{ rev: 'r6-rev' }], deleted: true },
      ]});

      dbB.changes.resolves({ results: [
        { id: 'purged:r2', changes: [{ rev: 'r2-rev' }] },
        { id: 'purged:r4', changes: [{ rev: 'r4-rev' }] },
        { id: 'purged:r5', changes: [{ rev: 'r5-rev' }], deleted: true },
        { id: 'purged:r6', changes: [{ rev: 'r6-rev' }], deleted: true },
      ]});

      purgeFn.withArgs({ roles: roles['a'] }, {}, [{ _id: 'r2', form: 'a' }], []).returns(['r2']);
      purgeFn.withArgs({ roles: roles['a'] }, {}, [], [{ _id: 'r3' }]).returns(['r3']);
      purgeFn.withArgs({ roles: roles['a'] }, {}, [], [{ _id: 'r5' }]).returns(['r5']);

      purgeFn.withArgs({ roles: roles['b'] }, {}, [], [{ _id: 'r3' }]).returns(['r3']);
      purgeFn.withArgs({ roles: roles['b'] }, {}, [{ _id: 'r4', form: 'a' }], []).returns(['r4']);
      purgeFn.withArgs({ roles: roles['b'] }, {}, [{ _id: 'r6', form: 'a' }], []).returns(['r6']);

      return service.__get__('batchedUnallocatedPurge')(roles, purgeFn).then(() => {
        chai.expect(request.get.callCount).to.equal(2);
        chai.expect(purgeFn.callCount).to.equal(12);
        chai.expect(dbA.bulkDocs.callCount).to.equal(1);
        chai.expect(dbA.bulkDocs.args[0]).to.deep.equal([{ docs: [
          { _id: 'purged:r1', _rev: 'r1-rev', _deleted: true },
          { _id: 'purged:r3' },
          { _id: 'purged:r5' },
        ]}]);
        chai.expect(dbB.bulkDocs.callCount).to.equal(1);
        chai.expect(dbB.bulkDocs.args[0]).to.deep.equal([{ docs: [
          { _id: 'purged:r2', _rev: 'r2-rev', _deleted: true },
          { _id: 'purged:r3' },
          { _id: 'purged:r6' },
        ]}]);
      });
    });

    it('should not allow purging of random docs', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 'r1', doc: { _id: 'r1', form: 'a' } },
        { id: 'r2', doc: { _id: 'r2', form: 'a' } },
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 'r2', doc: { _id: 'r2', form: 'a' } },
      ]});

      const dbA = { changes: sinon.stub(), bulkDocs: sinon.stub() };
      const dbB = { changes: sinon.stub(), bulkDocs: sinon.stub() };
      sinon.stub(db, 'get')
        .onCall(0).returns(dbA)
        .onCall(1).returns(dbB);

      dbA.changes.resolves({ results: [
        { id: 'purged:r1', changes: [{ rev: 'r1-rev' }] },
      ]});

      dbB.changes.resolves({ results: []});

      purgeFn.withArgs({ roles: roles['a'] }, {}, [{ _id: 'r1', form: 'a' }], []).returns(['r1', 'r4', 'random']);
      purgeFn.withArgs({ roles: roles['a'] }, {}, [{ _id: 'r2', form: 'a' }], []).returns(['r3', 'r4', 'r2']);

      purgeFn.withArgs({ roles: roles['b'] }, {}, [{ _id: 'r1', form: 'a' }], []).returns(['random', '10', '11']);
      purgeFn.withArgs({ roles: roles['b'] }, {}, [{ _id: 'r2', form: 'a' }], []).returns(['oops', 'fifty', '22']);

      return service.__get__('batchedUnallocatedPurge')(roles, purgeFn).then(() => {
        chai.expect(request.get.callCount).to.equal(2);
        chai.expect(purgeFn.callCount).to.equal(4);
        chai.expect(dbA.bulkDocs.callCount).to.equal(1);
        chai.expect(dbA.bulkDocs.args[0]).to.deep.equal([{ docs: [ { _id: 'purged:r2' }]}]);
        chai.expect(dbB.bulkDocs.callCount).to.equal(0);
      });
    });

    it('should handle random results from purgefn', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 'r1', doc: { _id: 'r1', form: 'a' } },
        { id: 'r2', doc: { _id: 'r2', form: 'a' } },
        { id: 'r3', doc: { _id: 'r3', form: 'a' } },
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 'r3', doc: { _id: 'r3', form: 'a' } },
      ]});

      const dbA = { changes: sinon.stub(), bulkDocs: sinon.stub() };
      const dbB = { changes: sinon.stub(), bulkDocs: sinon.stub() };
      sinon.stub(db, 'get')
        .onCall(0).returns(dbA)
        .onCall(1).returns(dbB);

      dbA.changes.resolves({ results: [
        { id: 'purged:r1', changes: [{ rev: 'r1-rev' }] },
      ]});

      dbB.changes.resolves({ results: []});

      purgeFn.withArgs({ roles: roles['a'] }, {}, [{ _id: 'r1', form: 'a' }], []).returns('rnd');
      purgeFn.withArgs({ roles: roles['a'] }, {}, [{ _id: 'r2', form: 'a' }], []).returns({});
      purgeFn.withArgs({ roles: roles['a'] }, {}, [{ _id: 'r3', form: 'a' }], []).returns(22);

      purgeFn.withArgs({ roles: roles['b'] }, {}, [{ _id: 'r1', form: 'a' }], []).returns(false);
      purgeFn.withArgs({ roles: roles['b'] }, {}, [{ _id: 'r2', form: 'a' }], []).returns(null);
      purgeFn.withArgs({ roles: roles['b'] }, {}, [{ _id: 'r3', form: 'a' }], []).returns([]);

      return service.__get__('batchedUnallocatedPurge')(roles, purgeFn).then(() => {
        chai.expect(request.get.callCount).to.equal(2);
        chai.expect(purgeFn.callCount).to.equal(6);
        chai.expect(dbA.bulkDocs.callCount).to.equal(1);
        chai.expect(dbA.bulkDocs.args[0]).to.deep.equal([{ docs: [
          { _id: 'purged:r1', _rev: 'r1-rev', _deleted: true }
        ]}]);
        chai.expect(dbB.bulkDocs.callCount).to.equal(0);
      });
    });

    it('should throw docs_by_replication_key errors ', () => {
      sinon.stub(request, 'get').rejects({ some: 'err' });

      return service.__get__('batchedUnallocatedPurge')(roles, purgeFn).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(err).to.deep.equal({ some: 'err' });
      });
    });

    it('should throw purgedb changes errors', () => {
      sinon.stub(request, 'get').resolves({ rows: [{ id: 'first', doc: { _id: 'first' } }]});
      const purgeDbChanges = sinon.stub().rejects({ some: 'err' });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });

      return service.__get__('batchedUnallocatedPurge')(roles, purgeFn).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(err).to.deep.equal({ some: 'err' });
      });
    });

    it('should throw purgefn errors', () => {
      sinon.stub(request, 'get').resolves({ rows: [{ id: 'first', doc: { _id: 'first' } }]});
      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });
      purgeFn.throws(new Error('error'));

      return service.__get__('batchedUnallocatedPurge')(roles, purgeFn).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(purgeDbChanges.callCount).to.equal(2);
        chai.expect(err.message).to.deep.equal('error');
      });
    });

    it('should throw purgedb _bulk_docs errors', () => {
      sinon.stub(request, 'get').resolves({ rows: [{ id: 'first', doc: { _id: 'first' }}]});
      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub().rejects({ some: 'err' }) });
      purgeFn.returns(['first']);

      return service.__get__('batchedUnallocatedPurge')(roles, purgeFn).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(purgeDbChanges.callCount).to.equal(2);
        chai.expect(purgeFn.callCount).to.equal(2);
        chai.expect(err).to.deep.equal({ some: 'err' });
      });
    });
  });

  describe('batchedTasksPurge', () => {
    let roles;

    const getDaysAgo = (days) => moment().subtract(days, 'days').format('YYYY-MM-DD');

    beforeEach(() => {
      roles = { 'a': [1, 2, 3], 'b': [4, 5, 6] };
      db.couchUrl = 'http://a:p@localhost:6500/medic';
    });

    it('should request first batch', () => {
      sinon.stub(request, 'get').resolves({ rows:[] });
      clock = sinon.useFakeTimers(moment('2020-03-01').valueOf());

      return service.__get__('batchedTasksPurge')(roles).then(() => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(request.get.args[0]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/tasks_in_terminal_state',
          {
            qs: {
              limit: 1000,
              end_key: JSON.stringify(getDaysAgo(60)),
              start_key: JSON.stringify(''),
              startkey_docid: '',
            },
            json: true
          }
        ]);
      });
    });

    it('should stop after no longer getting results', () => {
      clock = sinon.useFakeTimers(moment('2020-01-23').valueOf());

      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 'task1', key: getDaysAgo(120) },
        { id: 'task2', key: getDaysAgo(100) },
        { id: 'task3', key: getDaysAgo(98) },
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 'task3', key: getDaysAgo(98) },
        { id: 'task4', key: getDaysAgo(78) },
        { id: 'task5', key: getDaysAgo(65) },
      ]});

      request.get.onCall(2).resolves({ rows: [
        { id: 'task5', key: getDaysAgo(65) },
      ]});

      sinon.stub(db, 'get').returns({changes: sinon.stub().resolves({ results: [] }), bulkDocs: sinon.stub() });

      return service.__get__('batchedTasksPurge')(roles).then(() => {
        chai.expect(request.get.callCount).to.equal(3);
        chai.expect(request.get.args[0]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/tasks_in_terminal_state',
          {
            qs: {
              limit: 1000,
              end_key: JSON.stringify(getDaysAgo(60)),
              start_key: JSON.stringify(''),
              startkey_docid: '',
            },
            json: true,
          }]);

        chai.expect(request.get.args[1]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/tasks_in_terminal_state',
          {
            qs: {
              limit: 1000,
              end_key: JSON.stringify(getDaysAgo(60)),
              start_key: JSON.stringify(getDaysAgo(98)),
              startkey_docid: 'task3',
            },
            json: true,
          }]);

        chai.expect(request.get.args[2]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/tasks_in_terminal_state',
          {
            qs: {
              limit: 1000,
              end_key: JSON.stringify(getDaysAgo(60)),
              start_key: JSON.stringify(getDaysAgo(65)),
              startkey_docid: 'task5',
            },
            json: true,
          }]);
      });
    });

    it('should save new purges', () => {
      clock = sinon.useFakeTimers(moment('2020-01-23').valueOf());

      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 't1', key: getDaysAgo(120) },
        { id: 't2', key: getDaysAgo(115) },
        { id: 't3', key: getDaysAgo(110) },
        { id: 't4', key: getDaysAgo(90) },
        { id: 't5', key: getDaysAgo(80) },
        { id: 't6', key: getDaysAgo(70) },
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 't6', key: getDaysAgo(70) },
      ]});

      const dbA = { changes: sinon.stub(), bulkDocs: sinon.stub() };
      const dbB = { changes: sinon.stub(), bulkDocs: sinon.stub() };
      sinon.stub(db, 'get')
        .onCall(0).returns(dbA)
        .onCall(1).returns(dbB);

      dbA.changes.resolves({ results: [] });

      dbB.changes.resolves({ results: [
        { id: 'purged:t2', changes: [{ rev: 't2-rev' }] },
        { id: 'purged:t5', changes: [{ rev: 't5-rev' }] },
      ]});

      return service.__get__('batchedTasksPurge')(roles).then(() => {
        chai.expect(request.get.callCount).to.equal(2);
        chai.expect(dbA.bulkDocs.callCount).to.equal(1);
        chai.expect(dbA.bulkDocs.args[0]).to.deep.equal([{ docs: [
          { _id: 'purged:t1' },
          { _id: 'purged:t2' },
          { _id: 'purged:t3' },
          { _id: 'purged:t4' },
          { _id: 'purged:t5' },
          { _id: 'purged:t6' },
        ]}]);
        chai.expect(dbB.bulkDocs.callCount).to.equal(1);
        chai.expect(dbB.bulkDocs.args[0]).to.deep.equal([{ docs: [
          { _id: 'purged:t1' },
          { _id: 'purged:t3' },
          { _id: 'purged:t4' },
          { _id: 'purged:t6' },
        ]}]);
      });
    });

    it('should throw view errors ', () => {
      sinon.stub(request, 'get').rejects({ some: 'err' });

      return service.__get__('batchedTasksPurge')(roles).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(err).to.deep.equal({ some: 'err' });
      });
    });

    it('should throw purgedb changes errors', () => {
      sinon.stub(request, 'get').resolves({ rows: [{ id: 'first', value: { endDate: 100 } }]});
      const purgeDbChanges = sinon.stub().rejects({ some: 'err' });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });

      return service.__get__('batchedTasksPurge')(roles).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(err).to.deep.equal({ some: 'err' });
      });
    });

    it('should throw purgedb _bulk_docs errors', () => {
      sinon.stub(request, 'get').resolves({ rows: [{ id: 'first', value: { endDate: 100 }}]});
      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub().rejects({ some: 'err' }) });

      return service.__get__('batchedTasksPurge')(roles).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(purgeDbChanges.callCount).to.equal(2);
        chai.expect(err).to.deep.equal({ some: 'err' });
      });
    });
  });

  describe('batchedTargetsPurge', () => {
    let roles;

    beforeEach(() => {
      roles = { 'a': [1, 2, 3], 'b': [4, 5, 6] };
      db.couchUrl = 'http://a:p@localhost:6500/medic';
    });

    it('should request first batch, preserving last 6 months of target docs', () => {
      sinon.stub(request, 'get').resolves({ rows:[] });
      const now = moment('2020-03-23').valueOf();
      sinon.useFakeTimers(now);
      return service.__get__('batchedTargetsPurge')(roles).then(() => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(request.get.args[0]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_all_docs',
          {
            qs: {
              limit: 1000,
              start_key: JSON.stringify('target~'),
              end_key: JSON.stringify('target~2019-09~'),
            },
            json: true
          }
        ]);
      });
    });

    it('should stop after no longer getting results', () => {
      const now = moment('2020-02-23').valueOf();
      clock = sinon.useFakeTimers(now);
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 'target~2019~05~one' },
        { id: 'target~2019~05~two' },
        { id: 'target~2019~05~three' },
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 'target~2019~06~three' },
        { id: 'target~2019~06~one' },
        { id: 'target~2019~06~two' },
      ]});

      request.get.onCall(2).resolves({ rows: [
        { id: 'target~2019~06~two' },
      ]});

      const dbA = { changes: sinon.stub(), bulkDocs: sinon.stub() };
      dbA.changes.resolves({ results: [] });
      dbA.bulkDocs.resolves([]);
      sinon.stub(db, 'get').returns(dbA);

      return service.__get__('batchedTargetsPurge')(roles).then(() => {
        chai.expect(request.get.callCount).to.equal(3);
        chai.expect(request.get.args[0]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_all_docs',
          {
            qs: {
              limit: 1000,
              start_key: JSON.stringify('target~'),
              end_key: JSON.stringify('target~2019-08~'),
            },
            json: true,
          }]);

        chai.expect(request.get.args[1]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_all_docs',
          {
            qs: {
              limit: 1000,
              start_key: JSON.stringify('target~2019~05~three'),
              end_key: JSON.stringify('target~2019-08~'),
            },
            json: true,
          }]);

        chai.expect(request.get.args[2]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_all_docs',
          {
            qs: {
              limit: 1000,
              start_key: JSON.stringify('target~2019~06~two'),
              end_key: JSON.stringify('target~2019-08~'),
            },
            json: true,
          }]);
      });
    });

    it('should save new purges', () => {
      const now = moment('2020-01-14').valueOf();
      clock = sinon.useFakeTimers(now);

      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
        { id: 'target~2019~03~user1' },
        { id: 'target~2019~03~user2' },
        { id: 'target~2019~03~user3' },
        { id: 'target~2019~04~user1' },
        { id: 'target~2019~04~user2' },
        { id: 'target~2019~04~user3' },
        { id: 'target~2019~05~user1' },
        { id: 'target~2019~05~user2' },
      ]});

      request.get.onCall(1).resolves({ rows: [
        { id: 'target~2019~05~user2' },
      ]});

      const dbA = { changes: sinon.stub(), bulkDocs: sinon.stub() };
      const dbB = { changes: sinon.stub(), bulkDocs: sinon.stub() };
      sinon.stub(db, 'get')
        .onCall(0).returns(dbA)
        .onCall(1).returns(dbB);

      dbA.changes.resolves({ results: [] });

      dbB.changes.resolves({ results: [
        { id: 'purged:target~2019~03~user1', changes: [{ rev: 't2-rev' }] },
        { id: 'purged:target~2019~03~user2', changes: [{ rev: 't5-rev' }] },
        { id: 'purged:target~2019~03~user3', changes: [{ rev: 't5-rev' }] },
      ]});

      return service.__get__('batchedTargetsPurge')(roles).then(() => {
        chai.expect(request.get.callCount).to.equal(2);
        chai.expect(dbA.bulkDocs.callCount).to.equal(1);
        chai.expect(dbA.bulkDocs.args[0]).to.deep.equal([{ docs: [
          { _id: 'purged:target~2019~03~user1' },
          { _id: 'purged:target~2019~03~user2' },
          { _id: 'purged:target~2019~03~user3' },
          { _id: 'purged:target~2019~04~user1' },
          { _id: 'purged:target~2019~04~user2' },
          { _id: 'purged:target~2019~04~user3' },
          { _id: 'purged:target~2019~05~user1' },
          { _id: 'purged:target~2019~05~user2' },
        ]}]);
        chai.expect(dbB.bulkDocs.callCount).to.equal(1);
        chai.expect(dbB.bulkDocs.args[0]).to.deep.equal([{ docs: [
          { _id: 'purged:target~2019~04~user1' },
          { _id: 'purged:target~2019~04~user2' },
          { _id: 'purged:target~2019~04~user3' },
          { _id: 'purged:target~2019~05~user1' },
          { _id: 'purged:target~2019~05~user2' },
        ]}]);
      });
    });

    it('should throw allDocs errors ', () => {
      sinon.stub(request, 'get').rejects({ some: 'err' });

      return service.__get__('batchedTargetsPurge')(roles).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(err).to.deep.equal({ some: 'err' });
      });
    });

    it('should throw purgedb changes errors', () => {
      sinon.stub(request, 'get').resolves({ rows: [{ id: 'target~2019-02~fdsdfsdfs' }]});
      const purgeDbChanges = sinon.stub().rejects({ some: 'err' });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });

      return service.__get__('batchedTargetsPurge')(roles).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(err).to.deep.equal({ some: 'err' });
      });
    });

    it('should throw purgedb _bulk_docs errors', () => {
      sinon.stub(request, 'get').resolves({ rows: [{ id: 'target~2019-02~fdsdfsdfs' }]});
      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub().rejects({ some: 'err' }) });

      return service.__get__('batchedTargetsPurge')(roles).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(purgeDbChanges.callCount).to.equal(2);
        chai.expect(err).to.deep.equal({ some: 'err' });
      });
    });
  });

  describe('purge', () => {
    let getPurgeFn;
    let getRoles;
    let initPurgeDbs;
    let closePurgeDbs;
    let batchedContactsPurge;
    let batchedUnallocatedPurge;
    let batchedTasksPurge;
    let batchedTargetsPurge;
    let purgeFn;

    beforeEach(() => {
      getPurgeFn = sinon.stub();
      getRoles = sinon.stub();
      initPurgeDbs = sinon.stub();
      closePurgeDbs = sinon.stub();
      batchedContactsPurge = sinon.stub();
      batchedUnallocatedPurge = sinon.stub();
      batchedTasksPurge = sinon.stub();
      batchedTargetsPurge = sinon.stub();
      purgeFn = sinon.stub();
    });

    it('should not purge if no purge function is configured', () => {
      service.__set__('getPurgeFn', getPurgeFn);
      service.__set__('getRoles', getRoles);
      return service.__get__('purge')().then(() => {
        chai.expect(getPurgeFn.callCount).to.equal(1);
        chai.expect(getRoles.callCount).to.equal(0);
      });
    });

    it('should not purge when no roles', () => {
      getPurgeFn.returns(purgeFn);
      getRoles.resolves({});
      service.__set__('getPurgeFn', getPurgeFn);
      service.__set__('getRoles', getRoles);
      service.__set__('initPurgeDbs', initPurgeDbs);

      return service.__get__('purge')().then(() => {
        chai.expect(getPurgeFn.callCount).to.equal(1);
        chai.expect(getRoles.callCount).to.equal(1);
        chai.expect(initPurgeDbs.callCount).to.equal(0);
      });
    });

    it('should initialize dbs, run per contact, unallocated, tasks and targets purges', () => {
      const roles = { 'a': [1, 2, 3], 'b': [1, 2, 4] };
      getPurgeFn.returns(purgeFn);
      getRoles.resolves(roles);
      initPurgeDbs.resolves();
      batchedContactsPurge.resolves();
      batchedUnallocatedPurge.resolves();
      sinon.stub(db.sentinel, 'put').resolves();

      service.__set__('getPurgeFn', getPurgeFn);
      service.__set__('getRoles', getRoles);
      service.__set__('initPurgeDbs', initPurgeDbs);
      service.__set__('batchedContactsPurge', batchedContactsPurge);
      service.__set__('batchedUnallocatedPurge', batchedUnallocatedPurge);
      service.__set__('batchedTasksPurge', batchedTasksPurge);
      service.__set__('batchedTargetsPurge', batchedTargetsPurge);
      service.__set__('closePurgeDbs', closePurgeDbs);

      return service.__get__('purge')().then(() => {
        chai.expect(getPurgeFn.callCount).to.equal(1);
        chai.expect(getRoles.callCount).to.equal(1);
        chai.expect(initPurgeDbs.callCount).to.equal(1);
        chai.expect(batchedContactsPurge.callCount).to.equal(1);
        chai.expect(batchedContactsPurge.args[0]).to.deep.equal([ roles, purgeFn ]);
        chai.expect(batchedUnallocatedPurge.callCount).to.equal(1);
        chai.expect(batchedUnallocatedPurge.args[0]).to.deep.equal([ roles, purgeFn ]);
        chai.expect(batchedTasksPurge.callCount).to.equal(1);
        chai.expect(batchedTasksPurge.args[0]).to.deep.equal([ roles ]);
        chai.expect(batchedTargetsPurge.callCount).to.equal(1);
        chai.expect(batchedTargetsPurge.args[0]).to.deep.equal([ roles ]);
        chai.expect(db.sentinel.put.callCount).to.equal(1);
        chai.expect(closePurgeDbs.callCount).to.equal(1);
      });
    });

    it('should catch any errors thrown when getting roles', () => {
      getPurgeFn.returns(purgeFn);
      getRoles.rejects({});

      service.__set__('getPurgeFn', getPurgeFn);
      service.__set__('getRoles', getRoles);
      service.__set__('initPurgeDbs', initPurgeDbs);
      service.__set__('batchedContactsPurge', batchedContactsPurge);
      service.__set__('batchedUnallocatedPurge', batchedUnallocatedPurge);
      service.__set__('closePurgeDbs', closePurgeDbs);

      return service.__get__('purge')().then(() => {
        chai.expect(getPurgeFn.callCount).to.equal(1);
        chai.expect(getRoles.callCount).to.equal(1);
        chai.expect(initPurgeDbs.callCount).to.equal(0);
        chai.expect(batchedContactsPurge.callCount).to.equal(0);
        chai.expect(batchedUnallocatedPurge.callCount).to.equal(0);
        chai.expect(closePurgeDbs.callCount).to.equal(1);
      });
    });

    it('should catch any errors thrown when initing dbs', () => {
      const roles = { 'a': [1, 2, 3], 'b': [1, 2, 4] };
      getPurgeFn.returns(purgeFn);
      getRoles.resolves(roles);
      initPurgeDbs.rejects({});

      service.__set__('getPurgeFn', getPurgeFn);
      service.__set__('getRoles', getRoles);
      service.__set__('initPurgeDbs', initPurgeDbs);
      service.__set__('batchedContactsPurge', batchedContactsPurge);
      service.__set__('batchedUnallocatedPurge', batchedUnallocatedPurge);
      service.__set__('closePurgeDbs', closePurgeDbs);

      return service.__get__('purge')().then(() => {
        chai.expect(getPurgeFn.callCount).to.equal(1);
        chai.expect(getRoles.callCount).to.equal(1);
        chai.expect(initPurgeDbs.callCount).to.equal(1);
        chai.expect(batchedContactsPurge.callCount).to.equal(0);
        chai.expect(batchedUnallocatedPurge.callCount).to.equal(0);
        chai.expect(closePurgeDbs.callCount).to.equal(1);
      });
    });

    it('should catch any errors thrown when doing batched contacts purge', () => {
      const roles = { 'a': [1, 2, 3], 'b': [1, 2, 4] };
      getPurgeFn.returns(purgeFn);
      getRoles.resolves(roles);
      initPurgeDbs.resolves();
      batchedContactsPurge.rejects({});

      service.__set__('getPurgeFn', getPurgeFn);
      service.__set__('getRoles', getRoles);
      service.__set__('initPurgeDbs', initPurgeDbs);
      service.__set__('batchedContactsPurge', batchedContactsPurge);
      service.__set__('batchedUnallocatedPurge', batchedUnallocatedPurge);
      service.__set__('closePurgeDbs', closePurgeDbs);

      return service.__get__('purge')().then(() => {
        chai.expect(getPurgeFn.callCount).to.equal(1);
        chai.expect(getRoles.callCount).to.equal(1);
        chai.expect(initPurgeDbs.callCount).to.equal(1);
        chai.expect(batchedContactsPurge.callCount).to.equal(1);
        chai.expect(batchedContactsPurge.args[0]).to.deep.equal([ roles, purgeFn ]);
        chai.expect(batchedUnallocatedPurge.callCount).to.equal(0);
        chai.expect(closePurgeDbs.callCount).to.equal(1);
      });
    });

    it('should catch any errors thrown when doing batched unallocated purge', () => {
      const roles = { 'a': [1, 2, 3], 'b': [1, 2, 4] };
      getPurgeFn.returns(purgeFn);
      getRoles.resolves(roles);
      initPurgeDbs.resolves();
      batchedContactsPurge.resolves();
      batchedUnallocatedPurge.rejects({});
      service.__set__('closePurgeDbs', closePurgeDbs);

      service.__set__('getPurgeFn', getPurgeFn);
      service.__set__('getRoles', getRoles);
      service.__set__('initPurgeDbs', initPurgeDbs);
      service.__set__('batchedContactsPurge', batchedContactsPurge);
      service.__set__('batchedUnallocatedPurge', batchedUnallocatedPurge);

      return service.__get__('purge')().then(() => {
        chai.expect(getPurgeFn.callCount).to.equal(1);
        chai.expect(getRoles.callCount).to.equal(1);
        chai.expect(initPurgeDbs.callCount).to.equal(1);
        chai.expect(batchedContactsPurge.callCount).to.equal(1);
        chai.expect(batchedContactsPurge.args[0]).to.deep.equal([ roles, purgeFn ]);
        chai.expect(batchedUnallocatedPurge.callCount).to.equal(1);
        chai.expect(batchedUnallocatedPurge.args[0]).to.deep.equal([ roles, purgeFn ]);
        chai.expect(closePurgeDbs.callCount).to.equal(1);
      });
    });

    it('should catch any errors thrown when doing batched tasks purge', () => {
      const roles = { 'a': [1, 2, 3], 'b': [1, 2, 4] };
      getPurgeFn.returns(purgeFn);
      getRoles.resolves(roles);
      initPurgeDbs.resolves();
      batchedContactsPurge.resolves();
      batchedUnallocatedPurge.resolves();
      batchedTasksPurge.rejects({});
      service.__set__('closePurgeDbs', closePurgeDbs);

      service.__set__('getPurgeFn', getPurgeFn);
      service.__set__('getRoles', getRoles);
      service.__set__('initPurgeDbs', initPurgeDbs);
      service.__set__('batchedContactsPurge', batchedContactsPurge);
      service.__set__('batchedUnallocatedPurge', batchedUnallocatedPurge);
      service.__set__('batchedTasksPurge', batchedTasksPurge);

      return service.__get__('purge')().then(() => {
        chai.expect(getPurgeFn.callCount).to.equal(1);
        chai.expect(getRoles.callCount).to.equal(1);
        chai.expect(initPurgeDbs.callCount).to.equal(1);
        chai.expect(batchedContactsPurge.callCount).to.equal(1);
        chai.expect(batchedContactsPurge.args[0]).to.deep.equal([ roles, purgeFn ]);
        chai.expect(batchedUnallocatedPurge.callCount).to.equal(1);
        chai.expect(batchedUnallocatedPurge.args[0]).to.deep.equal([ roles, purgeFn ]);
        chai.expect(batchedTasksPurge.callCount).to.equal(1);
        chai.expect(batchedTasksPurge.args[0]).to.deep.equal([ roles ]);
        chai.expect(closePurgeDbs.callCount).to.equal(1);
      });
    });
  });
});
