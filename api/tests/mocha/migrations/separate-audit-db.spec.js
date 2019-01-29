const sinon = require('sinon'),
      chai = require('chai'),
      db = require('../../../src/db'),
      environment = require('../../../src/environment'),
      migration = require('../../../src/migrations/separate-audit-db.js'),
      ERR_404 = { status: 404 };

const PouchDB = require('pouchdb-core');

const FIRST_VIEW_BATCH = {
  rows: [
    {id: 'abc123'},
    {id: 'abc456'},
  ]
};
const VIEW_REVS = [{
  rows: [
    {id: 'abc123', value: {rev: '1-123'}},
    {id: 'abc456', value: {rev: '1-456'}},
  ]
}];
const LAST_VIEW_BATCH = {
  rows: []
};

let originalDb;

describe('separate-audit-db migration', () => {

  beforeEach(() => {
    originalDb = environment.db;
  });

  afterEach(() => {
    sinon.restore();
    environment.db = originalDb;
  });

  it('creates db, creates view and migrates audit documents', () => {
    environment.db = 'medic';

    const auditDb = {
      get: () => {},
      put: () => {}
    };

    const wrappedDbDbGet = sinon.stub(db, 'exists').withArgs('medic-audit').resolves(false);
    const wrappedDbDbCreate = sinon.stub(db, 'get').withArgs('medic-audit').resolves(auditDb);

    const wrappedAuditDbGet = sinon.stub(auditDb, 'get').withArgs('_design/medic').returns(Promise.reject(ERR_404));
    const wrappedAuditDbPut = sinon.stub(auditDb, 'put').resolves(2);

    const wrappedMedicView = sinon.stub(db.medic, 'query');
    wrappedMedicView.onFirstCall().resolves(FIRST_VIEW_BATCH);
    wrappedMedicView.onSecondCall().resolves(LAST_VIEW_BATCH);

    const replicateStub = { on: sinon.stub() };

    const wrappedDbReplicate = sinon.stub(PouchDB, 'replicate').returns(replicateStub);
    const wrappedMedicFetchRevs = sinon.stub(db.medic, 'fetchRevs').callsArgWith(1, null, VIEW_REVS);

    const wrappedMedicBulk = sinon.stub(db.medic, 'bulk').callsArgWith(1, null, [1, 2, 3]);

    const result = migration.run().then(() => {
      chai.expect(wrappedDbDbGet.callCount).to.equal(1);
      chai.expect(wrappedDbDbCreate.callCount).to.equal(1);
      chai.expect(wrappedAuditDbGet.callCount).to.equal(1);
      chai.expect(wrappedAuditDbPut.callCount).to.equal(1);

      chai.expect(wrappedMedicView.callCount).to.equal(2);
      chai.expect(wrappedDbReplicate.callCount).to.equal(1);
      chai.expect(wrappedMedicFetchRevs.callCount).to.equal(1);

      chai.expect(wrappedMedicBulk.callCount).to.equal(1);
    });

    const replicationCompleteListener = replicateStub.on.args[0][1];
    replicationCompleteListener();

    return result;
  });
});
