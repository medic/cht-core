const chai = require('chai');
const sinon = require('sinon');

const service = require('../../../src/services/server-side-purge');
const db = require('../../../src/db');
const environment = require('../../../src/environment');
//const cache = require('../../../src/cache');
//const registrationUtils = require('@medic/registration-utils');
//const viewMapUtils = require('@medic/view-map-utils');
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

    describe('batchedContactsPurge', () => {
      let roles;
      let purgeFn;

      beforeEach(() => {
        roles = { 'a': [1, 2, 3], 'b': [4, 5, 6] };
        purgeFn = sinon.stub();
      });

      it('should return immediately if no root contact ids are provided', () => {
        sinon.stub(request, 'get');

        return service._batchedContactsPurge(roles, purgeFn, []).then(() => {
          chai.expect(request.get.callCount).to.equal(0);
        });
      });


    });
  });
});
