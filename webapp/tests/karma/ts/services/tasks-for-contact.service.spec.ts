import { TestBed } from '@angular/core/testing';
import { expect, assert } from 'chai';
import sinon from 'sinon';

import { TasksForContactService } from '@mm-services/tasks-for-contact.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';

describe('TasksForContact service', () => {

  let rulesEngineService;
  let fetchTaskDocsFor;
  let rulesEngineIsEnabled;
  let contactTypesService;
  let lineageModelGeneratorService;
  let service: TasksForContactService;

  const docId = 'dockyMcDocface';
  const PERSON_TYPE = { id: 'person', person: true, parents: ['clinic'] };
  const CLINIC_TYPE = { id: 'clinic', parents: ['health_center'] };
  const HEALTH_CENTER_TYPE = { id: 'health_center' };

  beforeEach(() => {
    rulesEngineIsEnabled = sinon.stub().resolves(true);
    fetchTaskDocsFor = sinon.stub();
    contactTypesService = {
      getLeafPlaceTypes: sinon.stub().resolves([CLINIC_TYPE]),
      isLeafPlaceType: sinon.stub().returns(false),
      getTypeId: sinon.stub().callsFake(c => c.type),
      getTypeById: sinon.stub().callsFake((types, typeId) => types.find(t => t.id === typeId)),
    };
    contactTypesService.isLeafPlaceType.withArgs([CLINIC_TYPE], CLINIC_TYPE.id).returns(true);
    rulesEngineService = {
      isEnabled: rulesEngineIsEnabled,
      fetchTaskDocsFor,
      fetchTasksBreakdown: sinon.stub(),
    };
    lineageModelGeneratorService = { contact: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        { provide: ContactTypesService, useValue: contactTypesService },
        { provide: RulesEngineService, useValue: rulesEngineService },
        { provide: LineageModelGeneratorService, useValue: lineageModelGeneratorService },
      ],
    });

    service = TestBed.inject(TasksForContactService);
  });

  const emissionAsDoc = emission => ({ _id: 'task-doc', emission });

  it('get does not return tasks if RulesEngine is disabled', async () => {
    rulesEngineIsEnabled.resolves(false);
    const task = emissionAsDoc({ _id: 'aa', contact: { _id: docId } });
    const model = {
      doc: { _id: docId },
      children: [],
      type: PERSON_TYPE
    };
    fetchTaskDocsFor.resolves([task]);

    const tasks = await service.get(model);
    assert.equal(fetchTaskDocsFor.callCount, 0);
    expect(tasks).to.deep.eq([]);
  });

  for (const contactType of [PERSON_TYPE, CLINIC_TYPE]) {
    it(`get displays tasks for contact-type ${contactType.id}`, async () => {
      const task = emissionAsDoc({ _id: 'aa', contact: { _id: docId } });

      fetchTaskDocsFor.resolves([task]);
      const model = {
        doc: { _id: docId },
        children: [],
        type: contactType
      };

      const tasks = await service.get(model);
      expect(fetchTaskDocsFor.args).to.deep.eq([[[docId]]]);
      expect(tasks).to.deep.eq([task]);
    });
  }

  for (const contactType of [HEALTH_CENTER_TYPE]) {
    it(`get does not display tasks for contact-type ${contactType.id}`, async () => {
      const task = emissionAsDoc({ _id: 'aa', contact: { _id: docId } });

      fetchTaskDocsFor.resolves([task]);
      const model = {
        doc: { _id: docId },
        children: [],
        type: contactType,
      };

      const tasks = await service.get(model);
      assert.equal(fetchTaskDocsFor.callCount, 0);
      expect(tasks).to.deep.eq([]);
    });
  }

  it('get flags task as late', async () => {
    const task = emissionAsDoc({_id: 'a', dueDate: 0 });
    fetchTaskDocsFor.resolves([task]);
    const model = { type: PERSON_TYPE, doc: {} };
    const tasks = await service.get(model);
    expect(tasks[0].emission.overdue).to.eq(true);
  });

  it('get sorts tasks by duedate', async () => {
    const first = emissionAsDoc({_id: 'a', dueDate: 0 });
    const second = emissionAsDoc({_id: 'b', dueDate: 1 });
    fetchTaskDocsFor.resolves([second, first]);
    const model = { type: PERSON_TYPE, doc: {} };
    const tasks = await service.get(model);
    expect(tasks.map(task => task.emission._id)).to.deep.eq(['a', 'b']);
  });

  describe('getTasksBreakdown', () => {
    it('should return undefined when no type', async () => {
      expect(await service.getTasksBreakdown({ })).to.equal(undefined);
      expect(rulesEngineService.fetchTasksBreakdown.callCount).to.equal(0);
    });

    it('should return undefined when rules engine not enabled', async () => {
      rulesEngineIsEnabled.resolves(false);
      expect(await service.getTasksBreakdown({ type: CLINIC_TYPE })).to.equal(undefined);
      expect(rulesEngineService.fetchTasksBreakdown.callCount).to.equal(0);
    });

    it('should return undefined when type is not a leaf place type or person type', async () => {
      expect(await service.getTasksBreakdown({ type: HEALTH_CENTER_TYPE })).to.equal(undefined);
      expect(rulesEngineService.fetchTasksBreakdown.callCount).to.equal(0);
    });

    it('should fetch tasks breakdown for all child contacts for a leaf place type', async () => {
      const model = {
        doc: { _id: docId },
        type: CLINIC_TYPE,
        children: [
          {
            type: PERSON_TYPE,
            contacts: [
              { id: 'person1' },
              { id: 'person2' },
              { id: 'person3' },
            ],
          },
          {
            type: HEALTH_CENTER_TYPE, // this shouldn't happen but nevertheless
            contacts: [{ id: 'no_tasks_4_u' }],
          },
        ],
      };

      const tasksBreakdown = { Ready: 10, Cancelled: 12, Draft: 2, Failed:5 };
      rulesEngineService.fetchTasksBreakdown.resolves({ ...tasksBreakdown });

      expect(await service.getTasksBreakdown(model)).to.deep.equal(tasksBreakdown);
      expect(rulesEngineService.fetchTasksBreakdown.callCount).to.equal(1);
      expect(rulesEngineService.fetchTasksBreakdown.args[0]).to.deep.equal([['person1', 'person2', 'person3', docId]]);
    });
  });

  describe('getLeafPlaceAncestor', () => {
    it('should return false for no contact', async () => {
      expect(await service.getLeafPlaceAncestor(false)).to.equal(false);
      expect(lineageModelGeneratorService.contact.callCount).to.equal(0);
    });

    it('should return false if no doc or no lineage is returned', async () => {
      lineageModelGeneratorService.contact.resolves({});
      expect(await service.getLeafPlaceAncestor('contactId')).to.equal(false);
      expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
      expect(lineageModelGeneratorService.contact.args[0]).to.deep.equal(['contactId', { hydrate: false }]);
    });

    it('should return main doc if is a leaf type place', async () => {
      lineageModelGeneratorService.contact.resolves({
        doc: { _id: 'theclinic', type: 'clinic' },
        lineage: [{ _id: 'thehc', type: 'health_center' }],
      });
      expect(await service.getLeafPlaceAncestor('theclinic')).to.deep.equal({
        doc: { _id: 'theclinic', type: 'clinic' },
        type: CLINIC_TYPE,
      });
      expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
      expect(lineageModelGeneratorService.contact.args[0]).to.deep.equal(['theclinic', { hydrate: false }]);
    });

    it('should return lineage doc leaf type place ', async () => {
      lineageModelGeneratorService.contact.resolves({
        doc: { _id: 'theperson', type: 'person' },
        lineage: [{ _id: 'theclinic', type: 'clinic' }, { _id: 'thehc', type: 'health_center' }],
      });
      expect(await service.getLeafPlaceAncestor('theperson')).to.deep.equal({
        doc: { _id: 'theclinic', type: 'clinic' },
        type: CLINIC_TYPE,
      });
      expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
      expect(lineageModelGeneratorService.contact.args[0]).to.deep.equal(['theperson', { hydrate: false }]);
    });

    it('should return false if no leaf type place is found', async () => {
      lineageModelGeneratorService.contact.resolves({
        doc: { _id: 'theperson', type: 'person' },
        lineage: [{ _id: 'thehc', type: 'health_center' }, { _id: 'thedc', type: 'district' }],
      });
      expect(await service.getLeafPlaceAncestor('theperson')).to.equal(false);
      expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
      expect(lineageModelGeneratorService.contact.args[0]).to.deep.equal(['theperson', { hydrate: false }]);
    });

    it('should throw an error if getting lineage fails', async () => {
      lineageModelGeneratorService.contact.rejects({ error: 'omg' });

      try {
        expect(await service.getLeafPlaceAncestor('id')).to.equal(false);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ error: 'omg' });
      }
    });
  });

  describe('getIdsForTasks', () => {
    it('should only return main contact if of person type', () => {
      const model = {
        doc: { _id: 'contact' },
        type: { person: true },
        children: [
          { type: { person: false }, contacts: [{ id: 'child1' }, { id: 'child2' }] },
          { type: { person: true }, contacts: [{ id: 'child3' }, { id: 'child4' }] },
        ],
      };
      expect(service.getIdsForTasks(model)).to.deep.equal(['contact']);
    });

    it('should return main contact and child person contacts if of place type', () => {
      const model = {
        doc: { _id: 'contact' },
        type: { person: false },
        children: [
          { type: { person: false }, contacts: [{ id: 'child1' }, { id: 'child2' }] },
          { type: { person: true }, contacts: [{ id: 'child3' }, { id: 'child4' }] },
        ],
      };
      expect(service.getIdsForTasks(model)).to.have.deep.members(['contact', 'child3', 'child4']);
    });
  });
});
