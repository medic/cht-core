const { expect } = require('chai');
const { chtDocs, mockEmission, MS_IN_DAY, chtRulesSettings } = require('./mocks');
const moment = require('moment');
const rewire = require('rewire');
const sinon = require('sinon');

const RulesEmitter = require('../src/rules-emitter');
const refreshRulesEmissionsContact = rewire('../src/refresh-rules-emissions');

describe('refresh-rules-emissions', () => {
  describe('with mock emitter', () => {
    const NOW = 100000;
    let rulesEmitter;

    beforeEach(() => {
      rulesEmitter = {
        getEmissionsFor: sinon.stub(),
      };
      refreshRulesEmissionsContact.__set__('rulesEmitter', rulesEmitter);
      sinon.useFakeTimers(NOW);
    });

    afterEach(() => {
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
      
      sinon.useFakeTimers(moment('2000-01-01').valueOf());
      const emission = mockEmission(0);
      rulesEmitter.getEmissionsFor.resolves({ tasks: [emission], targets: [] });
      const actual = await refreshRulesEmissionsContact({ contactDocs: [contactDoc] });
      expect(actual.updatedTaskDocs.length).to.eq(1);
      expect(actual.updatedTaskDocs[0].authoredOn).to.eq(Date.now());

      // rewind one year
      sinon.useFakeTimers(moment('1999-01-01').valueOf());
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
      sinon.useFakeTimers(NOW + MS_IN_DAY);
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

  describe('integration', () => {
    const userDoc = {};
    const NOW = 11430000000;

    beforeEach(() => {
      const isInitialized = RulesEmitter.initialize(chtRulesSettings(), userDoc);
      expect(isInitialized).to.be.true;
      refreshRulesEmissionsContact.__set__('rulesEmitter', RulesEmitter);
      sinon.useFakeTimers(NOW);
    });

    afterEach(() => {
      RulesEmitter.shutdown();
      sinon.restore();
    });

    it('cht scenario', async () => {
      const startDate = moment('2000-01-01');
      sinon.useFakeTimers(startDate.valueOf());

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
      sinon.useFakeTimers(startDate.valueOf() + 1000);
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
      sinon.useFakeTimers(startDate.clone().add(1, 'year').valueOf());
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
  });
});

const expectUniqueIds = ids => {
  const docIds = ids.map(doc => doc._id);
  expect(docIds).to.deep.eq(Array.from(new Set(docIds)));
};
