const sinon = require('sinon'),
      assert = require('chai').assert,
      db = require('../../src/db-nano'),
      transition = require('../../src/transitions/update_sent_by');

describe('update sent by', () => {
  beforeEach(() => { process.env.TEST_ENV = true; });
  afterEach(() => sinon.restore());

  it('updates sent_by to clinic name if contact name', () => {
    var doc = { from: '+34567890123' };
    var dbView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { doc: { name: 'Clinic' } } ] } );
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(changed);
      assert.equal(doc.sent_by, 'Clinic');
      assert(dbView.calledOnce);
    });
  });

  it('sent_by untouched if nothing available', () => {
    var doc = { from: 'unknown number' };
    sinon.stub(db.medic, 'view').callsArgWith(3, null, {});
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(!changed);
      assert.strictEqual(doc.sent_by, undefined);
    });
  });
});
