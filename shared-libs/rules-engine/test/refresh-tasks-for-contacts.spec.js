const { expect } = require('chai');
const { chtDocs, mockEmission, MS_IN_DAY } = require('./mocks');
const moment = require('moment');
const rewire = require('rewire');
const sinon = require('sinon');

const RulesEmitter = require('../src/rules-emitter');
const refreshTasksForContact = rewire('../src/refresh-tasks-for-contacts');

describe('refresh-tasks-for-contacts', () => {
  describe('with mock emitter', () => {
    const NOW = 1000000;
    let rulesEmitter;

    beforeEach(() => {
      rulesEmitter = {
        getEmissionsFor: sinon.stub(),
      };
      refreshTasksForContact.__set__('rulesEmitter', rulesEmitter);
      sinon.useFakeTimers(NOW);
    });

    afterEach(() => {
      sinon.restore();
    });


    it('no input yields empty results', async () => {
      const actual = await refreshTasksForContact();
      expect(rulesEmitter.getEmissionsFor.callCount).to.eq(0);
      expect(actual).to.deep.eq([]);
    });

    it('no emissions yields empty results', async () => {
      rulesEmitter.getEmissionsFor.resolves({ tasks: [] });
      const actual = await refreshTasksForContact({ contactDocs: [{}] });
      expect(rulesEmitter.getEmissionsFor.callCount).to.eq(1);
      expect(actual).to.deep.eq([]);
    });

    it('task is cancelled when there is no emission with matching id', async () => {
      rulesEmitter.getEmissionsFor.resolves({ tasks: [] });
      const contactDoc = { _id: 'contact' };
      const taskDoc = { _id: 'abc', requester: contactDoc._id, emission: {} };
      const actual = await refreshTasksForContact({ contactDocs: [contactDoc], taskDocs: [taskDoc] });
      expect(rulesEmitter.getEmissionsFor.callCount).to.eq(1);
      expect(actual).to.deep.eq([taskDoc]);
      expect(taskDoc.state).to.eq('Cancelled');
    });

    it('task is updated when emission changes details', async () => {
      const emission = mockEmission(0);
      rulesEmitter.getEmissionsFor.resolves({ tasks: [emission] });
      const contactDoc = { _id: 'contact' };
      const taskDoc = { _id: 'abc-123', requester: contactDoc._id, emission: { _id: emission._id } };
      const actual = await refreshTasksForContact({ contactDocs: [contactDoc], taskDocs: [taskDoc] });
      expect(rulesEmitter.getEmissionsFor.callCount).to.eq(1);
      expect(actual[0]).to.nested.include({
        'state': 'Ready',
        'stateHistory[0].state': 'Ready',
      });
    });

    it('task is updated when emission becomes invalid', async () => {
      const invalidEmission = { _id: 'abc' };
      rulesEmitter.getEmissionsFor.resolves({ tasks: [invalidEmission] });
      const contactDoc = { _id: 'contact' };
      const taskDoc = { _id: 'abc-123', requester: contactDoc._id, emission: { _id: invalidEmission._id } };
      const actual = await refreshTasksForContact({ contactDocs: [contactDoc], taskDocs: [taskDoc] });
      expect(rulesEmitter.getEmissionsFor.callCount).to.eq(1);
      expect(actual[0]).to.nested.include({
        'state': 'Cancelled',
        'stateReason': 'invalid',
        'stateHistory[0].state': 'Cancelled',
      });
    });

    it('tasks age from draft to ready state', async () => {
      const contactDoc = { _id: 'contact' };

      const emission = mockEmission(MS_IN_DAY + 10, { doc: { contact: contactDoc } });
      rulesEmitter.getEmissionsFor.resolves({ tasks: [emission] });

      const draftStateTasks = await refreshTasksForContact({ contactDocs: [contactDoc] });
      expect(draftStateTasks[0]).to.nested.include({
        requester: contactDoc._id,
        state: 'Draft',
      });

      // one day later, when viewed the reports move into the time window and become "ready"
      sinon.useFakeTimers(NOW + MS_IN_DAY);
      const actual = await refreshTasksForContact({ contactDocs: [contactDoc], taskDocs: draftStateTasks });
      expect(actual).to.have.property('length', 1);
      expect(actual[0]).to.nested.include({
        requester: contactDoc._id,
        state: 'Ready',
      });
    });

    it('no new doc if the initial state is Cancelled', async () => {
      const contactDoc = { _id: 'contact' };
      const emission = mockEmission(MS_IN_DAY, { doc: { contact: contactDoc } });
      emission.displayDaysAfter = -1; // invalid
      rulesEmitter.getEmissionsFor.resolves({ tasks: [emission] });

      const noNewTasks = await refreshTasksForContact({ contactDocs: [contactDoc] });
      expect(noNewTasks.length).to.eq(0);
    });
  });

  describe('getCancellationUpdates', () => {
    const mockTaskDoc = (emissionId, augment) => Object.assign({ emission: { _id: emissionId }, stateHistory: [] }, augment);
    const getCancellationUpdates = refreshTasksForContact.__get__('getCancellationUpdates');

    it('same emissions yields no cancellations', () => {
      const taskDoc = mockTaskDoc('1');
      const actual = getCancellationUpdates([taskDoc], [taskDoc]);
      expect(actual).to.be.empty;
    });

    it('no new emission yields cancellation', () => {
      const taskDoc = mockTaskDoc('1');
      const actual = getCancellationUpdates([], [taskDoc], 1000);
      expect(actual).to.deep.eq([{
        emission: { _id: '1' },
        state: 'Cancelled',
        stateHistory: [{
          state: 'Cancelled',
          timestamp: 1000,
        }],
      }]);
    });

    it('old terminal docs dont cancel due to no emission', () => {
      const taskDoc = mockTaskDoc('1', { state: 'Failed' });
      const actual = getCancellationUpdates([], [taskDoc], 1000);
      expect(actual).to.be.empty;
    });
  });

  describe('integration', () => {
    const settingsDoc = require('../../../config/default/app_settings.json');
    const userDoc = {};
    const NOW = 11430000000;

    beforeEach(() => {
      const isInitialized = RulesEmitter.initialize(settingsDoc, userDoc);
      expect(isInitialized).to.be.true;
      refreshTasksForContact.__set__('rulesEmitter', RulesEmitter);
      sinon.useFakeTimers(NOW);
    });

    afterEach(() => {
      RulesEmitter.shutdown();
      sinon.restore();
    });

    it('cht scenario', async () => {
      const startTime = moment('2000-01-01');
      sinon.useFakeTimers(startTime.valueOf());

      const refreshData = {
        contactDocs: [chtDocs.contact],
        reportDocs: [chtDocs.pregnancyReport],
      };

      const firstResult = await refreshTasksForContact(refreshData);
      expectUniqueIds(firstResult);

      expect(firstResult.length).to.eq(1);
      expect(firstResult[0]).to.nested.include({
        type: 'task',
        state: 'Ready',
        'emission._id': 'report~pregnancy-facility-visit-reminder~2',
      });

      // one second later, it gets cancelled because the pregnancy report is gone
      const secondData = {
        contactDocs: [chtDocs.contact],
        reportDocs: [],
        taskDocs: firstResult,
      };
      firstResult[0]._rev = '1_';
      sinon.useFakeTimers(startTime.valueOf() + 1000);
      const secondResult = await refreshTasksForContact(secondData);
      expect(secondResult.length).to.eq(1);
      expect(secondResult[0]).to.nested.include({
        type: 'task',
        state: 'Cancelled',
        'emission._id': 'report~pregnancy-facility-visit-reminder~2',
        'stateHistory[0].state': 'Ready',
        'stateHistory[1].state': 'Cancelled',
      });

      // a year later, a new pregnancy begins as a new task doc
      const thirdData = {
        contactDocs: [chtDocs.contact],
        reportDocs: [Object.assign({}, chtDocs.pregnancyReport, {
          fields: {
            t_pregnancy_follow_up_date: '2001-01-01',
          },
        })],
        taskDocs: secondResult,
      };
      sinon.useFakeTimers(startTime.clone().add(1, 'year').valueOf());
      const thirdResult = await refreshTasksForContact(thirdData);
      expect(firstResult[0]._id).to.not.eq(thirdResult[0]._id);
      expect(thirdResult[0]._rev).to.be.undefined;
      expect(thirdResult.length).to.eq(1);
      expect(thirdResult[0]).to.nested.include({
        type: 'task',
        state: 'Ready',
        'emission._id': 'report~pregnancy-facility-visit-reminder~2',
      });
    });
  });
});

const expectUniqueIds = ids => {
  const docIds = ids.map(doc => doc._id);
  expect(docIds).to.deep.eq(Array.from(new Set(docIds)));
};
