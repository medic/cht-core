var sinon = require('sinon'),
    db = require('../../../db'),
    utils = require('../utils'),
    migration = require('../../../migrations/separate-audit-db.js');

var ERR_404 = {statusCode: 404};

var FIRST_VIEW_BATCH = {
  rows: [
    {id: 'abc123'},
    {id: 'abc456'},
  ]
};
var VIEW_REVS = [{
  rows: [
    {id: 'abc123', value: {rev: '1-123'}},
    {id: 'abc456', value: {rev: '1-456'}},
  ]
}];
var LAST_VIEW_BATCH = {
  rows: []
};

exports.tearDown = function (callback) {
  utils.restore(
    db.db.get,
    db.db.create,
    db.use,
    db.medic.view,
    db.db.replicate,
    db.medic.fetchRevs,
    db.medic.bulk);

  db.settings = {};

  callback();
};

exports['creates db, creates view and migrates audit documents'] = function(test) {
  test.expect(9);

  db.settings = {
    db: 'medic',
    auditDb: 'medic-audit'
  };

  var wrappedDbDbGet = sinon.stub(db.db, 'get').withArgs('medic-audit').callsArgWith(1, ERR_404);
  var wrappedDbDbCreate = sinon.stub(db.db, 'create').withArgs('medic-audit').callsArg(1);

  var auditDb = {
    head: function() {},
    insert: function() {}
  };

  var wrappedAuditDbHead = sinon.stub(auditDb, 'head').withArgs('_design/medic').callsArgWith(1, ERR_404);
  var wrappedAuditDbInsert = sinon.stub(auditDb, 'insert').callsArg(2);
  sinon.stub(db, 'use').withArgs('medic-audit').returns(auditDb);

  var wrappedMedicView = sinon.stub(db.medic, 'view');
  wrappedMedicView.onFirstCall().callsArgWith(3, null, FIRST_VIEW_BATCH);
  wrappedMedicView.onSecondCall().callsArgWith(3, null, LAST_VIEW_BATCH);

  var wrappedDbReplicate = sinon.stub(db.db, 'replicate').callsArg(3);
  var wrappedMedicFetchRevs = sinon.stub(db.medic, 'fetchRevs').callsArgWith(1, null, VIEW_REVS);

  var wrappedMedicBulk = sinon.stub(db.medic, 'bulk').callsArgWith(1, null, [1, 2, 3]);

  migration.run(function(err) {
    test.ok(!err);

    test.equals(wrappedDbDbGet.callCount, 1);
    test.equals(wrappedDbDbCreate.callCount, 1);
    test.equals(wrappedAuditDbHead.callCount, 1);
    test.equals(wrappedAuditDbInsert.callCount, 1);

    test.equals(wrappedMedicView.callCount, 2);
    test.equals(wrappedDbReplicate.callCount, 1);
    test.equals(wrappedMedicFetchRevs.callCount, 1);

    test.equals(wrappedMedicBulk.callCount, 1);

    test.done();
  });
};
