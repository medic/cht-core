const sinon = require('sinon'),
      chai = require('chai'),
      db = require('../../../src/db-nano'),
      migration = require('../../../src/migrations/separate-audit-db.js'),
      ERR_404 = {statusCode: 404};

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

let originalDbSettings;

describe('separate-audit-db migration', () => {

  beforeEach(() => {
    originalDbSettings = db.settings;
  });

  afterEach(() => {
    sinon.restore();
    db.settings = originalDbSettings;
  });

  it('creates db, creates view and migrates audit documents', done => {
    db.settings = {
      db: 'medic',
      auditDb: 'medic-audit'
    };

    const wrappedDbDbGet = sinon.stub(db.db, 'get').withArgs('medic-audit').callsArgWith(1, ERR_404);
    const wrappedDbDbCreate = sinon.stub(db.db, 'create').withArgs('medic-audit').callsArg(1);

    const auditDb = {
      head: () => {},
      insert: () => {}
    };

    const wrappedAuditDbHead = sinon.stub(auditDb, 'head').withArgs('_design/medic').callsArgWith(1, ERR_404);
    const wrappedAuditDbInsert = sinon.stub(auditDb, 'insert').callsArg(2);
    sinon.stub(db, 'use').withArgs('medic-audit').returns(auditDb);

    const wrappedMedicView = sinon.stub(db.medic, 'view');
    wrappedMedicView.onFirstCall().callsArgWith(3, null, FIRST_VIEW_BATCH);
    wrappedMedicView.onSecondCall().callsArgWith(3, null, LAST_VIEW_BATCH);

    const wrappedDbReplicate = sinon.stub(db.db, 'replicate').callsArg(3);
    const wrappedMedicFetchRevs = sinon.stub(db.medic, 'fetchRevs').callsArgWith(1, null, VIEW_REVS);

    const wrappedMedicBulk = sinon.stub(db.medic, 'bulk').callsArgWith(1, null, [1, 2, 3]);

    migration.run(err => {
      chai.expect(wrappedDbDbGet.callCount).to.equal(1);
      chai.expect(wrappedDbDbCreate.callCount).to.equal(1);
      chai.expect(wrappedAuditDbHead.callCount).to.equal(1);
      chai.expect(wrappedAuditDbInsert.callCount).to.equal(1);

      chai.expect(wrappedMedicView.callCount).to.equal(2);
      chai.expect(wrappedDbReplicate.callCount).to.equal(1);
      chai.expect(wrappedMedicFetchRevs.callCount).to.equal(1);

      chai.expect(wrappedMedicBulk.callCount).to.equal(1);

      done(err);
    });
  });
});
