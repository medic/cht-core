const chai = require('chai');
const sinon = require('sinon');

const service = require('../../../src/services/server-side-purge');
const db = require('../../../src/db');
const environment = require('../../../src/environment');
//const cache = require('../../../src/cache');
const registrationUtils = require('@medic/registration-utils');
const viewMapUtils = require('@medic/view-map-utils');
const tombstoneUtils = require('@medic/tombstone-utils');
const config = require('../../../src/config');
const auth = require('../../../src/auth');
const request = require('request-promise-native');

describe('Server Side Purge service', () => {
  beforeEach(() => {

  });
  afterEach(() => sinon.restore());

  describe('purging', () => {
    describe('getPurgeFn', () => {
      beforeEach(() => {
        sinon.stub(config, 'get');
      });

      it('should return undefined when purge is not configured', () => {
        config.get.returns(undefined);
        chai.expect(service._getPurgeFn()).to.equal(undefined);
        chai.expect(config.get.callCount).to.equal(1);
        chai.expect(config.get.args[0][0]).to.equal('purge');
      });

      it('should return undefined when purge fn is not configured', () => {
        config.get.returns({});
        chai.expect(service._getPurgeFn()).to.equal(undefined);
        chai.expect(config.get.callCount).to.equal(1);
        chai.expect(config.get.args[0][0]).to.equal('purge');
      });

      it('should return undefined when purge fn cannot be eval-ed', () => {
        config.get.returns({ fn: 'whatever' });
        chai.expect(service._getPurgeFn()).to.equal(undefined);
        chai.expect(config.get.callCount).to.equal(1);
        chai.expect(config.get.args[0][0]).to.equal('purge');
      });

      it('should return eval-ed when purge fn is correct', () => {
        const purgeFn = function(n) { return n * n; };
        config.get.returns({ fn: purgeFn.toString() });
        const result = service._getPurgeFn();
        chai.expect(config.get.callCount).to.equal(1);
        chai.expect(config.get.args[0][0]).to.equal('purge');
        chai.expect(result(4)).to.equal(16);
        chai.expect(result(3)).to.equal(9);
      });
    });

    describe('getRoleHash', () => {
      it('should return unique hash for roles array', () => {
        const hash = service._getRoleHash([1, 2, 3]);
        const hash2 = service._getRoleHash([2, 3, 4]);
        const hash3 = service._getRoleHash([4, 2, 1, 3]);
        chai.expect(hash.length).to.equal(32);
        chai.expect(hash2.length).to.equal(32);
        chai.expect(hash3.length).to.equal(32);

        chai.expect(hash).not.to.equal(hash2);
        chai.expect(hash).not.to.equal(hash3);

        chai.expect(service._getRoleHash([3, 2, 1])).to.equal(hash);
        chai.expect(service._getRoleHash([1, 3, 2, 1, 1])).to.equal(hash);
        chai.expect(service._getRoleHash([3, 3, 4, 4, 2])).to.equal(hash2);
        chai.expect(service._getRoleHash([3, 2, 1, 4])).to.equal(hash3);
        chai.expect(service._getRoleHash([1, 2])).not.to.equal(hash);
      });
    });

    describe('getRoles', () => {
      beforeEach(() => {
        sinon.stub(db.users, 'allDocs');
      });

      it('should throw allDocs errors', () => {
        db.users.allDocs.rejects({ some: 'err' });
        return service._getRoles().catch(err => {
          chai.expect(err).to.deep.equal({ some: 'err' });
          chai.expect(db.users.allDocs.callCount).to.equal(1);
          chai.expect(db.users.allDocs.args[0]).to.deep.equal([{ include_docs: true }]);
        });
      });

      it('should return all unique role groups', () => {
        sinon.stub(auth, 'isOffline').returns(true);
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

        return service._getRoles().then(roles => {
          chai.expect(Object.keys(roles).length).to.equal(4);
          const hash1 = service._getRoleHash(['a', 'b']);
          const hash2 = service._getRoleHash(['b', 'c']);
          const hash3 = service._getRoleHash(['a', 'c']);
          const hash4 = service._getRoleHash(['a', 'b', 'c']);
          chai.expect(roles[hash1]).to.deep.equal(['a', 'b']);
          chai.expect(roles[hash2]).to.deep.equal(['b', 'c']);
          chai.expect(roles[hash3]).to.deep.equal(['a', 'c']);
          chai.expect(roles[hash4]).to.deep.equal(['a', 'b', 'c']);
        });
      });
    });

    describe('initPurgeDbs', () => {
      let orgEnv = {};
      beforeEach(() => {
        sinon.stub(db, 'get');
        orgEnv = {};
        Object.assign(orgEnv, environment);
      });

      afterEach(() => {
        Object.assign(environment, orgEnv);
      });

      it('should initialize purge dbs for provided roles', () => {
        const purgedb = { put: sinon.stub().resolves() };
        db.get.returns(purgedb);
        const roles = {
          'hash1': ['a'],
          'hash2': ['b'],
          'hash3': ['c'],
        };
        environment.db = 'dummy';

        return service._initPurgeDbs(roles).then(() => {
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

      it('should catch info doc save exceptions', () => {
        const purgedb = { put: sinon.stub().resolves() };
        db.get.returns(purgedb);
        const roles = {
          'hash': ['1'],
          'hash-': ['2', '3'],
          'hash--': ['4', '5', '6'],
        };
        environment.db = 'not-medic';

        return service._initPurgeDbs(roles).then(() => {
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
        environment.db = 'not-medic';

        return service._initPurgeDbs(roles).then(() => {
          chai.expect(db.get.callCount).to.equal(1);
          chai.expect(db.get.args[0]).to.deep.equal(['not-medic-purged-role-hash']);
          chai.expect(purgedb.put.callCount).to.equal(1);
          chai.expect(purgedb.put.calledWith({ _id: 'local/info', roles: ['1'] })).to.equal(true);
        });
      });
    });

    describe('getRootContacts', () => {
      it('should throw db errors', () => {
        sinon.stub(db.medic, 'query').rejects({ err: true });

        return service._getRootContacts().catch(err => {
          chai.expect(err).to.deep.equal({ err: true });
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(db.medic.query.args[0]).to.deep.equal(['medic-client/doc_by_type', { key: ['district_hospital'] }]);
        });
      });

      it('should return query results', () => {
        sinon.stub(db.medic, 'query').resolves({ rows: [{ id: 'root1' }, { id: 'root2' }, { id: 'root3' }] });
        return service._getRootContacts().then(ids => {
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(db.medic.query.args[0]).to.deep.equal(['medic-client/doc_by_type', { key: ['district_hospital'] }]);
          chai.expect(ids).to.deep.equal(['root1', 'root2', 'root3']);
        });
      });
    });

    describe('updatePurgedDocs', () => {
      
    });

    describe('batchedContactsPurge', () => {
      let orgEnv = {};
      let roles;
      let purgeFn;

      beforeEach(() => {
        roles = { 'a': [1, 2, 3], 'b': [4, 5, 6] };
        purgeFn = sinon.stub();
        orgEnv = {};
        Object.assign(orgEnv, environment);
        environment.couchUrl = 'http://a:p@localhost:6500/medic';
        service._reset();
      });

      afterEach(() => {
        Object.assign(environment, orgEnv);
      });

      it('should return immediately if no root contact ids are provided', () => {
        sinon.stub(request, 'get');

        return service._batchedContactsPurge(roles, purgeFn, []).then(() => {
          chai.expect(request.get.callCount).to.equal(0);
        });
      });

      it('should grab contacts_by_depth selecting the root contacts in sequence', () => {
        sinon.stub(request, 'get').resolves({ rows: [] });
        sinon.stub(db, 'get').resolves({});
        sinon.stub(db.medic, 'query').resolves({ rows: [] });
        const rootContactIds = ['first', 'second', 'third'];

        return service._batchedContactsPurge(roles, purgeFn, rootContactIds).then(() => {
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

        return service._batchedContactsPurge(roles, purgeFn, rootContactIds).then(() => {
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

        return service._batchedContactsPurge(roles, purgeFn, rootContactIds).then(() => {
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

        return service._batchedContactsPurge(roles, purgeFn, rootContactIds).then(() => {
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

        return service._batchedContactsPurge(roles, purgeFn, rootContactIds).then(() => {
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

        return service._batchedContactsPurge(roles, purgeFn, rootContactIds).then(() => {
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
            { id: 'f2-r1', key: 'f2', doc: { _id: 'f2-r1', type: 'data_record', form: 'a', patient_id: 'random', needs_signoff: true, submitter: 'f2' } },
            { id: 'f2-r2', key: 'f2', doc: { _id: 'f2-r2', type: 'data_record', form: 'b', patient_id: 'random', needs_signoff: true, submitter: 'other' } },
            { id: 'f2-r3', key: 'f2', doc: { _id: 'f2-r3', type: 'data_record', form: 'a', needs_signoff: true, submitter: 'f2' } },
            { id: 'f2-r4', key: 'f2', doc: { _id: 'f2-r4', type: 'data_record', form: 'a', needs_signoff: true, submitter: 'other' } },
          ] });
        db.medic.query.onCall(1).resolves({ rows: [] });

        const docsByReplicationKey = sinon.stub().callsFake((doc) => ([[ doc.patient_id || doc.submitter ]]));
        sinon.stub(viewMapUtils, 'getViewMapFn').returns(docsByReplicationKey);

        return service._batchedContactsPurge(roles, purgeFn, rootContactIds).then(() => {
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
            [{ _id: 'f2-r3', type: 'data_record', form: 'a', needs_signoff: true, submitter: 'f2' }],
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

        const purgeDbChangesA = sinon.stub().resolves({
          results: [
            { id: 'purged:f1-r1', changes: [{ rev: '1' }] },
            { id: 'purged:f2-r2', changes: [{ rev: '2' }], deleted: true },
            { id: 'purged:f2-r3', changes: [{ rev: '2' }]}
          ]
        });
        const purgeDbBulkDocsA = sinon.stub().resolves([]);
        const purgeDbChangesB = sinon.stub().resolves({
          results: [
            { id: 'purged:f1-m1', changes: [{ rev: '1' }] },
            { id: 'purged:f2-r1', changes: [{ rev: '2' }], deleted: true },
            { id: 'purged:f2-m1', changes: [{ rev: '2' }]}
          ]
        });
        const purgeDbBulkDocsB = sinon.stub().resolves([]);
        sinon.stub(db, 'get')
          .onCall(0).returns({ changes: purgeDbChangesA, bulkDocs: purgeDbBulkDocsA })
          .onCall(1).returns({ changes: purgeDbChangesB, bulkDocs: purgeDbBulkDocsB });

        purgeFn.withArgs({ roles: roles['a'] }, { _id: 'first', type: 'district_hospital' }).returns([]);
        purgeFn.withArgs({ roles: roles['b'] }, { _id: 'first', type: 'district_hospital' }).returns([]);
        purgeFn.withArgs({ roles: roles['a'] }, { _id: 'f1', type: 'clinic' }).returns(['f1-m1']);
        purgeFn.withArgs({ roles: roles['b'] }, { _id: 'f1', type: 'clinic' }).returns(['f1-m1', 'f1-r1']);
        purgeFn.withArgs({ roles: roles['a'] }, { _id: 'f2', type: 'person' }).returns(['f2-m1', 'f2-r1']);
        purgeFn.withArgs({ roles: roles['b'] }, { _id: 'f2', type: 'person' }).returns(['f2-r1']);

        return service._batchedContactsPurge(roles, purgeFn, rootContactIds).then(() => {
          chai.expect(purgeDbChangesA.callCount).to.equal(1);
          chai.expect(purgeDbChangesA.args[0]).to.deep.equal([{
            doc_ids: [
              'purged:first', 'purged:f1', 'purged:f2', 'purged:f1-r1', 'purged:f1-m1',
              'purged:f2-r1', 'purged:f2-r2', 'purged:f2-m1', 'purged:f2-r3'
            ],
            batch_size: 10,
            seq_interval: 9
          }]);

          chai.expect(purgeDbChangesB.callCount).to.equal(1);
          chai.expect(purgeDbChangesB.args[0]).to.deep.equal([{
            doc_ids: [
              'purged:first', 'purged:f1', 'purged:f2', 'purged:f1-r1', 'purged:f1-m1',
              'purged:f2-r1', 'purged:f2-r2', 'purged:f2-m1', 'purged:f2-r3'
            ],
            batch_size: 10,
            seq_interval: 9
          }]);

          chai.expect(purgeFn.callCount).to.equal(6);

          chai.expect(purgeDbBulkDocsA.callCount).to.equal(1);
          chai.expect(purgeDbBulkDocsA.args[0]).to.deep.equal([{ docs: [
            { _id: 'purged:f1-r1', _deleted: true, _rev: '1' },
            { _id: 'purged:f1-m1' },
            { _id: 'purged:f2-r1' },
            { _id: 'purged:f2-m1' },
            { _id: 'purged:f2-r3', _deleted: true, _rev: '2' }
          ]}]);
          chai.expect(purgeDbBulkDocsB.callCount).to.equal(1);
          chai.expect(purgeDbBulkDocsB.args[0]).to.deep.equal([{ docs: [
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

        const purgeDbChangesA = sinon.stub().resolves({ results: [] });
        const purgeDbBulkDocsA = sinon.stub().resolves([]);
        const purgeDbChangesB = sinon.stub().resolves({ results: []});
        const purgeDbBulkDocsB = sinon.stub().resolves([]);
        sinon.stub(db, 'get')
          .onCall(0).returns({ changes: purgeDbChangesA, bulkDocs: purgeDbBulkDocsA })
          .onCall(1).returns({ changes: purgeDbChangesB, bulkDocs: purgeDbBulkDocsB });

        purgeFn.withArgs({ roles: roles['a'] }, { _id: 'first', type: 'district_hospital' }).returns(['a', 'b']);
        purgeFn.withArgs({ roles: roles['b'] }, { _id: 'first', type: 'district_hospital' }).returns(['c', 'd']);
        purgeFn.withArgs({ roles: roles['a'] }, { _id: 'f1', type: 'clinic' }).returns(['f1-m1']);
        purgeFn.withArgs({ roles: roles['b'] }, { _id: 'f1', type: 'clinic' }).returns(['f1-m1', 'random']);
        purgeFn.withArgs({ roles: roles['a'] }, { _id: 'f2', type: 'clinic' }).returns(['f2-m1']);
        purgeFn.withArgs({ roles: roles['b'] }, { _id: 'f2', type: 'clinic' }).returns(['f2']);

        return service._batchedContactsPurge(roles, purgeFn, rootContactIds).then(() => {
          chai.expect(purgeDbChangesA.callCount).to.equal(1);
          chai.expect(purgeDbChangesA.args[0]).to.deep.equal([{
            doc_ids: ['purged:first', 'purged:f1', 'purged:f2', 'purged:f1-r1', 'purged:f1-m1' ],
            batch_size: 6,
            seq_interval: 5
          }]);

          chai.expect(purgeDbChangesB.callCount).to.equal(1);
          chai.expect(purgeDbChangesB.args[0]).to.deep.equal([{
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

          chai.expect(purgeDbBulkDocsA.callCount).to.equal(1);
          chai.expect(purgeDbBulkDocsA.args[0]).to.deep.equal([{ docs: [{ _id: 'purged:f1-m1' }] }]);
          chai.expect(purgeDbBulkDocsB.callCount).to.equal(1);
          chai.expect(purgeDbBulkDocsB.args[0]).to.deep.equal([{ docs: [{ _id: 'purged:f2' }, { _id: 'purged:f1-m1' }] }]);
        });
      });
    });
  });
});
