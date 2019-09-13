const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const registrationUtils = require('@medic/registration-utils');
const tombstoneUtils = require('@medic/tombstone-utils');
const config = require('../../../src/config');
const purgingUtils = require('@medic/purging-utils');
const request = require('request-promise-native');
const db = require('../../../src/db');
let service;

describe('ServerSidePurge', () => {
  beforeEach(() => {
    service = rewire('../../../src/lib/purging');
  });

  afterEach(() => {
    const purgeDbs = service.__get__('purgeDbs');
    Object.keys(purgeDbs).forEach(hash => delete purgeDbs[hash]);
    sinon.restore();
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
        chai.expect(purgedb.put.calledWith({ _id: 'local/info', roles: ['a'] })).to.equal(true);
        chai.expect(purgedb.put.calledWith({ _id: 'local/info', roles: ['b'] })).to.equal(true);
        chai.expect(purgedb.put.calledWith({ _id: 'local/info', roles: ['c'] })).to.equal(true);
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
        chai.expect(purgedb.put.calledWith({ _id: 'local/info', roles: ['1'] })).to.equal(true);
        chai.expect(purgedb.put.calledWith({ _id: 'local/info', roles: ['2', '3'] })).to.equal(true);
        chai.expect(purgedb.put.calledWith({ _id: 'local/info', roles: ['4', '5', '6'] })).to.equal(true);
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
        chai.expect(purgedb.put.calledWith({ _id: 'local/info', roles: ['1'] })).to.equal(true);
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

  describe('getRootContacts', () => {
    it('should throw db errors', () => {
      sinon.stub(db.medic, 'query').rejects({ err: true });

      return service.__get__('getRootContacts')().catch(err => {
        chai.expect(err).to.deep.equal({ err: true });
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal(['medic-client/doc_by_type', { key: ['district_hospital'] }]);
      });
    });

    it('should return query results', () => {
      sinon.stub(db.medic, 'query').resolves({ rows: [{ id: 'root1' }, { id: 'root2' }, { id: 'root3' }] });
      return service.__get__('getRootContacts')().then(ids => {
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal(['medic-client/doc_by_type', { key: ['district_hospital'] }]);
        chai.expect(ids).to.deep.equal(['root1', 'root2', 'root3']);
      });
    });
  });

  describe('getExistentPurgedDocs', () => {
    let purgeDbChanges;

    beforeEach(() => {
      purgeDbChanges = sinon.stub();
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges });
    });

    it('should work with no ids', () => {
      return service.__get__('getExistentPurgedDocs')(['a', 'b']).then(results => {
        chai.expect(results).to.deep.equal({ 'a': {}, 'b': {} });
        chai.expect(db.get.callCount).to.equal(0);
      });
    });

    it('should throw db errors', () => {
      purgeDbChanges.rejects({ some: 'err' });
      return service.__get__('getExistentPurgedDocs')(['a', 'b'], [1, 2]).catch(err => {
        chai.expect(err).to.deep.equal({ some: 'err' });
      });
    });

    it('should request changes with purged ids for every purge db', () => {
      const hashes = ['a', 'b', 'c'];
      const ids = ['1', '2', '3', '4'];
      purgeDbChanges.resolves({ results: [] });
      return service.__get__('getExistentPurgedDocs')(hashes, ids).then(results => {
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

      return service.__get__('getExistentPurgedDocs')(hashes, ids).then(results => {
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

    it('should return immediately if no root contact ids are provided', () => {
      sinon.stub(request, 'get');

      return service.__get__('batchedContactsPurge')(roles, purgeFn, []).then(() => {
        chai.expect(request.get.callCount).to.equal(0);
      });
    });

    it('should grab contacts_by_depth selecting the root contacts in sequence', () => {
      sinon.stub(request, 'get').resolves({ rows: [] });
      sinon.stub(db, 'get').resolves({});
      sinon.stub(db.medic, 'query').resolves({ rows: [] });
      const rootContactIds = ['first', 'second', 'third'];

      return service.__get__('batchedContactsPurge')(roles, purgeFn, rootContactIds).then(() => {
        chai.expect(request.get.callCount).to.equal(3);
        chai.expect(request.get.args[0]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/contacts_by_depth',
          {
            qs: {
              limit: 1000,
              key:  JSON.stringify(['first']),
              startkey_docid: ''
            },
            json: true
          }
        ]);

        chai.expect(request.get.args[1]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/contacts_by_depth',
          {
            qs: {
              limit: 1000,
              key:  JSON.stringify(['second']),
              startkey_docid: ''
            },
            json: true
          }
        ]);

        chai.expect(request.get.args[2]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/contacts_by_depth',
          {
            qs: {
              limit: 1000,
              key:  JSON.stringify(['third']),
              startkey_docid: ''
            },
            json: true
          }
        ]);
        chai.expect(rootContactIds).to.deep.equal([]);
      });
    });

    it('should continue requesting descendents of root contact until no more new results are received', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
          { id: 'first', value: null },
          { id: 'f1', value:  null },
          { id: 'f2', value: 's2' },
          { id: 'f3', value: 's3' },
        ]});

      request.get.onCall(1).resolves({ rows: [
          { id: 'f3', value: 's3' },
          { id: 'f4', value: null },
          { id: 'f5', value: 's5' },
        ]});

      request.get.onCall(2).resolves({ rows: [
          { id: 'f5', value: 's5' },
          { id: 'f6', value: null },
          { id: 'f7', value: 's7' },
          { id: 'f8', value: 's8' },
        ]});

      request.get.onCall(3).resolves({ rows: [
          { id: 'f8', value: 's8' },
        ]});

      request.get.onCall(4).resolves({ rows: []});

      sinon.stub(db.medic, 'query').resolves({ rows: [] });
      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });
      const rootContactIds = ['first', 'second'];

      return service.__get__('batchedContactsPurge')(roles, purgeFn, rootContactIds).then(() => {
        chai.expect(request.get.callCount).to.equal(5);
        chai.expect(request.get.args[0]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/contacts_by_depth',
          {
            qs: {
              limit: 1000,
              key:  JSON.stringify(['first']),
              startkey_docid: ''
            },
            json: true
          }
        ]);

        chai.expect(request.get.args[1]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/contacts_by_depth',
          {
            qs: {
              limit: 1000,
              key:  JSON.stringify(['first']),
              startkey_docid: 'f3'
            },
            json: true
          }
        ]);

        chai.expect(request.get.args[2]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/contacts_by_depth',
          {
            qs: {
              limit: 1000,
              key:  JSON.stringify(['first']),
              startkey_docid: 'f5'
            },
            json: true
          }
        ]);

        chai.expect(request.get.args[3]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/contacts_by_depth',
          {
            qs: {
              limit: 1000,
              key:  JSON.stringify(['first']),
              startkey_docid: 'f8'
            },
            json: true
          }
        ]);

        chai.expect(request.get.args[4]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/contacts_by_depth',
          {
            qs: {
              limit: 1000,
              key:  JSON.stringify(['second']),
              startkey_docid: ''
            },
            json: true
          }
        ]);
      });
    });

    it('should set correct startkey_docid when last result is a tombstone', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
          { id: 'first', value: 'firsts' },
          { id: 'f1', value: 's1' },
          { id: 'f2', value: 's3' },
          { id: 'f3-tombstone', value: 's3' },
        ]});

      request.get.onCall(1).resolves({ rows: [
          { id: 'f3-tombstone', value: 's3' },
          { id: 'f4-tombstone', value: 's4' },
          { id: 'f5', value: 's5' },
        ]});

      request.get.onCall(2).resolves({ rows: [
          { id: 'f5', value: 's5' },
          { id: 'f6-tombstone', value: 's6' },
          { id: 'f7', value: 's7' },
          { id: 'f8-tombstone', value: 's8' },
        ]});

      request.get.onCall(3).resolves({ rows: [
          { id: 'f8-tombstone', value: 's9' },
        ]});

      request.get.onCall(4).resolves({ rows: []});

      sinon.stub(tombstoneUtils, 'isTombstoneId').callsFake(id => id.includes('tombstone'));
      sinon.stub(tombstoneUtils, 'extractStub').callsFake(id => ({ id: id.replace('-tombstone', '') }));

      sinon.stub(db.medic, 'query').resolves({ rows: [] });
      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });
      const rootContactIds = ['first', 'second'];

      return service.__get__('batchedContactsPurge')(roles, purgeFn, rootContactIds).then(() => {
        chai.expect(request.get.callCount).to.equal(5);
        chai.expect(request.get.args[0]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/contacts_by_depth',
          {
            qs: {
              limit: 1000,
              key:  JSON.stringify(['first']),
              startkey_docid: ''
            },
            json: true
          }
        ]);

        chai.expect(request.get.args[1]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/contacts_by_depth',
          {
            qs: {
              limit: 1000,
              key:  JSON.stringify(['first']),
              startkey_docid: 'f3-tombstone'
            },
            json: true
          }
        ]);

        chai.expect(request.get.args[2]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/contacts_by_depth',
          {
            qs: {
              limit: 1000,
              key:  JSON.stringify(['first']),
              startkey_docid: 'f5'
            },
            json: true
          }
        ]);

        chai.expect(request.get.args[3]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/contacts_by_depth',
          {
            qs: {
              limit: 1000,
              key:  JSON.stringify(['first']),
              startkey_docid: 'f8-tombstone'
            },
            json: true
          }
        ]);

        chai.expect(request.get.args[4]).to.deep.equal([
          'http://a:p@localhost:6500/medic/_design/medic/_view/contacts_by_depth',
          {
            qs: {
              limit: 1000,
              key:  JSON.stringify(['second']),
              startkey_docid: ''
            },
            json: true
          }
        ]);
      });
    });

    it('should get all docs_by_replication_key using the retrieved contacts and purge docs', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
          { id: 'first', value: null },
          { id: 'f1', value: 's1' },
          { id: 'f2', value: null },
          { id: 'f4', value: 's4' },
        ]});

      request.get.onCall(1).resolves({ rows: [
          { id: 'f4', value: 's4' },
        ]});

      sinon.stub(tombstoneUtils, 'isTombstoneId').callsFake(id => id.includes('tombstone'));
      sinon.stub(registrationUtils, 'getPatientId').callsFake(doc => doc.patient_id);

      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });
      const rootContactIds = ['first'];

      sinon.stub(db.medic, 'query');
      db.medic.query.onCall(0).resolves({ rows: [
          { id: 'first', key: 'first', doc: { _id: 'first', type: 'district_hospital' }},
          { id: 'f1', key: 'f1', doc: { _id: 'f1', type: 'clinic' }},
          { id: 'f1-r1', key: 's1', doc: { _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' } },
          { id: 'f1-m1', key: 'f1', doc: { _id: 'f1-m1', type: 'data_record', sms_message: 'a' } },
          { id: 'f1-r2', key: 's1', doc: { _id: 'f1-r2', type: 'data_record', form: 'b', patient_id: 's1' } },
          { id: 'f1-m2', key: 'f1', doc: { _id: 'f1-m2', type: 'data_record', sms_message: 'b' } },
          { id: 'f2', key: 'f2', doc: { _id: 'f2', type: 'person' }},
          { id: 'f2-r1', key: 'f2', doc: { _id: 'f2-r1', type: 'data_record', form: 'a', patient_id: 'f2' } },
          { id: 'f2-r2', key: 'f2', doc: { _id: 'f2-r2', type: 'data_record', form: 'b', patient_id: 'f2' } },
          { id: 'f4', key: 'f4', doc: { _id: 'f4', type: 'clinic' }},
          { id: 'f4-m1', key: 'f4', doc: { _id: 'f4-m1', type: 'data_record', sms_message: 'b' } },
          { id: 'f4-m2', key: 'f4', doc: { _id: 'f4-m2', type: 'data_record', sms_message: 'b' } },
        ] });
      db.medic.query.onCall(1).resolves({ rows: [] });

      return service.__get__('batchedContactsPurge')(roles, purgeFn, rootContactIds).then(() => {
        chai.expect(request.get.callCount).to.equal(2);
        chai.expect(db.medic.query.callCount).to.equal(2);
        chai.expect(db.medic.query.args[0]).to.deep.equal([
          'medic/docs_by_replication_key',
          { keys: ['first', 'f1', 's1', 'f2', 'f4', 's4'], include_docs: true }
        ]);
        chai.expect(purgeDbChanges.callCount).to.equal(2);
        chai.expect(purgeDbChanges.args[0]).to.deep.equal([{
          doc_ids: [
            'purged:first', 'purged:f1', 'purged:f2', 'purged:f4', 'purged:f1-r1', 'purged:f1-m1', 'purged:f1-r2',
            'purged:f1-m2', 'purged:f2-r1', 'purged:f2-r2', 'purged:f4-m1', 'purged:f4-m2',
          ],
          batch_size: 13,
          seq_interval: 12
        }]);

        chai.expect(purgeDbChanges.args[1]).to.deep.equal([{
          doc_ids: [
            'purged:first', 'purged:f1', 'purged:f2', 'purged:f4', 'purged:f1-r1', 'purged:f1-m1', 'purged:f1-r2',
            'purged:f1-m2', 'purged:f2-r1', 'purged:f2-r2', 'purged:f4-m1', 'purged:f4-m2',
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
          { _id: 'f1', type: 'clinic' },
          [{ _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' }, { _id: 'f1-r2', type: 'data_record', form: 'b', patient_id: 's1' }],
          [{ _id: 'f1-m1', type: 'data_record', sms_message: 'a' }, { _id: 'f1-m2', type: 'data_record', sms_message: 'b' }]
        ]);
        chai.expect(purgeFn.args[3]).deep.to.equal([
          { roles: roles['b'] },
          { _id: 'f1', type: 'clinic' },
          [{ _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' }, { _id: 'f1-r2', type: 'data_record', form: 'b', patient_id: 's1' }],
          [{ _id: 'f1-m1', type: 'data_record', sms_message: 'a' }, { _id: 'f1-m2', type: 'data_record', sms_message: 'b' }]
        ]);

        chai.expect(purgeFn.args[4]).deep.to.equal([
          { roles: roles['a'] },
          { _id: 'f2', type: 'person' },
          [{ _id: 'f2-r1', type: 'data_record', form: 'a', patient_id: 'f2' }, { _id: 'f2-r2', type: 'data_record', form: 'b', patient_id: 'f2' }],
          []
        ]);
        chai.expect(purgeFn.args[5]).deep.to.equal([
          { roles: roles['b'] },
          { _id: 'f2', type: 'person' },
          [{ _id: 'f2-r1', type: 'data_record', form: 'a', patient_id: 'f2' }, { _id: 'f2-r2', type: 'data_record', form: 'b', patient_id: 'f2' }],
          []
        ]);

        chai.expect(purgeFn.args[6]).deep.to.equal([
          { roles: roles['a'] },
          { _id: 'f4', type: 'clinic' },
          [],
          [{ _id: 'f4-m1', type: 'data_record', sms_message: 'b' }, { _id: 'f4-m2', type: 'data_record', sms_message: 'b' }]
        ]);
        chai.expect(purgeFn.args[7]).deep.to.equal([
          { roles: roles['b'] },
          { _id: 'f4', type: 'clinic' },
          [],
          [{ _id: 'f4-m1', type: 'data_record', sms_message: 'b' }, { _id: 'f4-m2', type: 'data_record', sms_message: 'b' }]
        ]);
      });
    });

    it('should correctly group messages and reports for tombstones and tombstoned reports', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
          { id: 'first', value: null },
          { id: 'f1-tombstone', value: 's1' },
          { id: 'f2-tombstone', value: null },
          { id: 'f3', value: null },
          { id: 'f4-tombstone', value: 's4' },
        ]});

      request.get.onCall(1).resolves({ rows: [
          { id: 'f4-tombstone', value: 's4' },
        ]});

      sinon.stub(tombstoneUtils, 'isTombstoneId').callsFake(id => id.includes('tombstone'));
      sinon.stub(tombstoneUtils, 'extractStub').callsFake(id => ({ id: id.replace('-tombstone', '') }));
      sinon.stub(registrationUtils, 'getPatientId').callsFake(doc => doc.patient_id);

      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });
      const rootContactIds = ['first'];

      sinon.stub(db.medic, 'query');
      db.medic.query.onCall(0).resolves({ rows: [
          { id: 'first', key: 'first', doc: { _id: 'first', type: 'district_hospital' }},
          { id: 'f1-tombstone', key: 'f1', doc: { _id: 'f1-tombstone', type: 'clinic' }},
          { id: 'f1-r1', key: 's1', doc: { _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' } },
          { id: 'f1-m1', key: 'f1', doc: { _id: 'f1-m1', type: 'data_record', sms_message: 'a' } },
          { id: 'f1-r2', key: 's1', doc: { _id: 'f1-r2', type: 'data_record', form: 'b', patient_id: 's1' } },
          { id: 'f1-m2', key: 'f1', doc: { _id: 'f1-m2', type: 'data_record', sms_message: 'b' } },
          { id: 'f2-tombstone', key: 'f2', doc: { _id: 'f2', type: 'person' }},
          { id: 'f2-r1', key: 'f2', doc: { _id: 'f2-r1', type: 'data_record', form: 'a', patient_id: 'f2' } },
          { id: 'f2-r2', key: 'f2', doc: { _id: 'f2-r2', type: 'data_record', sms_message: 'b' } },
          { id: 'f3', key: 'f3', doc: { _id: 'f3', type: 'health_center' }},
          { id: 'f3-m1-tombstone', key: 'f3', doc: { _id: 'f3-m1-tombstone', type: 'tombstone' } },
          { id: 'f3-r1-tombstone', key: 'f3', doc: { _id: 'f3-r1-tombstone', type: 'tombstone' } },
          { id: 'f3-m2', key: 'f3', doc: { _id: 'f3-m2', type: 'data_record', sms_message: 'b' } },
          { id: 'f3-r2', key: 'f3', doc: { _id: 'f3-r2', type: 'data_record', sms_message: 'b' } },
          { id: 'f4-tombstone', key: 'f4', doc: { _id: 'f4', type: 'person' }},
        ] });
      db.medic.query.onCall(1).resolves({ rows: [] });

      return service.__get__('batchedContactsPurge')(roles, purgeFn, rootContactIds).then(() => {
        chai.expect(request.get.callCount).to.equal(2);
        chai.expect(db.medic.query.callCount).to.equal(2);
        chai.expect(db.medic.query.args[0]).to.deep.equal([
          'medic/docs_by_replication_key',
          { keys: ['first', 'f1', 's1', 'f2', 'f3', 'f4', 's4'], include_docs: true }
        ]);
        chai.expect(purgeDbChanges.callCount).to.equal(2);
        chai.expect(purgeDbChanges.args[0]).to.deep.equal([{
          doc_ids: [
            'purged:first', 'purged:f3', 'purged:f1-r1', 'purged:f1-m1', 'purged:f1-r2',
            'purged:f1-m2', 'purged:f2-r1', 'purged:f2-r2', 'purged:f3-m2', 'purged:f3-r2'
          ],
          batch_size: 11,
          seq_interval: 10
        }]);

        chai.expect(purgeDbChanges.args[1]).to.deep.equal([{
          doc_ids: [
            'purged:first', 'purged:f3', 'purged:f1-r1', 'purged:f1-m1', 'purged:f1-r2',
            'purged:f1-m2', 'purged:f2-r1', 'purged:f2-r2', 'purged:f3-m2', 'purged:f3-r2'
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
          [{ _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' }, { _id: 'f1-r2', type: 'data_record', form: 'b', patient_id: 's1' }],
          [{ _id: 'f1-m1', type: 'data_record', sms_message: 'a' }, { _id: 'f1-m2', type: 'data_record', sms_message: 'b' }]
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
          [{ _id: 'f3-m2', type: 'data_record', sms_message: 'b' }, { _id: 'f3-r2', type: 'data_record', sms_message: 'b' }]
        ]);
      });
    });

    it('should correctly group reports that emit their submitter', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
          { id: 'first', value: null },
          { id: 'f1', value: 's1' },
          { id: 'f2', value: 's2' },
        ]});

      request.get.onCall(1).resolves({ rows: [
          { id: 'f2', value: 's2' },
        ]});

      sinon.stub(tombstoneUtils, 'isTombstoneId').callsFake(id => id.includes('tombstone'));
      sinon.stub(registrationUtils, 'getPatientId').callsFake(doc => doc.patient_id);

      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });
      const rootContactIds = ['first'];

      sinon.stub(db.medic, 'query');
      db.medic.query.onCall(0).resolves({ rows: [
          { id: 'first', key: 'first', doc: { _id: 'first', type: 'district_hospital' }},
          { id: 'f1', key: 'f1', doc: { _id: 'f1', type: 'clinic' }},
          { id: 'f1-r1', key: 's1', doc: { _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' } },
          { id: 'f1-m1', key: 'f1', doc: { _id: 'f1-m1', type: 'data_record', sms_message: 'a' } },
          { id: 'f2', key: 'f2', doc: { _id: 'f2', type: 'person' }},
          { id: 'f2-r1', key: 'f2', doc: { _id: 'f2-r1', type: 'data_record', form: 'a' } },
          { id: 'f2-r2', key: 'f2', doc: { _id: 'f2-r2', type: 'data_record', form: 'b' } },
          { id: 'f2-r3', key: 's2', doc: { _id: 'f2-r3', type: 'data_record', form: 'a', patient_id: 's2' } },
          { id: 'f2-m1', key: 'f2', doc: { _id: 'f2-m1', type: 'data_record' } },
        ] });
      db.medic.query.onCall(1).resolves({ rows: [] });

      return service.__get__('batchedContactsPurge')(roles, purgeFn, rootContactIds).then(() => {
        chai.expect(request.get.callCount).to.equal(2);
        chai.expect(db.medic.query.callCount).to.equal(2);
        chai.expect(db.medic.query.args[0]).to.deep.equal([
          'medic/docs_by_replication_key',
          { keys: ['first', 'f1', 's1', 'f2', 's2'], include_docs: true }
        ]);
        chai.expect(purgeDbChanges.callCount).to.equal(2);
        chai.expect(purgeDbChanges.args[0]).to.deep.equal([{
          doc_ids: [
            'purged:first', 'purged:f1', 'purged:f2', 'purged:f1-r1', 'purged:f1-m1',
            'purged:f2-r1', 'purged:f2-r2', 'purged:f2-r3', 'purged:f2-m1'
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
          { _id: 'f1', type: 'clinic' },
          [{ _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' }],
          [{ _id: 'f1-m1', type: 'data_record', sms_message: 'a' }]
        ]);

        chai.expect(purgeFn.args[4]).deep.to.equal([
          { roles: roles['a'] },
          { _id: 'f2', type: 'person' },
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

    it('should correctly ignore reports with needs_signoff', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
          { id: 'first', value: null },
          { id: 'f1', value: 's1' },
          { id: 'f2', value: null },
        ]});

      request.get.onCall(1).resolves({ rows: [
          { id: 'f2', value: null },
        ]});

      sinon.stub(tombstoneUtils, 'isTombstoneId').callsFake(id => id.includes('tombstone'));
      sinon.stub(registrationUtils, 'getPatientId').callsFake(doc => doc.patient_id);

      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });
      const rootContactIds = ['first'];

      sinon.stub(db.medic, 'query');
      db.medic.query.onCall(0).resolves({ rows: [
          { id: 'first', key: 'first', doc: { _id: 'first', type: 'district_hospital' }},
          { id: 'f1', key: 'f1', doc: { _id: 'f1', type: 'clinic' }},
          { id: 'f1-r1', key: 's1', doc: { _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1', needs_signoff: true } },
          { id: 'f1-m1', key: 'f1', doc: { _id: 'f1-m1', type: 'data_record', sms_message: 'a' } },
          { id: 'f2', key: 'f2', doc: { _id: 'f2', type: 'person' }},
          { id: 'f2-r1', key: 'f2', doc: { _id: 'f2-r1', type: 'data_record', form: 'a', patient_id: 'random', needs_signoff: true, contact: { _id: 'f2' } } },
          { id: 'f2-r2', key: 'f2', doc: { _id: 'f2-r2', type: 'data_record', form: 'b', patient_id: 'random', needs_signoff: true, contact: { _id: 'other' } } },
          { id: 'f2-r3', key: 'f2', doc: { _id: 'f2-r3', type: 'data_record', form: 'a', needs_signoff: true, contact: { _id: 'f2' } } },
          { id: 'f2-r4', key: 'f2', doc: { _id: 'f2-r4', type: 'data_record', form: 'a', needs_signoff: true, contact: { _id: 'other' } } },
        ] });
      db.medic.query.onCall(1).resolves({ rows: [] });

      return service.__get__('batchedContactsPurge')(roles, purgeFn, rootContactIds).then(() => {
        chai.expect(request.get.callCount).to.equal(2);
        chai.expect(db.medic.query.callCount).to.equal(2);
        chai.expect(db.medic.query.args[0]).to.deep.equal([
          'medic/docs_by_replication_key',
          { keys: ['first', 'f1', 's1', 'f2'], include_docs: true }
        ]);
        chai.expect(purgeDbChanges.callCount).to.equal(2);
        chai.expect(purgeDbChanges.args[0]).to.deep.equal([{
          doc_ids: [
            'purged:first', 'purged:f1', 'purged:f2', 'purged:f1-r1', 'purged:f1-m1',
            'purged:f2-r1', 'purged:f2-r2', 'purged:f2-r3', 'purged:f2-r4'
          ],
          batch_size: 10,
          seq_interval: 9
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
          { _id: 'f1', type: 'clinic' },
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
          { id: 'first', value: null },
          { id: 'f1', value: 's1' },
          { id: 'f2', value: null },
        ]});

      request.get.onCall(1).resolves({ rows: [
          { id: 'f2', value: null },
        ]});

      sinon.stub(tombstoneUtils, 'isTombstoneId').callsFake(id => id.includes('tombstone'));
      sinon.stub(registrationUtils, 'getPatientId').callsFake(doc => doc.patient_id);

      const rootContactIds = ['first'];

      sinon.stub(db.medic, 'query');
      db.medic.query.onCall(0).resolves({ rows: [
          { id: 'first', key: 'first', doc: { _id: 'first', type: 'district_hospital' }},
          { id: 'f1', key: 'f1', doc: { _id: 'f1', type: 'clinic' }},
          { id: 'f1-r1', key: 's1', doc: { _id: 'f1-r1', type: 'data_record', form: 'a', patient_id: 's1' } },
          { id: 'f1-m1', key: 'f1', doc: { _id: 'f1-m1', type: 'data_record', sms_message: 'a' } },
          { id: 'f2', key: 'f2', doc: { _id: 'f2', type: 'person' }},
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
      purgeFn.withArgs({ roles: roles['a'] }, { _id: 'f1', type: 'clinic' }).returns(['f1-m1']);
      purgeFn.withArgs({ roles: roles['b'] }, { _id: 'f1', type: 'clinic' }).returns(['f1-m1', 'f1-r1']);
      purgeFn.withArgs({ roles: roles['a'] }, { _id: 'f2', type: 'person' }).returns(['f2-m1', 'f2-r1']);
      purgeFn.withArgs({ roles: roles['b'] }, { _id: 'f2', type: 'person' }).returns(['f2-r1']);

      return service.__get__('batchedContactsPurge')(roles, purgeFn, rootContactIds).then(() => {
        chai.expect(dbA.changes.callCount).to.equal(1);
        chai.expect(dbA.changes.args[0]).to.deep.equal([{
          doc_ids: [
            'purged:first', 'purged:f1', 'purged:f2', 'purged:f1-r1', 'purged:f1-m1',
            'purged:f2-r1', 'purged:f2-r2', 'purged:f2-m1', 'purged:f2-r3'
          ],
          batch_size: 10,
          seq_interval: 9
        }]);

        chai.expect(dbB.changes.callCount).to.equal(1);
        chai.expect(dbB.changes.args[0]).to.deep.equal([{
          doc_ids: [
            'purged:first', 'purged:f1', 'purged:f2', 'purged:f1-r1', 'purged:f1-m1',
            'purged:f2-r1', 'purged:f2-r2', 'purged:f2-m1', 'purged:f2-r3'
          ],
          batch_size: 10,
          seq_interval: 9
        }]);

        chai.expect(purgeFn.callCount).to.equal(6);

        chai.expect(dbA.bulkDocs.callCount).to.equal(1);
        chai.expect(dbA.bulkDocs.args[0]).to.deep.equal([{ docs: [
            { _id: 'purged:f1-r1', _deleted: true, _rev: '1' },
            { _id: 'purged:f1-m1' },
            { _id: 'purged:f2-r1' },
            { _id: 'purged:f2-m1' },
            { _id: 'purged:f2-r3', _deleted: true, _rev: '2' }
          ]}]);
        chai.expect(dbB.bulkDocs.callCount).to.equal(1);
        chai.expect(dbB.bulkDocs.args[0]).to.deep.equal([{ docs: [
            { _id: 'purged:f1-r1' },
            { _id: 'purged:f2-r1' },
            { _id: 'purged:f2-m1', _deleted: true, _rev: '2' }
          ]}]);
      });
    });

    it('should not allow random ids from being purged', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
          { id: 'first', value: null },
          { id: 'f1', value: 's1' },
          { id: 'f2', value: null },
        ]});

      request.get.onCall(1).resolves({ rows: [
          { id: 'f2', value: null },
        ]});

      sinon.stub(tombstoneUtils, 'isTombstoneId').callsFake(id => id.includes('tombstone'));
      sinon.stub(registrationUtils, 'getPatientId').callsFake(doc => doc.patient_id);

      const rootContactIds = ['first'];

      sinon.stub(db.medic, 'query');
      db.medic.query.onCall(0).resolves({ rows: [
          { id: 'first', key: 'first', doc: { _id: 'first', type: 'district_hospital' }},
          { id: 'f1', key: 'f1', doc: { _id: 'f1', type: 'clinic' }},
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
      purgeFn.withArgs({ roles: roles['a'] }, { _id: 'f1', type: 'clinic' }).returns(['f1-m1']);
      purgeFn.withArgs({ roles: roles['b'] }, { _id: 'f1', type: 'clinic' }).returns(['f1-m1', 'random']);
      purgeFn.withArgs({ roles: roles['a'] }, { _id: 'f2', type: 'clinic' }).returns(['f2-m1']);
      purgeFn.withArgs({ roles: roles['b'] }, { _id: 'f2', type: 'clinic' }).returns(['f2']);

      return service.__get__('batchedContactsPurge')(roles, purgeFn, rootContactIds).then(() => {
        chai.expect(dbA.changes.callCount).to.equal(1);
        chai.expect(dbA.changes.args[0]).to.deep.equal([{
          doc_ids: ['purged:first', 'purged:f1', 'purged:f2', 'purged:f1-r1', 'purged:f1-m1' ],
          batch_size: 6,
          seq_interval: 5
        }]);

        chai.expect(dbB.changes.callCount).to.equal(1);
        chai.expect(dbB.changes.args[0]).to.deep.equal([{
          doc_ids: ['purged:first', 'purged:f1', 'purged:f2', 'purged:f1-r1', 'purged:f1-m1' ],
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
          { _id: 'f1', type: 'clinic' },
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
        chai.expect(dbB.bulkDocs.args[0]).to.deep.equal([{ docs: [{ _id: 'purged:f2' }, { _id: 'purged:f1-m1' }] }]);
      });
    });

    it('should handle random results from purgefn', () => {
      sinon.stub(request, 'get');
      request.get.onCall(0).resolves({ rows: [
          { id: 'first', value: null },
          { id: 'f1', value: 's1' },
          { id: 'f2', value: null },
        ]});

      request.get.onCall(1).resolves({ rows: [
          { id: 'f2', value: null },
        ]});

      sinon.stub(tombstoneUtils, 'isTombstoneId').callsFake(id => id.includes('tombstone'));
      sinon.stub(registrationUtils, 'getPatientId').callsFake(doc => doc.patient_id);

      const rootContactIds = ['first'];

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

      return service.__get__('batchedContactsPurge')(roles, purgeFn, rootContactIds).then(() => {
        chai.expect(dbA.bulkDocs.callCount).to.equal(1);
        chai.expect(dbA.bulkDocs.args[0]).to.deep.equal([{docs: [{_id: 'purged:f1-m1', _rev: '1', _deleted: true}]}]);
        chai.expect(dbB.bulkDocs.callCount).to.equal(0);
      });
    });

    it('should throw contacts_by_depth errors', () => {
      sinon.stub(request, 'get').rejects({ some: 'err' });
      sinon.stub(db, 'get').resolves({});
      sinon.stub(db.medic, 'query');
      const rootContactIds = ['first', 'second', 'third'];

      return service.__get__('batchedContactsPurge')(roles, purgeFn, rootContactIds).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(err).to.deep.equal({some: 'err'});
        chai.expect(db.medic.query.callCount).to.equal(0);
      });
    });

    it('should throw docs_by_replication_key errors ', () => {
      sinon.stub(request, 'get').resolves({ rows: [{ id: 'first', value: null }]});
      sinon.stub(db.medic, 'query').rejects({ some: 'err' });
      const rootContactIds = ['first', 'second'];

      return service.__get__('batchedContactsPurge')(roles, purgeFn, rootContactIds).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(err).to.deep.equal({some: 'err'});
      });
    });

    it('should throw purgedb changes errors', () => {
      sinon.stub(request, 'get').resolves({ rows: [{ id: 'first', value: null }]});
      sinon.stub(db.medic, 'query').resolves({ rows: [{ id: 'first', doc: { _id: 'first' } }] });
      const purgeDbChanges = sinon.stub().rejects({ some: 'err' });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });
      const rootContactIds = ['first', 'second'];

      return service.__get__('batchedContactsPurge')(roles, purgeFn, rootContactIds).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(err).to.deep.equal({ some: 'err' });
      });
    });

    it('should throw purgefn errors', () => {
      sinon.stub(request, 'get').resolves({ rows: [{ id: 'first', value: null }]});
      sinon.stub(db.medic, 'query').resolves({ rows: [{ id: 'first', doc: { _id: 'first' } }] });
      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub() });
      const rootContactIds = ['first', 'second'];
      purgeFn.throws(new Error('error'));

      return service.__get__('batchedContactsPurge')(roles, purgeFn, rootContactIds).catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(purgeDbChanges.callCount).to.equal(2);
        chai.expect(err.message).to.deep.equal('error');
      });
    });

    it('should throw purgedb _bulk_docs errors', () => {
      sinon.stub(request, 'get').resolves({ rows: [{ id: 'first', value: null }]});
      sinon.stub(db.medic, 'query').resolves({ rows: [{ id: 'first', doc: { _id: 'first' } }] });
      const purgeDbChanges = sinon.stub().resolves({ results: [] });
      sinon.stub(db, 'get').returns({ changes: purgeDbChanges, bulkDocs: sinon.stub().rejects({ some: 'err' }) });
      const rootContactIds = ['first', 'second'];
      purgeFn.returns(['first']);

      return service.__get__('batchedContactsPurge')(roles, purgeFn, rootContactIds).catch(err => {
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
        chai.expect(dbA.bulkDocs.args[0]).to.deep.equal([{ docs: [ { _id: 'purged:r1', _rev: 'r1-rev', _deleted: true }]}]);
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

  describe('purge', () => {
    let getPurgeFn;
    let getRoles;
    let initPurgeDbs;
    let getRootContacts;
    let batchedContactsPurge;
    let batchedUnallocatedPurge;
    let purgeFn;

    beforeEach(() => {
      getPurgeFn = sinon.stub();
      getRoles = sinon.stub();
      initPurgeDbs = sinon.stub();
      getRootContacts = sinon.stub();
      batchedContactsPurge = sinon.stub();
      batchedUnallocatedPurge = sinon.stub();
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

    it('should initialize dbs, getRootContacts, run per contact and unallocated purges', () => {
      const roles = { 'a': [1, 2, 3], 'b': [1, 2, 4] };
      const rootContacts = ['1st', '2nd', '3rd'];
      getPurgeFn.returns(purgeFn);
      getRoles.resolves(roles);
      initPurgeDbs.resolves();
      getRootContacts.resolves(rootContacts);
      batchedContactsPurge.resolves();
      batchedUnallocatedPurge.resolves();
      sinon.stub(db.sentinel, 'put').resolves();

      service.__set__('getPurgeFn', getPurgeFn);
      service.__set__('getRoles', getRoles);
      service.__set__('initPurgeDbs', initPurgeDbs);
      service.__set__('getRootContacts', getRootContacts);
      service.__set__('batchedContactsPurge', batchedContactsPurge);
      service.__set__('batchedUnallocatedPurge', batchedUnallocatedPurge);

      return service.__get__('purge')().then(() => {
        chai.expect(getPurgeFn.callCount).to.equal(1);
        chai.expect(getRoles.callCount).to.equal(1);
        chai.expect(initPurgeDbs.callCount).to.equal(1);
        chai.expect(getRootContacts.callCount).to.equal(1);
        chai.expect(batchedContactsPurge.callCount).to.equal(1);
        chai.expect(batchedContactsPurge.args[0]).to.deep.equal([ roles, purgeFn, rootContacts ]);
        chai.expect(batchedUnallocatedPurge.callCount).to.equal(1);
        chai.expect(batchedUnallocatedPurge.args[0]).to.deep.equal([ roles, purgeFn ]);
        chai.expect(db.sentinel.put.callCount).to.equal(1);
      });
    });

    it('should catch any errors thrown when getting roles', () => {
      getPurgeFn.returns(purgeFn);
      getRoles.rejects({});

      service.__set__('getPurgeFn', getPurgeFn);
      service.__set__('getRoles', getRoles);
      service.__set__('initPurgeDbs', initPurgeDbs);
      service.__set__('getRootContacts', getRootContacts);
      service.__set__('batchedContactsPurge', batchedContactsPurge);
      service.__set__('batchedUnallocatedPurge', batchedUnallocatedPurge);

      return service.__get__('purge')().then(() => {
        chai.expect(getPurgeFn.callCount).to.equal(1);
        chai.expect(getRoles.callCount).to.equal(1);
        chai.expect(initPurgeDbs.callCount).to.equal(0);
        chai.expect(getRootContacts.callCount).to.equal(0);
        chai.expect(batchedContactsPurge.callCount).to.equal(0);
        chai.expect(batchedUnallocatedPurge.callCount).to.equal(0);
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
      service.__set__('getRootContacts', getRootContacts);
      service.__set__('batchedContactsPurge', batchedContactsPurge);
      service.__set__('batchedUnallocatedPurge', batchedUnallocatedPurge);

      return service.__get__('purge')().then(() => {
        chai.expect(getPurgeFn.callCount).to.equal(1);
        chai.expect(getRoles.callCount).to.equal(1);
        chai.expect(initPurgeDbs.callCount).to.equal(1);
        chai.expect(getRootContacts.callCount).to.equal(0);
        chai.expect(batchedContactsPurge.callCount).to.equal(0);
        chai.expect(batchedUnallocatedPurge.callCount).to.equal(0);
      });
    });

    it('should catch any errors thrown when getting root contacts', () => {
      const roles = { 'a': [1, 2, 3], 'b': [1, 2, 4] };
      getPurgeFn.returns(purgeFn);
      getRoles.resolves(roles);
      initPurgeDbs.resolves();
      getRootContacts.rejects({});

      service.__set__('getPurgeFn', getPurgeFn);
      service.__set__('getRoles', getRoles);
      service.__set__('initPurgeDbs', initPurgeDbs);
      service.__set__('getRootContacts', getRootContacts);
      service.__set__('batchedContactsPurge', batchedContactsPurge);
      service.__set__('batchedUnallocatedPurge', batchedUnallocatedPurge);

      return service.__get__('purge')().then(() => {
        chai.expect(getPurgeFn.callCount).to.equal(1);
        chai.expect(getRoles.callCount).to.equal(1);
        chai.expect(initPurgeDbs.callCount).to.equal(1);
        chai.expect(getRootContacts.callCount).to.equal(1);
        chai.expect(batchedContactsPurge.callCount).to.equal(0);
        chai.expect(batchedUnallocatedPurge.callCount).to.equal(0);
      });
    });

    it('should catch any errors thrown when doing batched contacts purge', () => {
      const roles = { 'a': [1, 2, 3], 'b': [1, 2, 4] };
      getPurgeFn.returns(purgeFn);
      getRoles.resolves(roles);
      initPurgeDbs.resolves();
      getRootContacts.resolves(['a', 'b', 'c']);
      batchedContactsPurge.rejects({});

      service.__set__('getPurgeFn', getPurgeFn);
      service.__set__('getRoles', getRoles);
      service.__set__('initPurgeDbs', initPurgeDbs);
      service.__set__('getRootContacts', getRootContacts);
      service.__set__('batchedContactsPurge', batchedContactsPurge);
      service.__set__('batchedUnallocatedPurge', batchedUnallocatedPurge);

      return service.__get__('purge')().then(() => {
        chai.expect(getPurgeFn.callCount).to.equal(1);
        chai.expect(getRoles.callCount).to.equal(1);
        chai.expect(initPurgeDbs.callCount).to.equal(1);
        chai.expect(getRootContacts.callCount).to.equal(1);
        chai.expect(batchedContactsPurge.callCount).to.equal(1);
        chai.expect(batchedContactsPurge.args[0]).to.deep.equal([ roles, purgeFn, ['a', 'b', 'c'] ]);
        chai.expect(batchedUnallocatedPurge.callCount).to.equal(0);
      });
    });

    it('should catch any errors thrown when doing batched unallocated purge', () => {
      const roles = { 'a': [1, 2, 3], 'b': [1, 2, 4] };
      getPurgeFn.returns(purgeFn);
      getRoles.resolves(roles);
      initPurgeDbs.resolves();
      getRootContacts.resolves(['a', 'b', 'c']);
      batchedContactsPurge.resolves();
      batchedUnallocatedPurge.rejects({});

      service.__set__('getPurgeFn', getPurgeFn);
      service.__set__('getRoles', getRoles);
      service.__set__('initPurgeDbs', initPurgeDbs);
      service.__set__('getRootContacts', getRootContacts);
      service.__set__('batchedContactsPurge', batchedContactsPurge);
      service.__set__('batchedUnallocatedPurge', batchedUnallocatedPurge);

      return service.__get__('purge')().then(() => {
        chai.expect(getPurgeFn.callCount).to.equal(1);
        chai.expect(getRoles.callCount).to.equal(1);
        chai.expect(initPurgeDbs.callCount).to.equal(1);
        chai.expect(getRootContacts.callCount).to.equal(1);
        chai.expect(batchedContactsPurge.callCount).to.equal(1);
        chai.expect(batchedContactsPurge.args[0]).to.deep.equal([ roles, purgeFn, ['a', 'b', 'c'] ]);
        chai.expect(batchedUnallocatedPurge.callCount).to.equal(1);
        chai.expect(batchedUnallocatedPurge.args[0]).to.deep.equal([ roles, purgeFn ]);
      });
    });
  });
});
