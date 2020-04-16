describe('TasksForContact service', function() {
  'use strict';

  const { assert, expect } = chai;

  let fetchTaskDocsFor;
  let rulesEngineIsEnabled;
  let service;

  const docId = 'dockyMcDocface';
  const PERSON_TYPE = { id: 'person', person: true, parents: ['clinic'] };
  const CLINIC_TYPE = { id: 'clinic', parents: ['health_center'] };
  const HEALTH_CENTER_TYPE = { id: 'health_center' };

  beforeEach(function() {
    module('inboxApp');

    rulesEngineIsEnabled = sinon.stub().resolves(true);
    const contactTypes = [ PERSON_TYPE, CLINIC_TYPE, HEALTH_CENTER_TYPE ];
    fetchTaskDocsFor = sinon.stub();
    module(function($provide) {
      $provide.value('RulesEngine', { isEnabled: rulesEngineIsEnabled, fetchTaskDocsFor });
      $provide.value('ContactTypes', { getAll: sinon.stub().resolves(contactTypes) });
    });

    inject((_TasksForContact_) => { service = _TasksForContact_; });
  });

  const emissionAsDoc = emission => ({ _id: 'task-doc', emission });

  it('does not return tasks if RulesEngine is disabled', async () => {
    rulesEngineIsEnabled.resolves(false);
    const task = emissionAsDoc({ _id: 'aa', contact: { _id: docId } });
    const model = {
      doc: { _id: docId },
      children: [],
      type: PERSON_TYPE
    };
    fetchTaskDocsFor.resolves([task]);

    const tasks = await service(model);
    assert.equal(fetchTaskDocsFor.callCount, 0);
    expect(tasks).to.deep.eq([]);
  });

  for (const contactType of [PERSON_TYPE, CLINIC_TYPE, {}]) {
    it(`displays tasks for contact-type ${contactType.id}`, async () => {
      const task = emissionAsDoc({ _id: 'aa', contact: { _id: docId } });
      
      fetchTaskDocsFor.resolves([task]);
      const model = {
        doc: { _id: docId },
        children: [],
        type: contactType
      };
  
      const tasks = await service(model);
      expect(fetchTaskDocsFor.args).to.deep.eq([[[docId]]]);
      expect(tasks).to.deep.eq([task]);
    });
  }

  for (const contactType of [HEALTH_CENTER_TYPE]) {
    it(`does not display tasks for contact-type ${contactType.id}`, async () => {
      const task = emissionAsDoc({ _id: 'aa', contact: { _id: docId } });
      
      fetchTaskDocsFor.resolves([task]);
      const model = {
        doc: { _id: docId },
        children: [],
        type: contactType,
      };

      const tasks = await service(model);
      assert.equal(fetchTaskDocsFor.callCount, 0);
      expect(tasks).to.deep.eq([]);
    });
  }

  it('flagged as late', async () => {
    const task = emissionAsDoc({_id: 'a', dueDate: 0 });
    fetchTaskDocsFor.resolves([task]);
    const model = { type: PERSON_TYPE, doc: {} };
    const tasks = await service(model);
    expect(tasks[0].emission.overdue).to.eq(true);
  });

  it('sorts tasks by duedate', async () => {
    const first = emissionAsDoc({_id: 'a', dueDate: 0 });
    const second = emissionAsDoc({_id: 'b', dueDate: 1 });
    fetchTaskDocsFor.resolves([second, first]);
    const model = { type: PERSON_TYPE, doc: {} };
    const tasks = await service(model);
    expect(tasks.map(task => task.emission._id)).to.deep.eq(['a', 'b']);
  });
});
