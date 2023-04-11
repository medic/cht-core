const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const personFactory = require('../factories/person');
const placeFactory = require('../factories/place');

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
    const contact = personFactory.build();
    const reports = [];
    const lineage = [{ contact }];

    const summary = await harness.getContactSummary(contact, reports, lineage);

    expect(summary.context).to.deep.equal({});
    expect(summary.cards).to.not.be.undefined;
    expect(summary.cards.length).to.equal(0);
  });

  it('should return fields with right values for person contact', async () => {
    const contact = personFactory.build();
    const reports = [];
    const lineage = [{ contact }];

    const summary = await harness.getContactSummary(contact, reports, lineage);

    expect(summary.fields).to.not.be.undefined;
    expect(summary.fields.length).to.equal(9);
    expect(summary.fields).to.have.deep.members([
      { label: 'patient_id', value: 'test_woman_1', width: 4 },
      { label: 'contact.age', value: '2000-02-01', filter: 'age', width: 4 },
      { label: 'contact.sex', value: 'contact.sex.female', translate: true, width: 4 },
      { label: 'person.field.phone', value: '+1123123123', width: 4 },
      { label: 'person.field.alternate_phone', value: '+1123123144', width: 4 },
      { label: 'External ID', value: 'CHW-01', width: 4 },
      { label: 'Address', value: '1 Willy ST, Emery Town, NY. 10001' },
      { label: 'contact.notes', value: 'CHW-01 has special training' },
      { label: 'contact.parent', value: [{ contact: contact }], filter: 'lineage' }
    ]);
  });

  it('should return fields with right values for non-person contact', async () => {
    const contact = personFactory.build();
    const place = placeFactory.build({ contact });
    const reports = [];
    const lineage = [{ contact }];

    const summary = await harness.getContactSummary(place, reports, lineage);

    expect(summary.fields).to.not.be.undefined;
    expect(summary.fields.length).to.equal(5);
    expect(summary.fields).to.have.deep.members([
      { label: 'contact', value: 'Mary Smith', width: 4 },
      { label: 'contact.phone', value: '+1123123123', width: 4 },
      { label: 'External ID', value: 'DH-01', width: 4 },
      { label: 'Address', value: '35 Lindor ST, Emery Town, NY. 10001' },
      { label: 'contact.notes', value: 'Built in 1980' }
    ]);
  });
});
