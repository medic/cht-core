const { expect } = require('chai');
const { chtDocs, mockEmission, MS_IN_DAY, chtRulesSettings } = require('./mocks');
const moment = require('moment');
const rewire = require('rewire');
const sinon = require('sinon');

const RulesEmitter = require('../src/rules-emitter');
const refreshRulesEmissionsContact = rewire('../src/refresh-rules-emissions');
let clock;

describe('refresh-rules-emissions', () => {
  describe('with mock emitter', () => {
    const NOW = 100000;
    let rulesEmitter;

    beforeEach(() => {
      rulesEmitter = {
        getEmissionsFor: sinon.stub(),
      };
      refreshRulesEmissionsContact.__set__('rulesEmitter', rulesEmitter);
      clock = sinon.useFakeTimers(NOW);
    });

    afterEach(() => {
      clock.restore();
      sinon.restore();
    });


    it('no input yields empty results', async () => {
      rulesEmitter.getEmissionsFor.resolves({ tasks: [], targets: [] });
      const actual = await refreshRulesEmissionsContact();
      expect(rulesEmitter.getEmissionsFor.callCount).to.eq(1);
      expect(actual).to.deep.eq({
        updatedTaskDocs: [],
        targetEmissions: [],
      });
    });

    it('no emissions yields empty results', async () => {
      rulesEmitter.getEmissionsFor.resolves({ tasks: [], targets: [] });
      const actual = await refreshRulesEmissionsContact({ contactDocs: [{}] });
      expect(rulesEmitter.getEmissionsFor.callCount).to.eq(1);
      expect(actual).to.deep.eq({
        updatedTaskDocs: [],
        targetEmissions: [],
      });
    });

    it('task is cancelled when there is no emission with matching id', async () => {
      rulesEmitter.getEmissionsFor.resolves({ tasks: [] });
      const contactDoc = { _id: 'contact' };
      const taskDoc = { _id: 'abc', requester: contactDoc._id, emission: {} };
      const actual = await refreshRulesEmissionsContact({ contactDocs: [contactDoc], taskDocs: [taskDoc] });
      expect(rulesEmitter.getEmissionsFor.callCount).to.eq(1);
      expect(actual.updatedTaskDocs).to.deep.eq([taskDoc]);
      expect(taskDoc.state).to.eq('Cancelled');
    });

    it('task is updated when emission changes details', async () => {
      const emission = mockEmission(0);
      rulesEmitter.getEmissionsFor.resolves({ tasks: [emission] });
      const contactDoc = { _id: 'contact' };
      const taskDoc = { _id: 'abc-123', requester: contactDoc._id, emission: { _id: emission._id } };
      const actual = await refreshRulesEmissionsContact({ contactDocs: [contactDoc], taskDocs: [taskDoc] });
      expect(rulesEmitter.getEmissionsFor.callCount).to.eq(1);
      expect(actual.updatedTaskDocs[0]).to.nested.include({
        'state': 'Ready',
        'stateHistory[0].state': 'Ready',
      });
    });

    it('task is updated when emission becomes invalid', async () => {
      const invalidEmission = { _id: 'abc' };
      rulesEmitter.getEmissionsFor.resolves({ tasks: [invalidEmission] });
      const contactDoc = { _id: 'contact' };
      const taskDoc = {
        _id: 'abc-123', authoredOn: NOW, requester: contactDoc._id, emission: { _id: invalidEmission._id }
      };
      const actual = await refreshRulesEmissionsContact({ contactDocs: [contactDoc], taskDocs: [taskDoc] });
      expect(rulesEmitter.getEmissionsFor.callCount).to.eq(1);
      expect(actual.updatedTaskDocs[0]).to.nested.include({
        'state': 'Cancelled',
        'stateReason': 'invalid',
        'stateHistory[0].state': 'Cancelled',
      });
    });

    it('user rewinds system clock', async () => {
      const contactDoc = { _id: 'contact' };

      clock = sinon.useFakeTimers(moment('2000-01-01').valueOf());
      const emission = mockEmission(0);
      rulesEmitter.getEmissionsFor.resolves({ tasks: [emission], targets: [] });
      const actual = await refreshRulesEmissionsContact({ contactDocs: [contactDoc] });
      expect(actual.updatedTaskDocs.length).to.eq(1);
      expect(actual.updatedTaskDocs[0].authoredOn).to.eq(Date.now());

      // rewind one year
      clock = sinon.useFakeTimers(moment('1999-01-01').valueOf());
      const earlierEmission = mockEmission(0);
      rulesEmitter.getEmissionsFor.resolves({ tasks: [earlierEmission], targets: [] });
      const earlierActual = await refreshRulesEmissionsContact(
        { contactDocs: [contactDoc], taskDocs: actual.updatedTaskDocs }
      );
      expect(earlierActual.updatedTaskDocs.length).to.eq(1);
      expect(earlierActual.updatedTaskDocs[0].authoredOn).to.eq(Date.now());
    });

    it('tasks age from draft to ready state', async () => {
      const contactDoc = { _id: 'contact' };

      const emission = mockEmission(MS_IN_DAY + 10, { doc: { contact: contactDoc } });
      rulesEmitter.getEmissionsFor.resolves({ tasks: [emission] });

      const draftStateTasks = await refreshRulesEmissionsContact({ contactDocs: [contactDoc] });
      expect(draftStateTasks.updatedTaskDocs[0]).to.nested.include({
        requester: contactDoc._id,
        state: 'Draft',
      });

      // one day later, when viewed the reports move into the time window and become "ready"
      clock = sinon.useFakeTimers(NOW + MS_IN_DAY);
      const actual = await refreshRulesEmissionsContact(
        { contactDocs: [contactDoc], taskDocs: draftStateTasks.updatedTaskDocs }
      );
      expect(actual.updatedTaskDocs).to.have.property('length', 1);
      expect(actual.updatedTaskDocs[0]).to.nested.include({
        requester: contactDoc._id,
        state: 'Ready',
      });
    });

    it('no new doc if the initial state is Cancelled', async () => {
      const contactDoc = { _id: 'contact' };
      const emission = mockEmission(MS_IN_DAY, { doc: { contact: contactDoc } });
      emission.readyEnd = -1; // invalid
      rulesEmitter.getEmissionsFor.resolves({ tasks: [emission] });

      const noNewTasks = await refreshRulesEmissionsContact({ contactDocs: [contactDoc] });
      expect(noNewTasks.updatedTaskDocs.length).to.eq(0);
    });
  });

  describe('getCancellationUpdates', () => {
    const mockTaskDoc = (emissionId, augment) => Object.assign(
      { emission: { _id: emissionId }, stateHistory: [] },
      augment
    );
    const getCancellationUpdates = refreshRulesEmissionsContact.__get__('getCancellationUpdates');

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

  describe('disambiguateTaskDocs', () => {
    const mockTaskDoc = (emissionId, authoredOn = 0, augment = {}) => Object.assign(
      { emission: { _id: emissionId }, stateHistory: [], authoredOn: authoredOn || moment().valueOf() },
      augment
    );
    const disambiguateTaskDocs = refreshRulesEmissionsContact.__get__('disambiguateTaskDocs');

    it('should map tasks to emission ids when there are no duplicates', () => {
      const now = moment.valueOf();

      const taskDoc1 = mockTaskDoc('1', now - 1000);
      const taskDoc2 = mockTaskDoc('2', now - 2000);
      const taskDoc3 = mockTaskDoc('3', now - 1500);
      const taskDoc4 = mockTaskDoc('4', now - 300);
      const taskDoc5 = mockTaskDoc('5', now - 200);

      const result = disambiguateTaskDocs([taskDoc1, taskDoc2, taskDoc3, taskDoc4, taskDoc5], moment().valueOf());
      expect(result.duplicates.length).to.equal(0);
      expect(result.winners).to.deep.equal({
        '1': taskDoc1,
        '2': taskDoc2,
        '3': taskDoc3,
        '4': taskDoc4,
        '5': taskDoc5,
      });
    });

    it('should ignore tasks generated in the future', () => {
      const now = moment.valueOf();

      const taskDoc1 = mockTaskDoc('1', now - 1000);
      const taskDoc2 = mockTaskDoc('2', now - 2000);
      const taskDoc3 = mockTaskDoc('3', now + 1500);
      const taskDoc4 = mockTaskDoc('4', now + 300);
      const taskDoc5 = mockTaskDoc('5', now - 200);

      const result = disambiguateTaskDocs([taskDoc1, taskDoc2, taskDoc3, taskDoc4, taskDoc5], moment().valueOf());
      expect(result.duplicates.length).to.equal(0);
      expect(result.winners).to.deep.equal({
        '1': taskDoc1,
        '2': taskDoc2,
        '5': taskDoc5,
      });
    });

    it('should determine winners and duplicates when duplicates are present', () => {
      clock = sinon.useFakeTimers();
      const now = moment().valueOf();

      const tasks = [
        mockTaskDoc('em1', now - 1000, { _id: 1, state: 'Completed' }),
        mockTaskDoc('em1', now - 4000, { _id: 2, state: 'Draft' }),
        mockTaskDoc('em2', now - 1000, { _id: 3, state: 'Ready' }),
        mockTaskDoc('em1', now - 5000, { _id: 4, state: 'Draft' }),
        mockTaskDoc('em1', now - 4000, { _id: 5, state: 'Ready' }),
        mockTaskDoc('em2', now - 200, { _id: 6, state: 'Completed' }),
        mockTaskDoc('em1', now - 500, { _id: 7, state: 'Ready' }),
        mockTaskDoc('em2', now - 10, { _id: 8, state: 'Cancelled' }),
        mockTaskDoc('em2', now + 2000, { _id: 9, state: 'Ready' }), // future doc ignored
      ];

      const result = disambiguateTaskDocs(tasks, moment().valueOf());
      expect(result.winners).to.have.all.keys('em1', 'em2');
      expect(result.winners.em1).to.deep.equal(mockTaskDoc('em1', now - 500, { _id: 7, state: 'Ready' }));
      expect(result.winners.em2).to.deep.equal(mockTaskDoc('em2', now - 1000, { _id: 3, state: 'Ready' }));

      expect(result.duplicates.length).to.equal(6);
      expect(result.duplicates).to.have.deep.members([
        mockTaskDoc('em1', now - 1000, { _id: 1, state: 'Completed' }),
        mockTaskDoc('em1', now - 4000, { _id: 2, state: 'Draft' }),
        mockTaskDoc('em1', now - 5000, { _id: 4, state: 'Draft' }),
        mockTaskDoc('em1', now - 4000, { _id: 5, state: 'Ready' }),
        mockTaskDoc('em2', now - 200, { _id: 6, state: 'Completed' }),
        mockTaskDoc('em2', now - 10, { _id: 8, state: 'Cancelled' }),
      ]);
    });
  });

  describe('getDeduplicationUpdates', () => {
    const mockTaskDoc = (emissionId, authoredOn = 0, augment = {}) => Object.assign(
      { emission: { _id: emissionId }, stateHistory: [], authoredOn: authoredOn || moment().valueOf() },
      augment
    );
    const getDeduplicationUpdates = refreshRulesEmissionsContact.__get__('getDeduplicationUpdates');

    it('should add Canceled + duplicate state and reason', () => {
      const tasks = [
        mockTaskDoc('em1', 0, { id: 1 }),
        mockTaskDoc('em2', 0, { id: 2 }),
        mockTaskDoc('em3', 0, { id: 3 }),
        mockTaskDoc('em4', 0, { id: 4 }),
      ];

      const stateHistory = [{
        state: 'Cancelled',
        timestamp: 2000,
      }];

      const result = getDeduplicationUpdates(tasks, 2000);
      expect(result.length).to.equal(4);
      expect(result).to.have.deep.members([
        mockTaskDoc('em1', 0, { id: 1, state: 'Cancelled', stateReason: 'duplicate', stateHistory  }),
        mockTaskDoc('em2', 0, { id: 2, state: 'Cancelled', stateReason: 'duplicate', stateHistory  }),
        mockTaskDoc('em3', 0, { id: 3, state: 'Cancelled', stateReason: 'duplicate', stateHistory  }),
        mockTaskDoc('em4', 0, { id: 4, state: 'Cancelled', stateReason: 'duplicate', stateHistory  }),
      ]);
    });

    it('should skip tasks in terminal states', () => {
      const tasks = [
        mockTaskDoc('em1', 0, { id: 1, state: 'Cancelled' }),
        mockTaskDoc('em2', 0, { id: 2 }),
        mockTaskDoc('em3', 0, { id: 3, state: 'Failed' }),
        mockTaskDoc('em4', 0, { id: 4 }),
      ];

      const stateHistory = [{
        state: 'Cancelled',
        timestamp: 5000,
      }];

      const result = getDeduplicationUpdates(tasks, 5000);
      expect(result.length).to.equal(2);
      expect(result).to.have.deep.members([
        mockTaskDoc('em2', 0, { id: 2, state: 'Cancelled', stateReason: 'duplicate', stateHistory  }),
        mockTaskDoc('em4', 0, { id: 4, state: 'Cancelled', stateReason: 'duplicate', stateHistory  }),
      ]);
    });
  });

  describe('integration', () => {
    const userDoc = {};
    const NOW = 11430000000;

    beforeEach(() => {
      const isInitialized = RulesEmitter.initialize(chtRulesSettings(), userDoc);
      expect(isInitialized).to.be.true;
      refreshRulesEmissionsContact.__set__('rulesEmitter', RulesEmitter);
      clock = sinon.useFakeTimers(NOW);
    });

    afterEach(() => {
      RulesEmitter.shutdown();
      clock.restore();
      sinon.restore();
    });

    it('cht scenario', async () => {
      const startDate = moment('2000-01-01');
      clock = sinon.useFakeTimers(startDate.valueOf());

      const refreshData = {
        contactDocs: [chtDocs.contact],
        reportDocs: [chtDocs.pregnancyReport],
      };

      const firstResult = await refreshRulesEmissionsContact(refreshData);
      expectUniqueIds(firstResult.updatedTaskDocs);

      expect(firstResult.updatedTaskDocs.length).to.eq(1);
      expect(firstResult.updatedTaskDocs[0]).to.nested.include({
        type: 'task',
        state: 'Ready',
        'emission._id': 'pregReport~pregnancy-facility-visit-reminder~anc.facility_reminder',
      });

      // one second later, it gets cancelled because the pregnancy report is gone
      const secondData = {
        contactDocs: [chtDocs.contact],
        reportDocs: [],
        taskDocs: firstResult.updatedTaskDocs,
      };
      firstResult.updatedTaskDocs[0]._rev = '1_';
      clock = sinon.useFakeTimers(startDate.valueOf() + 1000);
      const secondResult = await refreshRulesEmissionsContact(secondData);
      expect(secondResult.updatedTaskDocs.length).to.eq(1);
      expect(secondResult.updatedTaskDocs[0]).to.nested.include({
        type: 'task',
        state: 'Cancelled',
        'emission._id': 'pregReport~pregnancy-facility-visit-reminder~anc.facility_reminder',
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
        taskDocs: secondResult.updatedTaskDocs,
      };
      clock = sinon.useFakeTimers(startDate.clone().add(1, 'year').valueOf());
      const thirdResult = await refreshRulesEmissionsContact(thirdData);
      expect(firstResult.updatedTaskDocs[0]._id).to.not.eq(thirdResult.updatedTaskDocs[0]._id);
      expect(thirdResult.updatedTaskDocs[0]._rev).to.be.undefined;
      expect(thirdResult.updatedTaskDocs.length).to.eq(1);
      expect(thirdResult.updatedTaskDocs[0]).to.nested.include({
        type: 'task',
        state: 'Ready',
        'emission._id': 'pregReport~pregnancy-facility-visit-reminder~anc.facility_reminder',
      });
    });

    it('should handle multiple device scenario', async () => {
      const dupeTaskWithDifferntTimestamp = (task, newTimestamp) => {
        const oldTimestamp = task.authoredOn;

        const newTask = JSON.parse(JSON.stringify(task));
        newTask._id = newTask._id.replace(oldTimestamp, newTimestamp);
        newTask.authoredOn = newTimestamp;
        newTask.stateHistory[0].timestamp = newTimestamp;

        return newTask;
      };

      const startDate = moment('2000-01-01');
      clock = sinon.useFakeTimers(startDate.valueOf());

      const refreshData = {
        contactDocs: [chtDocs.contact],
        reportDocs: [chtDocs.pregnancyReport],
      };

      const firstResult = await refreshRulesEmissionsContact(refreshData);
      expectUniqueIds(firstResult.updatedTaskDocs);

      expect(firstResult.updatedTaskDocs.length).to.eq(1);
      expect(firstResult.updatedTaskDocs[0]).to.nested.include({
        type: 'task',
        state: 'Ready',
        'emission._id': 'pregReport~pregnancy-facility-visit-reminder~anc.facility_reminder',
      });

      // two seconds later, we get the same task from another device
      clock = sinon.useFakeTimers(startDate.valueOf() + 2000);

      const externalTask1 = dupeTaskWithDifferntTimestamp(firstResult.updatedTaskDocs[0], startDate.valueOf() + 1000);
      const externalTask2 = dupeTaskWithDifferntTimestamp(firstResult.updatedTaskDocs[0], startDate.valueOf() + 200);

      const secondData = {
        contactDocs: [chtDocs.contact],
        reportDocs: [chtDocs.pregnancyReport],
        taskDocs: [ ...firstResult.updatedTaskDocs, externalTask1, externalTask2 ],
      };
      const secondResult = await refreshRulesEmissionsContact(secondData);
      expect(secondResult.updatedTaskDocs.length).to.equal(2);
      // first task and last task are cancelled because they are older
      expect(secondResult.updatedTaskDocs[0]).to.deep.equal(firstResult.updatedTaskDocs[0]);
      expect(secondResult.updatedTaskDocs[0]).to.nested.include({
        type: 'task',
        state: 'Cancelled',
        stateReason: 'duplicate',
        'emission._id': 'pregReport~pregnancy-facility-visit-reminder~anc.facility_reminder',
      });
      expect(secondResult.updatedTaskDocs[1]).to.deep.equal(externalTask2);
      expect(secondResult.updatedTaskDocs[1]).to.nested.include({
        type: 'task',
        state: 'Cancelled',
        stateReason: 'duplicate',
        'emission._id': 'pregReport~pregnancy-facility-visit-reminder~anc.facility_reminder',
      });

      clock = sinon.useFakeTimers(startDate.valueOf() + 3000);
      const thirdData = {
        contactDocs: [chtDocs.contact],
        reportDocs: [chtDocs.pregnancyReport],
        taskDocs: [ ...secondResult.updatedTaskDocs, externalTask1 ],
      };

      const thirdResult = await refreshRulesEmissionsContact(thirdData);
      // tasks are not cancelled a second time
      expect(thirdResult.updatedTaskDocs.length).to.equal(0);
    });
  });
});

const expectUniqueIds = ids => {
  const docIds = ids.map(doc => doc._id);
  expect(docIds).to.deep.eq(Array.from(new Set(docIds)));
};
