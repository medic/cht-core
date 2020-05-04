const sinon = require('sinon');
const chai = require('chai');
const db = require('../../../src/db');
const migration = require('../../../src/migrations/add-meta-validate-doc-update');
const usersDb = require('../../../src/services/user-db');

describe('add-meta-validate-doc-update', () => {
  beforeEach(() => {
    sinon.stub(db, 'allDbs');
    sinon.stub(db, 'get');
    sinon.stub(usersDb, 'isDbName');
    sinon.stub(usersDb, 'validateDocUpdate');
  });

  afterEach(() => sinon.restore());

  it('should have correct name and date', () => {
    chai.expect(migration.name).to.equal('add-meta-validate-doc-update');
    chai.expect(migration.created).to.deep.equal(new Date(2020, 5, 4));
  });

  it('should handle no meta databases', () => {
    db.allDbs.resolves(['a', 'b', 'c']);
    return migration.run().then(() => {
      chai.expect(db.allDbs.callCount).to.equal(1);
      chai.expect(db.get.callCount).to.equal(0);
    });
  });

  it('should throw request errors', () => {
    db.allDbs.rejects({ some: 'err' });
    return migration
      .run()
      .then(() => chai.assert.fail('Should have trown'))
      .catch(err => {
        chai.expect(err).to.deep.equal({ some: 'err' });
        chai.expect(db.get.callCount).to.equal(0);
      });
  });

  it('should migrate every matching database', () => {
    const dbNames = [
      'medic',
      'medic-sentinel',
      'medic-users-meta',
      'medic-user-alpha-meta',
      'medic-user-beta-meta',
      'medic-user-gamma-meta',
    ];

    const validateDocUpdate = function(){ return 'validate_doc_update'; };
    const ddoc = { _id: '_design/medic-user', views: 'whatever' };

    const getMetaDb = () => ({
      get: sinon.stub().resolves(ddoc),
      put: sinon.stub().resolves(),
    });

    usersDb.isDbName.withArgs(sinon.match(/^medic-user-.*-meta$/)).returns(true);
    usersDb.validateDocUpdate.returns(validateDocUpdate);
    db.allDbs.resolves(dbNames);
    const metaAlpha = getMetaDb();
    const metaBeta = getMetaDb();
    const metaGamma = getMetaDb();

    db.get.withArgs('medic-user-alpha-meta').returns(metaAlpha);
    db.get.withArgs('medic-user-beta-meta').returns(metaBeta);
    db.get.withArgs('medic-user-gamma-meta').returns(metaGamma);

    return migration.run().then(() => {
      chai.expect(usersDb.isDbName.callCount).to.equal(6);
      chai.expect(usersDb.isDbName.args).to.deep.equal([ ...dbNames.map(name => [name]) ]);
      chai.expect(db.get.callCount).to.equal(3);
      chai.expect(db.get.args).to.deep.equal([
        ['medic-user-alpha-meta'], ['medic-user-beta-meta'], ['medic-user-gamma-meta']
      ]);

      chai.expect(metaAlpha.get.callCount).to.equal(1);
      chai.expect(metaAlpha.get.args[0]).to.deep.equal(['_design/medic-user']);
      chai.expect(metaAlpha.put.callCount).to.equal(1);
      chai.expect(metaAlpha.put.args[0]).to.deep.equal([Object.assign(
        { validate_doc_update: validateDocUpdate.toString() },
        ddoc
      )]);

      chai.expect(metaBeta.get.callCount).to.equal(1);
      chai.expect(metaBeta.get.args[0]).to.deep.equal(['_design/medic-user']);
      chai.expect(metaBeta.put.callCount).to.equal(1);
      chai.expect(metaBeta.put.args[0]).to.deep.equal([Object.assign(
        { validate_doc_update: validateDocUpdate.toString() },
        ddoc
      )]);

      chai.expect(metaGamma.get.callCount).to.equal(1);
      chai.expect(metaGamma.get.args[0]).to.deep.equal(['_design/medic-user']);
      chai.expect(metaGamma.put.callCount).to.equal(1);
      chai.expect(metaGamma.put.args[0]).to.deep.equal([Object.assign(
        { validate_doc_update: validateDocUpdate.toString() },
        ddoc
      )]);
    });
  });

  it('should handle missing ddoc', () => {
    const dbNames = [
      'medic',
      'medic-sentinel',
      'medic-users-meta',
      'medic-user-chw1-meta',
      'medic-user-chw2-meta',
    ];

    const validateDocUpdate = function(){ return 'validate_doc_update'; };

    usersDb.isDbName.withArgs('medic-user-chw1-meta').returns(true);
    usersDb.isDbName.withArgs('medic-user-chw2-meta').returns(true);
    usersDb.validateDocUpdate.returns(validateDocUpdate);
    db.allDbs.resolves(dbNames);
    const metaChw1Db = { get: sinon.stub().rejects({ status: 404 }) };
    const metaChw2Db = { get: sinon.stub().resolves({}), put: sinon.stub().resolves() };
    db.get.withArgs('medic-user-chw1-meta').returns(metaChw1Db);
    db.get.withArgs('medic-user-chw2-meta').returns(metaChw2Db);

    return migration.run().then(() => {
      chai.expect(usersDb.isDbName.callCount).to.equal(5);
      chai.expect(usersDb.isDbName.args).to.deep.equal([ ...dbNames.map(name => [name]) ]);
      chai.expect(db.get.callCount).to.equal(2);
      chai.expect(db.get.args).to.deep.equal([ ['medic-user-chw1-meta'], ['medic-user-chw2-meta'] ]);

      chai.expect(metaChw1Db.get.callCount).to.equal(1);
      chai.expect(metaChw1Db.get.args[0]).to.deep.equal(['_design/medic-user']);

      chai.expect(metaChw2Db.get.callCount).to.equal(1);
      chai.expect(metaChw2Db.get.args[0]).to.deep.equal(['_design/medic-user']);
      chai.expect(metaChw2Db.put.callCount).to.equal(1);
    });
  });
});
