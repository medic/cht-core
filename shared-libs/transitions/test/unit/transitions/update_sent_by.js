const sinon = require('sinon');
const assert = require('chai').assert;
const config = require('../../../src/config');
const dataContext = require('../../../src/data-context');
const { Contact, Qualifier } = require('@medic/cht-datasource');

describe('update sent by', () => {
  let transition;
  let getContactDocs;

  beforeEach(() => {
    config.init({ getAll: sinon.stub().returns({}), });
    getContactDocs = sinon.stub();
    dataContext.init({ bind: sinon.stub().returns(getContactDocs) });
    transition = require('../../../src/transitions/update_sent_by');
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  it('updates sent_by to clinic name if contact name', () => {
    const doc = { from: '+34567890123' };
    getContactDocs.resolves({ data: [ { name: 'Clinic' } ], cursor: null });
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(changed);
      assert.equal(doc.sent_by, 'Clinic');
      assert(dataContext.bind.calledOnceWithExactly(Contact.v1.getPage));
      assert(getContactDocs.calledOnce);
      assert.deepEqual(getContactDocs.args[0], [Qualifier.byPhone('+34567890123'), null, 1]);
    });
  });

  it('sent_by untouched if nothing available', () => {
    const doc = { from: 'unknown number' };
    getContactDocs.resolves({ data: [], cursor: null });
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(!changed);
      assert.strictEqual(doc.sent_by, undefined);
    });
  });
});
