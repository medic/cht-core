const sinon = require('sinon').sandbox.create(),
      assert = require('chai').assert,
      transition = require('../../transitions/maintain_info_document'),
      db = require('../../db-nano');

describe('maintain_info_document', () => {
  afterEach(() => sinon.restore());

  it('Does not create info documents for design documents', () => {
    assert.equal(false, transition.filter({_id: '_design/blah'}));
  });

  it('Does not try to create info documents for info documents', () => {
    assert.equal(false, transition.filter({_id: 'foo', type: 'info'}));
  });

  it('Updates an existing document with a new sync date', () => {
    const change = {id: 'foo'};

    const infoDoc = {
      _id: 'foo-info',
      type: 'info',
      doc_id: 'foo',
      initial_replication_date: new Date()
    };

    sinon.stub(db.medic, 'get').callsArgWith(1, null, infoDoc);
    sinon.stub(db.medic, 'insert').callsArgWith(1, null, {});

    return transition.onMatch(change).then(changed => {
      assert(!changed);
      assert(db.medic.get.calledWith(infoDoc._id));
      assert(infoDoc.latest_replication_date);
      assert(infoDoc.latest_replication_date instanceof Date);
      assert(db.medic.insert.calledWith(infoDoc));
    });
  });

  it('If no info doc exists, create one from audit records', () => {
    const change = {id: 'foo'};

    const auditDoc = {
      history: [{
        action: 'something-that-isnt-created',
      }, {
        action: 'create',
        timestamp: new Date()
      }]
    };

    sinon.stub(db.medic, 'get').callsArgWith(1, {statusCode: 404});
    sinon.stub(db.audit, 'get').callsArgWith(1, null, {doc: auditDoc});
    sinon.stub(db.medic, 'insert').callsArgWith(1, null, {});

    return transition.onMatch(change).then(changed => {
      assert(!changed);
      assert(db.medic.get.calledWith('foo-info'));
      assert(db.audit.get.calledWith('foo'));
      assert.equal(db.medic.insert.callCount, 1);
      const infoDoc = db.medic.insert.args[0][0];
      assert.equal(infoDoc._id, 'foo-info');
      assert.equal(infoDoc.type, 'info');
      assert(infoDoc.initial_replication_date);
      assert(infoDoc.latest_replication_date);
      assert.equal(infoDoc.initial_replication_date, auditDoc.history[1].timestamp);
    });
  });
});
