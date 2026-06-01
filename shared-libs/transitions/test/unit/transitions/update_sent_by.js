const sinon = require('sinon');
const assert = require('chai').assert;
const { Contact, Qualifier } = require('@medic/cht-datasource');
const config = require('../../../src/config');
const dataContext = require('../../../src/data-context');

describe('update sent by', () => {
  let transition;
  let getContactUuidsPage;
  let getContact;

  beforeEach(() => {
    config.init({ getAll: sinon.stub().returns({}), });
    getContactUuidsPage = sinon.stub();
    getContact = sinon.stub();
    const bind = sinon.stub();
    bind.withArgs(Contact.v1.getUuidsPage).returns(getContactUuidsPage);
    bind.withArgs(Contact.v1.get).returns(getContact);
    dataContext.init({ bind });
    transition = require('../../../src/transitions/update_sent_by');
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  it('updates sent_by to clinic name if contact name', async () => {
    const doc = { from: '+34567890123' };
    getContactUuidsPage.resolves({ data: ['contact-uuid'], cursor: null });
    getContact.resolves({ _id: 'contact-uuid', name: 'Clinic' });

    const changed = await transition.onMatch({ doc });

    assert(changed);
    assert.equal(doc.sent_by, 'Clinic');
    assert.isTrue(getContactUuidsPage.calledOnceWithExactly(Qualifier.byPhone('+34567890123'), null, 1));
    assert.isTrue(getContact.calledOnceWithExactly(Qualifier.byUuid('contact-uuid')));
  });

  it('sent_by untouched if nothing available', async () => {
    const doc = { from: 'unknown number' };
    getContactUuidsPage.resolves({ data: [], cursor: null });

    const changed = await transition.onMatch({ doc });

    assert(!changed);
    assert.strictEqual(doc.sent_by, undefined);
    assert.isTrue(getContact.notCalled);
  });
});
