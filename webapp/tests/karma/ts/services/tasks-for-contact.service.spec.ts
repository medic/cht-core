import { TestBed } from '@angular/core/testing';
import { expect, assert } from 'chai';
import sinon from 'sinon';

import { TasksForContactService } from '@mm-services/tasks-for-contact.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';

describe('TasksForContact service', () => {

  let rulesEngineService;
  let fetchTaskDocsFor;
  let rulesEngineIsEnabled;
  let contactTypesService;
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
    };
    contactTypesService.isLeafPlaceType.withArgs([CLINIC_TYPE], CLINIC_TYPE.id).returns(true);
    rulesEngineService = {
      isEnabled: rulesEngineIsEnabled,
      fetchTaskDocsFor,
      fetchTasksBreakdown: sinon.stub(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ContactTypesService, useValue: contactTypesService },
        { provide: RulesEngineService, useValue: rulesEngineService },
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

    it('should return undefined when type is not a leaf type or person type', async () => {
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
});
