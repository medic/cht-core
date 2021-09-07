const { expect } = require('chai');
const TestRunner = require('medic-conf-test-harness');

const harness = new TestRunner();

describe('Contact Summary', () => {
  before(async () => await harness.start());

  after(async () => await harness.stop());

  beforeEach(async () => {
    await harness.clear();
    await harness.setNow('2021-01-01');
  });

  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });

  it('should return context and cards empty', async () => {
    const contact = { name: 'contact', type: 'person' };
    const reports = [];
    const lineage = [{ contact }];
    const summary = await harness.getContactSummary(contact, reports, lineage);

    expect(summary.context).to.deep.equal({});
    expect(summary.cards).to.not.be.undefined;
    expect(summary.cards.length).to.equal(0);
  });

  it('should return fields with right values for person contact', async () => {
    const contact = {
      name: 'Erim',
      type: 'person',
      patient_id: '1a',
      external_id: '2b',
      date_of_birth: '02/11/1990',
      sex: 'male',
      phone: '+1123123123',
      phone_alternate: '+1123123144',
      address: '1 Will St Emer town',
      notes: 'All fine now'
    };
    const reports = [];
    const lineage = [{ contact }];

    const summary = await harness.getContactSummary(contact, reports, lineage);

    expect(summary.fields).to.not.be.undefined;
    expect(summary.fields.length).to.equal(9);
    expect(summary.fields).to.have.deep.members([
      { label: 'patient_id', value: '1a', width: 4 },
      { label: 'contact.age', value: '02/11/1990', filter: 'age', width: 4 },
      { label: 'contact.sex', value: 'contact.sex.male', translate: true, width: 4 },
      { label: 'person.field.phone', value: '+1123123123', width: 4 },
      { label: 'person.field.alternate_phone', value: '+1123123144', width: 4 },
      { label: 'External ID', value: '2b', width: 4 },
      { label: 'contact.parent', value: lineage, filter: 'lineage' },
      { label: 'Address', value: '1 Will St Emer town', width: 12 },
      { label: 'contact.notes', value: 'All fine now', width: 12 }
    ]);
  });

  it('should return fields with right values for non-person contact', async () => {
    const contact = {
      name: 'New Health Center',
      phone: '+1123123133',
      external_id: '3c',
      address: '15 Will St Emer town',
      notes: 'New place',
      contact: {
        name: 'Erim',
        type: 'person',
        patient_id: '1a',
        external_id: '2b',
        date_of_birth: '02/11/1990',
        sex: 'male',
        phone: '+1123123123',
        phone_alternate: '+1123123144',
        address: '1 Will St Emer town',
        notes: 'All fine now'
      }
    };
    const reports = [];
    const lineage = [{ contact }];

    const summary = await harness.getContactSummary(contact, reports, lineage);

    expect(summary.fields).to.not.be.undefined;
    expect(summary.fields.length).to.equal(5);
    expect(summary.fields).to.have.deep.members([
      { label: 'contact', value: 'Erim', width: 4 },
      { label: 'contact.phone', value: '+1123123123', width: 4 },
      { label: 'External ID', value: '3c', width: 4 },
      { label: 'Address', value: '15 Will St Emer town', width: 12 },
      { label: 'contact.notes', value: 'New place', width: 12 }
    ]);
  });
});
