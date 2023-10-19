const { expect } = require('chai');
const moment = require('moment');
const rewire = require('rewire');
const sinon = require('sinon');

const { engineSettings, chtDocs, mockEmission, MS_IN_DAY } = require('./mocks');
const rulesEmitter = require('../src/rules-emitter');
const transformTaskEmissionToDoc = rewire('../src/transform-task-emission-to-doc');

const NOW = moment('2000-01-01');
const deepCopy = obj => JSON.parse(JSON.stringify(obj));
let clock;

describe('transform-task-emission-to-doc', () => {
  before(() => {
    clock = sinon.useFakeTimers(NOW.valueOf());
  });
  after(() => {
    sinon.restore();
    clock.restore();
  });

  it('existingDoc in terminal state yields new doc', () => {
    // a new document in state "ready"
    const readyEmission = mockEmission(0);
    const firstDoc = transformTaskEmissionToDoc(deepCopy(readyEmission), Date.now(), 'username');
    expect(firstDoc.taskDoc).to.nested.include({
      _id: `task~username~abc~${Date.now()}`,
      requester: 'gen',
      state: 'Ready',
      'emission._id': 'abc',
      'stateHistory[0].state': 'Ready',
      'stateHistory[0].timestamp': Date.now(),
    });
    firstDoc.taskDoc.rev = '1';

    // one second later, the document moves to state Completed
    const completedEmission = mockEmission(0, { resolved: true });
    const secondDoc = transformTaskEmissionToDoc(
      deepCopy(completedEmission), Date.now() + 1000, 'username', deepCopy(firstDoc.taskDoc)
    );
    expect(secondDoc.taskDoc).to.nested.include({
      _id: `task~username~abc~${Date.now()}`,
      rev: '1', // attributes not in shema are preserved
      requester: 'gen',
      state: 'Completed',
      'emission._id': 'abc',
      'stateHistory[0].state': 'Ready',
      'stateHistory[1].state': 'Completed',
      'stateHistory[1].timestamp': Date.now() + 1000,
    });

    // one second later, the same emission yields no change
    const thirdDoc = transformTaskEmissionToDoc(
      deepCopy(completedEmission), Date.now() + 2000, 'username', deepCopy(secondDoc.taskDoc)
    );
    expect(thirdDoc.taskDoc).to.deep.eq(secondDoc.taskDoc);
    expect(thirdDoc.isUpdated).to.be.false;

    // one second later, moving to a different terminal state yields a new doc
    const cancelledEmission = mockEmission(-MS_IN_DAY * 2);
    const fourthDoc = transformTaskEmissionToDoc(
      deepCopy(cancelledEmission), Date.now() + 3000, 'username', deepCopy(secondDoc.taskDoc)
    );
    expect(fourthDoc.taskDoc).to.nested.include({
      _id: `task~username~abc~${NOW + 3000}`,
      requester: 'gen',
      state: 'Failed',
      'stateHistory[0].state': 'Failed',
    });
  });

  it('emission details change when state remains the same', () => {
    const readyEmission = mockEmission(0);
    const firstDoc = transformTaskEmissionToDoc(deepCopy(readyEmission), Date.now(), 'username');
    expect(firstDoc.taskDoc).to.nested.include({
      _id: `task~username~abc~${Date.now()}`,
      state: 'Ready',
    });

    const slightlyDifferentReadyEmission = mockEmission(0, { readyEnd: 2 });
    const updatedDoc = transformTaskEmissionToDoc(
      deepCopy(slightlyDifferentReadyEmission), Date.now() + 1000, 'username', deepCopy(firstDoc.taskDoc)
    );
    expect(updatedDoc.isUpdated).to.eq(true);
    expect(updatedDoc.taskDoc).to.nested.include({
      _id: `task~username~abc~${Date.now()}`,
      state: 'Ready',
    });
    expect(firstDoc.taskDoc.emission.endDate).to.not.eq(updatedDoc.taskDoc.emission.endDate);
    expect(updatedDoc.taskDoc.stateHistory).to.deep.eq([{
      state: 'Ready',
      timestamp: Date.now(),
    }]);
  });

  it('invalid emission yields cancellation and stateReason', () => {
    const invalidEmission = { _id: 'abc' };
    const doc = transformTaskEmissionToDoc(deepCopy(invalidEmission), Date.now(), 'username');
    expect(doc.taskDoc).to.nested.include({
      _id: `task~username~abc~${Date.now()}`,
      state: 'Cancelled',
      stateReason: 'invalid',
    });
  });

  it('dont update emission details after terminal state is reached', () => {
    const failedEmission = mockEmission(-MS_IN_DAY * 2);
    const terminalDoc = transformTaskEmissionToDoc(deepCopy(failedEmission), Date.now(), 'username');
    expect(terminalDoc.isUpdated).to.be.true;
    expect(terminalDoc.taskDoc).to.nested.include({
      _id: `task~username~abc~${Date.now()}`,
      state: 'Failed',
    });

    const failedEmissionWithDifferentDetails = mockEmission(-MS_IN_DAY * 10);
    const result = transformTaskEmissionToDoc(
      deepCopy(failedEmissionWithDifferentDetails), Date.now(), 'username', deepCopy(terminalDoc.taskDoc)
    );
    expect(result.isUpdated).to.be.false;
    expect(result.taskDoc).to.nested.include({
      _id: `task~username~abc~${Date.now()}`,
      state: 'Failed',
    });
    expect(result.taskDoc.emission.dueDate).to.not.eq(terminalDoc.taskDoc.emission.dueDate);
  });

  it('no new docs for cancelled state', () => {
    const invalidEmission = mockEmission(MS_IN_DAY);
    invalidEmission.readyStart = -1;
    const docForCancelledEmission = transformTaskEmissionToDoc(
      deepCopy(invalidEmission), Date.now(), 'username'
    );
    expect(docForCancelledEmission).to.nested.include({
      isUpdated: false,
      'taskDoc.state': 'Cancelled',
    });
  });

  it('new doc when moving to new terminal state', () => {
    const failedEmission = mockEmission(-MS_IN_DAY * 2);
    const terminalDoc = transformTaskEmissionToDoc(deepCopy(failedEmission), Date.now(), 'username');
    expect(terminalDoc.isUpdated).to.be.true;
    expect(terminalDoc.taskDoc).to.nested.include({
      _id: `task~username~abc~${Date.now()}`,
      state: 'Failed',
    });

    const failedEmissionWithDifferentDetails = mockEmission(-MS_IN_DAY * 10);
    const result = transformTaskEmissionToDoc(
      deepCopy(failedEmissionWithDifferentDetails), Date.now(), 'username', deepCopy(terminalDoc.taskDoc)
    );
    expect(result.isUpdated).to.be.false;
    expect(result.taskDoc).to.nested.include({
      _id: `task~username~abc~${Date.now()}`,
      state: 'Failed',
    });
    expect(result.taskDoc.emission.dueDate).to.not.eq(terminalDoc.taskDoc.emission.dueDate);
  });

  describe('minifyEmission', () => {
    const minifyEmission = transformTaskEmissionToDoc.__get__('minifyEmission');

    it('empty emission', () => {
      expect(minifyEmission({}, {})).to.deep.eq({ emission: {} });
    });

    it('invalid duedate', () => {
      const actual = minifyEmission({}, { date: 'foo' });
      expect(actual).to.deep.eq({ emission: { dueDate: NaN, startDate: NaN, endDate: NaN } });
    });

    it('action without contact', () => {
      const actual = minifyEmission({}, { actions: [{ content: {} }] });
      expect(actual).to.deep.eq({
        emission: {
          actions: [{ content: {} }],
          forId: undefined,
        }
      });
    });

    it('action without content', () => {
      const actual = minifyEmission({}, { actions: [{ }] });
      expect(actual).to.deep.eq({
        emission: { actions: [{ }] }
      });
    });

    it('contact without id', () => {
      const actual = minifyEmission({}, { contact: { name: 'foo' } });
      expect(actual).to.deep.eq({
        emission: { contact: { name: 'foo' } }
      });
    });
  });

  describe('integration', () => {
    const user = {};

    afterEach(() => {
      rulesEmitter.shutdown();
    });

    it('calculateState is the same before and after transform (Ready)', () => {
      const TaskStates = require('../src/task-states');
      const emission = mockEmission(0);
      const stateOfRaw = TaskStates.calculateState(emission, Date.now());
      expect(stateOfRaw).to.eq('Ready');
      const transformed = transformTaskEmissionToDoc(emission, Date.now(), 'user');
      const stateOfTransformed = TaskStates.calculateState(transformed.taskDoc.emission, Date.now());

      expect(stateOfRaw).to.eq(stateOfTransformed);
    });

    it('calculateState is the same before and after transform (Draft)', () => {
      const TaskStates = require('../src/task-states');
      const emission = mockEmission(MS_IN_DAY * 2);
      const stateOfRaw = TaskStates.calculateState(emission, Date.now());
      expect(stateOfRaw).to.eq('Draft');
      const transformed = transformTaskEmissionToDoc(emission, Date.now(), 'user');
      const stateOfTransformed = TaskStates.calculateState(transformed.taskDoc.emission, Date.now());

      expect(stateOfRaw).to.eq(stateOfTransformed);
    });

    it('transform task.anc.facility_reminder.title', async () => {
      const initialized = rulesEmitter.initialize(engineSettings(), user);
      expect(initialized).to.be.true;

      const { tasks } = await rulesEmitter.getEmissionsFor([chtDocs.contact], [chtDocs.pregnancyReport]);
      expect(tasks.length).to.eq(1);

      const copyOfTaskEmission = deepCopy(tasks[0]);
      copyOfTaskEmission.date = new Date(copyOfTaskEmission.date);

      const actual = transformTaskEmissionToDoc(tasks[0], Date.now(), 'user', undefined);
      expect(actual).to.deep.eq({
        isUpdated: true,
        taskDoc: {
          _id: `task~user~pregReport~pregnancy-facility-visit-reminder~anc.facility_reminder~${Date.now()}`,
          type: 'task',
          authoredOn: NOW.valueOf(),
          user: 'user',
          requester: 'patient',
          owner: 'patient',
          state: 'Ready',
          emission: {
            _id: 'pregReport~pregnancy-facility-visit-reminder~anc.facility_reminder',
            title: 'task.anc.facility_reminder.title',
            icon: 'icon-pregnancy',
            forId: 'patient',
            actions: [{
              content: {
                source: 'task',
                source_id: 'pregReport',
                source_visit_date: '2000-01-01',
              },
              form: 'pregnancy_facility_visit_reminder',
              label: 'Pregnancy facility visit reminder',
              type: 'report',
            }],
            contact: {
              name: chtDocs.contact.name,
            },
            deleted: false,
            resolved: false,
            dueDate: '2000-01-01',
            startDate: '1999-12-29',
            endDate: '2000-01-08',
          },
          stateHistory: [{
            state: 'Ready',
            timestamp: Date.now(),
          }],
        },
      });

      // one second later, the emission is the same
      const secondTransform = transformTaskEmissionToDoc(
        copyOfTaskEmission, Date.now() + 1000, 'user', deepCopy(actual.taskDoc)
      );
      expect(secondTransform.isUpdated).to.be.false;
      expect(secondTransform.taskDoc).to.deep.eq(actual.taskDoc);
    });
  });
});
