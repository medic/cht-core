const sinon = require('sinon');
const assert = require('chai').assert;
const db = require('../../src/db');
const transition = require('../../src/transitions/update_sent_by');

describe('update sent by', () => {
  afterEach(() => sinon.restore());

  it('updates sent_by to clinic name if contact name', () => {
    const doc = { from: '+34567890123' };
    const dbView = sinon.stub(db.medic, 'query').resolves({ rows: [ { doc: { name: 'Clinic' } } ] } );
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(changed);
      assert.equal(doc.sent_by, 'Clinic');
      assert(dbView.calledOnce);
    });
  });

  it('sent_by untouched if nothing available', () => {
    const doc = { from: 'unknown number' };
    sinon.stub(db.medic, 'query').resolves({});
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(!changed);
      assert.strictEqual(doc.sent_by, undefined);
    });
  });
});
