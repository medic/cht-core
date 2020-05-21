
const { expect } = require('chai');
const moment = require('moment');
const sinon = require('sinon');
const rewire = require('rewire');

const { chtDocs, noolsPartnerTemplate, chtRulesSettings } = require('./mocks');
const rulesEmitter = rewire('../src/rules-emitter');

describe('rules-emitter', () => {
  afterEach(() => {
    rulesEmitter.shutdown();
  });

  const settingsWithRules = (rules, contact = {}, user= {}) => ({ rules, contact, user });

  describe('initialize', () => {
    it('throw on initialized twice', () => {
      const settingsDoc = settingsWithRules(' ');
      rulesEmitter.initialize(settingsDoc);
      expect(() => rulesEmitter.initialize(settingsDoc)).to.throw('multiple times');
    });

    it('return false on no rules', () => {
      const actual = rulesEmitter.initialize({});
      expect(actual).to.eq(false);
    });

    it('throw on invalid rules', async () => {
      const settingsDoc = settingsWithRules(`if (blah) {`);
      expect(() => rulesEmitter.initialize(settingsDoc)).to.throw();
      expect(rulesEmitter.isEnabled()).to.be.false;
    });

    it('can initialize twice if shutdown', () => {
      const rules = noolsPartnerTemplate('');
      const settingsDoc = settingsWithRules(rules);
      const actual = rulesEmitter.initialize(settingsDoc);
      expect(actual).to.eq(true);

      rulesEmitter.shutdown();

      const second = rulesEmitter.initialize(settingsDoc);
      expect(second).to.eq(true);
    });
  });

  it('single contact emits simple task and target', async () => {
    const rules = noolsPartnerTemplate(
      `emit('task', new Task({ data: c.contact })); emit('target', new Target({ data: c.contact }));`
    );
    const contact = { _id: 'foo' };
    const settingsDoc = settingsWithRules(rules, contact);
    const initialized = rulesEmitter.initialize(settingsDoc);
    expect(initialized).to.be.true;

    expect(rulesEmitter.isLatestNoolsSchema()).to.be.false;
    const actual = await rulesEmitter.getEmissionsFor([contact], []);
    expect(actual.tasks).to.have.property('length', 1);
    expect(actual.tasks[0].data).to.deep.eq(contact);
    expect(actual.targets).to.have.property('length', 1);
    expect(actual.targets[0].data).to.deep.eq(contact);
  });

  it('c.tasks safely undefined when not in schema', async () => {
    const rules = noolsPartnerTemplate(`emit('task', new Task({ data: c.tasks }));`);
    const settingsDoc = settingsWithRules(rules);
    const contact = { _id: 'foo' };
    const taskDoc = {
      _id: 'task',
      requester: contact._id,
      emission: {},
    };
    const initialized = rulesEmitter.initialize(settingsDoc);
    expect(initialized).to.be.true;

    const actual = await rulesEmitter.getEmissionsFor([contact], [], [taskDoc]);
    expect(actual.tasks).to.have.property('length', 1);
    expect(actual.tasks[0].data).to.be.undefined;
  });

  it('c.tasks defined when in schema', async () => {
    const rules = noolsPartnerTemplate(`emit('task', new Task({ data: c.tasks }));`, { includeTasks: true });
    const settingsDoc = settingsWithRules(rules);
    const contact = { _id: 'foo' };
    const taskDoc = {
      _id: 'task',
      requester: contact._id,
      emission: {},
    };
    const initialized = rulesEmitter.initialize(settingsDoc);
    expect(initialized).to.be.true;

    const actual = await rulesEmitter.getEmissionsFor([contact], [], [taskDoc]);
    expect(actual.tasks).to.have.property('length', 1);
    expect(actual.tasks[0].data).to.deep.eq([taskDoc]);
  });

  it('reports and tasks collate by id even when contact is absent', async () => {
    const rules = noolsPartnerTemplate(`emit('task', new Task({ data: c }));`, { includeTasks: true });
    const settingsDoc = settingsWithRules(rules);
    const reportDoc = { patient_id: 'foo' };
    const taskDoc = { requester: 'foo' };
    const initialized = rulesEmitter.initialize(settingsDoc);
    expect(initialized).to.be.true;

    const actual = await rulesEmitter.getEmissionsFor([], [reportDoc], [taskDoc]);
    expect(actual.tasks).to.have.property('length', 1);
    expect(actual.tasks[0].data).to.deep.eq({
      contact: { _id: 'foo' },
      reports: [reportDoc],
      tasks: [taskDoc],
    });
  });

  it('reports collate by patient_id when it is not a uuid', async () => {
    const rules = noolsPartnerTemplate(`emit('task', new Task({ data: c }));`, { includeTasks: true });
    const settingsDoc = settingsWithRules(rules);
    const contactDoc = { _id: 'contact', patient_id: 'foo' };
    const byPatientId = { _id: 'report', type: 'data_record', patient_id: 'foo' };
    const byPatientUuid = { _id: 'report', type: 'data_record', fields: { patient_uuid: 'contact' } };

    const initialized = rulesEmitter.initialize(settingsDoc);
    expect(initialized).to.be.true;

    const actual = await rulesEmitter.getEmissionsFor([contactDoc], [byPatientId, byPatientUuid], []);
    expect(actual.tasks).to.have.property('length', 1);
    expect(actual.tasks[0].data).to.deep.eq({
      contact: contactDoc,
      reports: [byPatientId, byPatientUuid],
      tasks: [],
    });
  });

  it('nootils and user objects are available', async () => {
    const rules = noolsPartnerTemplate(
      `emit('task', new Task({ data: user })); emit('target', new Target({ data: Utils }));`
    );
    const contactDoc = { _id: 'contact' };
    const settingsDoc = settingsWithRules(rules, contactDoc);

    const initialized = rulesEmitter.initialize(settingsDoc);
    expect(initialized).to.be.true;

    const actual = await rulesEmitter.getEmissionsFor([{}], []);
    expect(actual.tasks).to.have.property('length', 1);
    expect(actual.tasks[0].data).to.deep.eq(contactDoc);
    expect(actual.targets).to.have.property('length', 1);
    expect(actual.targets[0].data).to.have.property('isTimely');
  });

  it('session is disposed when marshalDocsIntoNoolsFacts throws', async () => {
    const settingsDoc = settingsWithRules(' ');
    rulesEmitter.initialize(settingsDoc);
    rulesEmitter.__with__({ marshalDocsIntoNoolsFacts: () => { throw 'fake'; }})(() => {
      expect(() => rulesEmitter.getEmissionsFor([], [])).to.throw('fake');
      // unsure how to assert that the memory is freed in this scenario
    });
  });

  describe('integration', () => {
    it('isLatestNoolsSchema as true', () => {
      const initialized = rulesEmitter.initialize(chtRulesSettings());
      expect(initialized).to.be.true;
      expect(rulesEmitter.isLatestNoolsSchema()).to.be.true;
    });

    it('no reports yields no tasks', async () => {
      const initialized = rulesEmitter.initialize(chtRulesSettings());
      expect(initialized).to.be.true;

      const { tasks, targets } = await rulesEmitter.getEmissionsFor([], []);
      expect(tasks).to.be.empty;
      expect(targets).to.be.empty;
    });

    it('trigger task.anc.pregnancy_home_visit', async () => {
      const time = moment('2000-01-01');
      sinon.useFakeTimers(time.valueOf());

      const initialized = rulesEmitter.initialize(chtRulesSettings());
      expect(initialized).to.be.true;

      const { tasks, targets } = await rulesEmitter.getEmissionsFor([chtDocs.contact], [chtDocs.pregnancyReport]);
      expect(tasks.length).to.eq(1);
      expect(targets.length).to.eq(1);
    });
  });
});
