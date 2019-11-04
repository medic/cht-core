const { expect } = require('chai');
const moment = require('moment');
const rewire = require('rewire');
const sinon = require('sinon');

const { chtDocs, mockEmission, MS_IN_DAY } = require('./mocks');
const rulesEmitter = require('../src/rules-emitter');
const transformTaskEmissionToDoc = rewire('../src/transform-task-emission-to-doc');

const NOW = moment('2000-01-01');

describe('transform-task-emission-to-doc', () => {
  before(() => sinon.useFakeTimers(NOW.valueOf()));
  after(() => sinon.restore());

  it('existingDoc in terminal state yields new doc', () => {
    // a new document in state "ready"
    const readyEmission = mockEmission(0);
    const firstDoc = transformTaskEmissionToDoc(readyEmission, Date.now(), 'username');
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
    const secondDoc = transformTaskEmissionToDoc(completedEmission, Date.now() + 1000, 'username', firstDoc.taskDoc);
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
    const thirdDoc = transformTaskEmissionToDoc(completedEmission, Date.now() + 2000, 'username', secondDoc.taskDoc);
    expect(thirdDoc.taskDoc).to.deep.eq(secondDoc.taskDoc);
    expect(thirdDoc.isUpdated).to.be.false;

    // one second later, moving to a different terminal state yields a new doc
    const cancelledEmission = mockEmission(-MS_IN_DAY * 2);
    const fourthDoc = transformTaskEmissionToDoc(cancelledEmission, Date.now() + 3000, 'username', secondDoc.taskDoc);
    expect(fourthDoc.taskDoc).to.nested.include({
      _id: `task~username~abc~${NOW + 3000}`,
      requester: 'gen',
      state: 'Failed',
      'stateHistory[0].state': 'Failed',
    });
  });

  it('emission details change when state remains the same', () => {
    const readyEmission = mockEmission(0);
    const firstDoc = transformTaskEmissionToDoc(readyEmission, Date.now(), 'username');
    expect(firstDoc.taskDoc).to.nested.include({
      _id: `task~username~abc~${Date.now()}`,
      state: 'Ready',
      'emission.dueDate': Date.now(),
    });

    const slightlyDifferentReadyEmission = mockEmission(1000);
    const updatedDoc = transformTaskEmissionToDoc(slightlyDifferentReadyEmission, Date.now() + 1000, 'username', firstDoc.taskDoc);
    expect(updatedDoc.isUpdated).to.eq(true);
    expect(updatedDoc.taskDoc).to.nested.include({
      _id: `task~username~abc~${Date.now()}`,
      state: 'Ready',
      'emission.dueDate': Date.now() + 1000,
    });
    expect(updatedDoc.taskDoc.stateHistory).to.deep.eq([{
      state: 'Ready',
      timestamp: Date.now(),
    }]);
  });

  it('invalid emission yields cancellation and stateReason', () => {
    const invalidEmission = { _id: 'abc' };
    const doc = transformTaskEmissionToDoc(invalidEmission, Date.now(), 'username');
    expect(doc.taskDoc).to.nested.include({
      _id: `task~username~abc~${Date.now()}`,
      state: 'Cancelled',
      stateReason: 'invalid',
    });
  });

  it('dont update emission details after terminal state is reached', () => {
    const failedEmission = mockEmission(-MS_IN_DAY * 2);
    const terminalDoc = transformTaskEmissionToDoc(failedEmission, Date.now(), 'username');
    expect(terminalDoc.isUpdated).to.be.true;
    expect(terminalDoc.taskDoc).to.nested.include({
      _id: `task~username~abc~${Date.now()}`,
      state: 'Failed',
    });

    const failedEmissionWithDifferentDetails = mockEmission(-MS_IN_DAY * 10);
    const result = transformTaskEmissionToDoc(failedEmissionWithDifferentDetails, Date.now(), 'username', terminalDoc.taskDoc);
    expect(result.isUpdated).to.be.false;
    expect(result.taskDoc).to.nested.include({
      _id: `task~username~abc~${Date.now()}`,
      state: 'Failed',
    });
    expect(result.taskDoc.emission.dueDate).to.not.eq(terminalDoc.taskDoc.emission.dueDate);
  });

  it('no new docs for cancelled state', () => {
    const invalidEmission = mockEmission(MS_IN_DAY);
    invalidEmission.endTime = 0;
    const docForCancelledEmission = transformTaskEmissionToDoc(invalidEmission, Date.now(), 'username');
    expect(docForCancelledEmission).to.nested.include({
      isUpdated: false,
      'taskDoc.state': 'Cancelled',
    });
  });

  it('new doc when moving to new terminal state', () => {
    const failedEmission = mockEmission(-MS_IN_DAY * 2);
    const terminalDoc = transformTaskEmissionToDoc(failedEmission, Date.now(), 'username');
    expect(terminalDoc.isUpdated).to.be.true;
    expect(terminalDoc.taskDoc).to.nested.include({
      _id: `task~username~abc~${Date.now()}`,
      state: 'Failed',
    });

    const failedEmissionWithDifferentDetails = mockEmission(-MS_IN_DAY * 10);
    const result = transformTaskEmissionToDoc(failedEmissionWithDifferentDetails, Date.now(), 'username', terminalDoc.taskDoc);
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
      expect(minifyEmission({}, {})).to.deep.eq({ emission: { dueDate: undefined } });
    });

    it('invalid duedate', () => {
      expect(minifyEmission({}, { date: 'foo' })).to.deep.eq({ emission: { dueDate: NaN } });
    });

    it('action without contact', () => {
      const actual = minifyEmission({}, { actions: [{ content: {} }] });
      expect(actual).to.deep.eq({
        emission: {
          actions: [{ content: {} }],
          forId: undefined,
          dueDate: undefined
        }
      });
    });

    it('action without content', () => {
      const actual = minifyEmission({}, { actions: [{ }] });
      expect(actual).to.deep.eq({
        emission: {
          actions: [{ }],
          dueDate: undefined
        }
      });
    });

    it('contact without id', () => {
      const actual = minifyEmission({}, { contact: { name: 'foo' } });
      expect(actual).to.deep.eq({
        emission: {
          contact: { name: 'foo' },
          dueDate: undefined
        }
      });
    });
  });

  describe('integration', () => {
    const settingsDoc = require('../../../config/default/app_settings.json');
    const user = {};

    afterEach(() => {
      rulesEmitter.shutdown();
    });

    it('transform task.anc.facility_reminder.title', async () => {
      const initialized = rulesEmitter.initialize(settingsDoc, user);
      expect(initialized).to.be.true;

      const { tasks } = await rulesEmitter.getEmissionsFor([chtDocs.contact], [chtDocs.pregnancyReport]);
      expect(tasks.length).to.eq(1);

      const copyOfTaskEmission = JSON.parse(JSON.stringify(tasks[0]));
      copyOfTaskEmission.date = new Date(copyOfTaskEmission.date);

      const actual = transformTaskEmissionToDoc(tasks[0], Date.now(), 'user', undefined);
      expect(actual).to.deep.eq({
        isUpdated: true,
        taskDoc: {
          _id: `task~user~report~pregnancy-facility-visit-reminder~2~${Date.now()}`,
          type: 'task',
          authoredOn: NOW.valueOf(),
          user: 'user',
          requester: 'patient',
          owner: 'patient',
          state: 'Ready',
          emission: {
            _id: 'report~pregnancy-facility-visit-reminder~2',
            title: 'task.anc.facility_reminder.title',
            icon: 'icon-pregnancy',
            forId: 'patient',
            actions: [{
              content: {
                source: 'task',
                source_id: 'report',
                source_visit_date: '2000-01-01',
              },
              form: 'pregnancy_facility_visit_reminder',
              label: 'Pregnancy facility visit reminder',
              type: 'report',
            }],
            contact: {
              name: 'chw',
            },
            deleted: false,
            resolved: false,
            startTime: NOW.clone().subtract(3, 'day').valueOf(),
            dueDate: NOW.valueOf(),
            endTime: NOW.clone().add(8, 'day').valueOf(),
          },
          stateHistory: [{
            state: 'Ready',
            timestamp: Date.now(),
          }],
        },
      });

      // one second later, the emission is the same
      const secondTransform = transformTaskEmissionToDoc(copyOfTaskEmission, Date.now() + 1000, 'user', actual.taskDoc);
      expect(secondTransform.isUpdated).to.be.false;
      expect(secondTransform.taskDoc).to.deep.eq(actual.taskDoc);
    });
  });
});
