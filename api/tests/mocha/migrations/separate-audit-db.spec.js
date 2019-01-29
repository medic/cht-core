const sinon = require('sinon'),
      chai = require('chai'),
      db = require('../../../src/db'),
      environment = require('../../../src/environment'),
      migration = require('../../../src/migrations/separate-audit-db.js'),
      ERR_404 = { status: 404 };

const FIRST_VIEW_BATCH = {
  rows: [
    {id: 'abc123'},
    {id: 'abc456'},
  ]
};
const VIEW_REVS = {
  rows: [
    {id: 'abc123', value: {rev: '1-123'}},
    {id: 'abc456', value: {rev: '1-456'}},
  ]
};
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

    const wrappedDbDbCreate = sinon.stub(db, 'get').returns(auditDb);

    const wrappedAuditDbGet = sinon.stub(auditDb, 'get').callsArgWith(1, ERR_404);
    const wrappedAuditDbPut = sinon.stub(auditDb, 'put').callsArg(1);

    const wrappedMedicView = sinon.stub(db.medic, 'query');
    wrappedMedicView.onFirstCall().callsArgWith(2, null, FIRST_VIEW_BATCH);
    wrappedMedicView.onSecondCall().callsArgWith(2, null, LAST_VIEW_BATCH);

    let replicationCompleteListener;
    const recursiveOn = sinon.stub();
    recursiveOn.returns(recursiveOn);
    db.medic.replicate = { to: sinon.stub() };
    db.medic.replicate.to.returns({
      on: (event, callback) => {
        replicationCompleteListener = callback;
        return {
          on: () => ({
            on: () => {}
          })
        };
      }
    });

    const wrappedMedicAllDocs = sinon.stub(db.medic, 'allDocs').resolves(VIEW_REVS);
    const wrappedMedicBulk = sinon.stub(db.medic, 'bulkDocs').resolves([1, 2, 3]);

    const result = migration.run().then(() => {
      chai.expect(wrappedDbDbCreate.callCount).to.equal(1);
      chai.expect(wrappedAuditDbGet.callCount).to.equal(1);
      chai.expect(wrappedAuditDbPut.callCount).to.equal(1);

      chai.expect(wrappedMedicView.callCount).to.equal(2);
      chai.expect(wrappedMedicAllDocs.callCount).to.equal(1);

      chai.expect(wrappedMedicBulk.callCount).to.equal(1);
    });

    setTimeout(() => {
      replicationCompleteListener();
    });

    return result;
  });
});
