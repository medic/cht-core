import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { TelemetryService } from '@mm-services/telemetry.service';
import { GlobalActions } from '@mm-actions/global';
import { TasksActions} from '@mm-actions/tasks';
import { Selectors } from '@mm-selectors/index';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { TasksForContactService } from '@mm-services/tasks-for-contact.service';
import { ContactViewModelGeneratorService } from '@mm-services/contact-view-model-generator.service';
import { TasksGroupComponent } from '@mm-modules/tasks/tasks-group.component';
import { NavigationComponent } from '@mm-components/navigation/navigation.component';

describe('TasksGroupComponent', () => {
  let component:TasksGroupComponent;
  let fixture: ComponentFixture<TasksGroupComponent>;

  let compileComponent;

  let router;
  let store;
  let contactTypesService;
  let contactViewModelGeneratorService;
  let lineageModelGeneratorService;
  let telemetryService;
  let tasksForContactService;

  beforeEach(() => {
    const mockedSelectors = [
      { selector: Selectors.getLastCompletedTask, value: null },
    ];
    contactTypesService = {
      getLeafPlaceTypes: sinon.stub(),
      getTypeId: sinon.stub(),
      isLeafPlaceType: sinon.stub(),
    };
    contactViewModelGeneratorService = {
      getContact: sinon.stub(),
      loadChildren: sinon.stub(),
    };
    lineageModelGeneratorService = {
      contact: sinon.stub().resolves({}),
    };
    telemetryService = { record: sinon.stub() };
    tasksForContactService = {
      get: sinon.stub(),
      getTasksBreakdown: sinon.stub(),
    };

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        RouterTestingModule,
      ],
      declarations: [ TasksGroupComponent, NavigationComponent, ],
      providers: [
        provideMockStore({ selectors: mockedSelectors }),
        { provide: ContactTypesService, useValue: contactTypesService },
        { provide: ContactViewModelGeneratorService, useValue: contactViewModelGeneratorService },
        { provide: LineageModelGeneratorService, useValue: lineageModelGeneratorService },
        { provide: TelemetryService, useValue: telemetryService },
        { provide: TasksForContactService, useValue: tasksForContactService },
      ],
    });

    store = TestBed.inject(MockStore);
    compileComponent = (lastCompletedTask, tasks, contact) => {
      store.overrideSelector(Selectors.getLastCompletedTask, lastCompletedTask);
      return TestBed.compileComponents().then(() => {
        fixture = TestBed.createComponent(TasksGroupComponent);

        // don't mock the whole routing module, in order to test that the route tree is computed correctly
        router = TestBed.inject(Router);
        sinon.stub(router, 'navigate');

        component = fixture.componentInstance;
        fixture.detectChanges();
        return fixture.whenStable();
      });
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should unsubscribe and clear state on destroy', async () => {
    await compileComponent();
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscription, 'unsubscribe');
    const clearNavigation = sinon.stub(GlobalActions.prototype, 'clearNavigation');
    const setLoadingContent = sinon.stub(GlobalActions.prototype, 'setLoadingContent');
    const setShowContent = sinon.stub(GlobalActions.prototype, 'setShowContent');
    const clearTaskGroup = sinon.stub(TasksActions.prototype, 'clearTaskGroup');

    component.ngOnDestroy();
    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
    expect(clearNavigation.callCount).to.equal(1);
    expect(setLoadingContent.callCount).to.equal(1);
    expect(setLoadingContent.args[0]).to.deep.equal([false]);
    expect(setShowContent.callCount).to.equal(1);
    expect(setLoadingContent.args[0]).to.deep.equal([false]);
    expect(clearTaskGroup.callCount).to.equal(1);
    expect(clearTaskGroup.args[0]).to.deep.equal([null]);
  });

  describe('ngOnInit', () => {
    it('should set navigation and subscribe to store', async () => {
      const setNavigation = sinon.stub(GlobalActions.prototype, 'setNavigation');
      const setShowContent = sinon.stub(GlobalActions.prototype, 'setShowContent');
      const setLoadingContent = sinon.stub(GlobalActions.prototype, 'setLoadingContent');
      const setPreventNavigation = sinon.stub(GlobalActions.prototype, 'setPreventNavigation');
      const setTitle = sinon.stub(GlobalActions.prototype, 'setTitle');

      await compileComponent();

      expect(setNavigation.callCount).to.equal(1);
      expect(setNavigation.args[0][0]).to.include({
        preventNavigation: undefined,
        cancelTranslationKey: 'tasks.group.leave',
        recordTelemetry: 'tasks:group:modal:',
      });
      const cancelCallback = setNavigation.args[0][0].cancelCallback;

      expect(setShowContent.args).to.deep.equal([[true]]);
      expect(setLoadingContent.args).to.deep.equal([[true]]);
      expect(setTitle.args).to.deep.equal([['tasks.group.title']]);
      expect(setPreventNavigation.callCount).to.equal(0);
      expect(router.navigate.callCount).to.equal(0);

      cancelCallback();

      expect(setPreventNavigation.callCount).to.equal(1);
      expect(setPreventNavigation.args[0]).to.deep.equal([false]);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/tasks']]);
    });

    it('should only load group tasks once', async () => {
      const lastCompletedTask = {
        actions: [{
          content: { contact: { _id: 'the_contact' } },
        }],
      };
      await compileComponent(lastCompletedTask);

      expect(contactTypesService.getLeafPlaceTypes.callCount).to.equal(1);
      store.overrideSelector(Selectors.getLoadingContent, true);
      store.refreshState();

      await Promise.resolve();

      expect(contactTypesService.getLeafPlaceTypes.callCount).to.equal(1);
      expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
    });

    describe('when lastCompletedTask is malformed', () => {
      let navigationCancel;
      beforeEach(() => {
        navigationCancel = sinon.stub(GlobalActions.prototype, 'navigationCancel');
      });

      it('with no actions', async (async () => {
        await compileComponent({});

        expect(lineageModelGeneratorService.contact.callCount).to.equal(0);
        expect(navigationCancel.callCount).to.equal(1);
      }));

      it('with action, with no content', async( async () => {
        await compileComponent({ actions: {} });

        expect(lineageModelGeneratorService.contact.callCount).to.equal(0);
        expect(navigationCancel.callCount).to.equal(1);
      }));

      it('with action, with no contact', async(async () => {
        await compileComponent({ actions: { content: {} } });

        expect(lineageModelGeneratorService.contact.callCount).to.equal(0);
        expect(navigationCancel.callCount).to.equal(1);
      }));

      it('with action, with no contact id', async(async () => {
        await compileComponent({ actions: { content: { contact: { } } } });

        expect(lineageModelGeneratorService.contact.callCount).to.equal(0);
        expect(navigationCancel.callCount).to.equal(1);
      }));
    });
  });

  describe('getTasks', () => {
    it('should redirect to tasks page when lastCompletedTask is not defined', async(async () => {
      const navigationCancel = sinon.stub(GlobalActions.prototype, 'navigationCancel');
      await compileComponent();

      expect(lineageModelGeneratorService.contact.callCount).to.equal(0);
      expect(navigationCancel.callCount).to.equal(1);
    }));

    it('should redirect to tasks page when leaf type place was not found in task owner lineage', async(async () => {
      const navigationCancel = sinon.stub(GlobalActions.prototype, 'navigationCancel');
      const lastCompletedTask = { actions: [{ content: { contact: { _id: 'contact' } } }] };
      const contact = { _id: 'the_contact', type: 'health_center', parent: { _id: 'district' } };
      const district = { _id: 'district', type: 'district_hospital' };
      const leafPlaceTypes = [{ id: 'clinic' }];

      contactTypesService.getLeafPlaceTypes.resolves(leafPlaceTypes);
      contactTypesService.getTypeId.callsFake(c => c.type);
      contactTypesService.isLeafPlaceType.returns(false);
      lineageModelGeneratorService.contact.resolves({ doc: contact, lineage: [district] });

      await compileComponent(lastCompletedTask);

      expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
      expect(lineageModelGeneratorService.contact.args[0]).to.deep.equal(['contact']);

      expect(contactTypesService.getTypeId.callCount).to.equal(2);
      expect(contactTypesService.getTypeId.args).to.deep.equal([[contact], [district]]);
      expect(contactTypesService.isLeafPlaceType.callCount).to.equal(2);
      expect(contactTypesService.isLeafPlaceType.args).to.deep.equal([
        [leafPlaceTypes, 'health_center'],
        [leafPlaceTypes, 'district_hospital'],
      ]);
      expect(contactViewModelGeneratorService.getContact.callCount).to.equal(0);
      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(0);
      expect(navigationCancel.callCount).to.equal(1);
      expect(component.tasks).to.deep.equal([]);
    }));

    it('should redirect to tasks page when there are no tasks to display, should record telemetry', async(async () => {
      const navigationCancel = sinon.stub(GlobalActions.prototype, 'navigationCancel');
      const lastCompletedTask = { actions: [{ content: { contact: { _id: 'the_contact' } } }] };
      const contact = { _id: 'the_contact', type: 'person', parent: { _id: 'clinic' } };
      const clinic = { _id: 'clinic', type: 'clinic' };
      const leafPlaceTypes = [{ id: 'clinic' }];
      const contactModel = {
        type: { _id: 'clinic' },
        doc: clinic,
      };

      contactTypesService.getLeafPlaceTypes.resolves(leafPlaceTypes);
      contactTypesService.getTypeId.callsFake(c => c.type);
      contactTypesService.isLeafPlaceType
        .withArgs(leafPlaceTypes, 'person').returns(false)
        .withArgs(leafPlaceTypes, 'clinic').returns(true);
      lineageModelGeneratorService.contact.resolves({ doc: contact, lineage: [clinic] });
      contactViewModelGeneratorService.getContact.resolves(contactModel);
      contactViewModelGeneratorService.loadChildren.resolves({ some: 'children' });
      tasksForContactService.get.resolves([]);
      tasksForContactService.getTasksBreakdown.resolves({
        Ready: 0,
        Cancelled: 2,
        Draft: 12,
        Failed: 3,
      });

      await compileComponent(lastCompletedTask);

      expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
      expect(lineageModelGeneratorService.contact.args[0]).to.deep.equal([contact._id]);

      expect(contactTypesService.getTypeId.callCount).to.equal(2);
      expect(contactTypesService.getTypeId.args).to.deep.equal([[contact], [clinic]]);
      expect(contactTypesService.isLeafPlaceType.callCount).to.equal(2);
      expect(contactTypesService.isLeafPlaceType.args).to.deep.equal([
        [leafPlaceTypes, 'person'],
        [leafPlaceTypes, 'clinic'],
      ]);

      expect(contactViewModelGeneratorService.getContact.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.getContact.args[0]).to.deep.equal([clinic._id]);
      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.loadChildren.args[0]).to.deep.equal([contactModel]);
      expect(contactModel).to.deep.equal({
        type: { _id: 'clinic' },
        doc: clinic,
        children: { some: 'children' },
      });
      expect(tasksForContactService.get.callCount).to.equal(1);
      expect(tasksForContactService.getTasksBreakdown.callCount).to.equal(1);

      expect(navigationCancel.callCount).to.equal(1);
      expect(component.tasks).to.deep.equal([]);

      await Promise.resolve();

      expect(telemetryService.record.callCount).to.equal(3);
      expect(telemetryService.record.args).to.deep.equal([
        ['tasks:group:all-tasks', 17 ],
        ['tasks:group:cancelled', 2 ],
        ['tasks:group:ready', 0],
      ]);
    }));

    it('should display tasks for correct place when lastCompletedTask owner is a person contact', async(async () => {
      const navigationCancel = sinon.stub(GlobalActions.prototype, 'navigationCancel');
      const lastCompletedTask = { actions: [{ content: { contact: { _id: 'the_contact' } } }] };
      const contact = { _id: 'the_contact', type: 'person', parent: { _id: 'clinic', parent: { _id: 'hc' } } };
      const clinic = { _id: 'clinic', type: 'clinic', parent: { _id: 'hc' } };
      const healthCenter = { _id: 'hc', type: 'health_center' };
      const leafPlaceTypes = [{ id: 'clinic' }];
      const contactModel = {
        type: { _id: 'clinic' },
        doc: clinic,
      };

      contactTypesService.getLeafPlaceTypes.resolves(leafPlaceTypes);
      contactTypesService.getTypeId.callsFake(c => c.type);
      contactTypesService.isLeafPlaceType
        .withArgs(leafPlaceTypes, 'person').returns(false)
        .withArgs(leafPlaceTypes, 'clinic').returns(true);
      lineageModelGeneratorService.contact.resolves({ doc: contact, lineage: [clinic, healthCenter] });
      contactViewModelGeneratorService.getContact.resolves(contactModel);
      contactViewModelGeneratorService.loadChildren.resolves({ some: 'children' });
      tasksForContactService.get.resolves([
        { _id: 'task1', title: 'a' },
        { _id: 'task2', title: 'a' },
        { _id: 'task3', title: 'b' },
      ]);
      tasksForContactService.getTasksBreakdown.resolves({
        Ready: 3,
        Cancelled: 2,
        Draft: 12,
        Failed: 4,
      });

      await compileComponent(lastCompletedTask);

      expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
      expect(lineageModelGeneratorService.contact.args[0]).to.deep.equal([contact._id]);

      expect(contactTypesService.getTypeId.callCount).to.equal(2);
      expect(contactTypesService.getTypeId.args).to.deep.equal([[contact], [clinic]]);
      expect(contactTypesService.isLeafPlaceType.callCount).to.equal(2);
      expect(contactTypesService.isLeafPlaceType.args).to.deep.equal([
        [leafPlaceTypes, 'person'],
        [leafPlaceTypes, 'clinic'],
      ]);
      expect(contactViewModelGeneratorService.getContact.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.getContact.args[0]).to.deep.equal([clinic._id]);
      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.loadChildren.args[0]).to.deep.equal([contactModel]);
      expect(contactModel).to.deep.equal({
        type: { _id: 'clinic' },
        doc: clinic,
        children: { some: 'children' },
      });
      expect(tasksForContactService.get.callCount).to.equal(1);
      expect(tasksForContactService.getTasksBreakdown.callCount).to.equal(1);
      expect(component.tasks).to.deep.equal([
        { _id: 'task1', title: 'a' },
        { _id: 'task2', title: 'a' },
        { _id: 'task3', title: 'b' },
      ]);

      await Promise.resolve();

      expect(telemetryService.record.callCount).to.equal(5);
      expect(telemetryService.record.args).to.deep.equal([
        ['tasks:group:all-tasks', 21 ],
        ['tasks:group:cancelled', 2 ],
        ['tasks:group:ready', 3],
        ['tasks:group:ready:a', 2],
        ['tasks:group:ready:b', 1],
      ]);
      expect(navigationCancel.callCount).to.equal(0);
    }));

    it('should display tasks for the correct place when lastCompletedTask owner is a place contact', async(async () => {
      const navigationCancel = sinon.stub(GlobalActions.prototype, 'navigationCancel');
      const lastCompletedTask = { actions: [{ content: { contact: { _id: 'clinic' } } }] };
      const clinic = { _id: 'clinic', type: 'clinic', parent: { _id: 'hc' } };
      const healthCenter = { _id: 'hc', type: 'health_center' };
      const leafPlaceTypes = [{ id: 'clinic' }];
      const contactModel = {
        type: { _id: 'clinic' },
        doc: clinic,
      };

      contactTypesService.getLeafPlaceTypes.resolves(leafPlaceTypes);
      contactTypesService.getTypeId.callsFake(c => c.type);
      contactTypesService.isLeafPlaceType
        .withArgs(leafPlaceTypes, 'person').returns(false)
        .withArgs(leafPlaceTypes, 'clinic').returns(true);
      lineageModelGeneratorService.contact.resolves({ doc: clinic, lineage: [healthCenter] });
      contactViewModelGeneratorService.getContact.resolves(contactModel);
      contactViewModelGeneratorService.loadChildren.resolves({ some: 'children' });
      tasksForContactService.get.resolves([
        { _id: 'task1', title: 'a' },
        { _id: 'task2', title: 'b' },
      ]);
      tasksForContactService.getTasksBreakdown.resolves({
        Ready: 2,
        Cancelled: 2,
        Draft: 12,
        Failed: 4,
      });

      await compileComponent(lastCompletedTask);

      expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
      expect(lineageModelGeneratorService.contact.args[0]).to.deep.equal([clinic._id]);

      expect(contactTypesService.getTypeId.callCount).to.equal(1);
      expect(contactTypesService.getTypeId.args).to.deep.equal([[clinic]]);
      expect(contactTypesService.isLeafPlaceType.callCount).to.equal(1);
      expect(contactTypesService.isLeafPlaceType.args).to.deep.equal([
        [leafPlaceTypes, 'clinic'],
      ]);
      expect(contactViewModelGeneratorService.getContact.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.getContact.args[0]).to.deep.equal([clinic._id]);
      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.loadChildren.args[0]).to.deep.equal([contactModel]);
      expect(contactModel).to.deep.equal({
        type: { _id: 'clinic' },
        doc: clinic,
        children: { some: 'children' },
      });
      expect(tasksForContactService.get.callCount).to.equal(1);
      expect(tasksForContactService.getTasksBreakdown.callCount).to.equal(1);
      expect(component.tasks).to.deep.equal([
        { _id: 'task1', title: 'a' },
        { _id: 'task2', title: 'b' },
      ]);

      await Promise.resolve();

      expect(telemetryService.record.callCount).to.equal(5);
      expect(telemetryService.record.args).to.deep.equal([
        ['tasks:group:all-tasks', 20 ],
        ['tasks:group:cancelled', 2 ],
        ['tasks:group:ready', 2],
        ['tasks:group:ready:a', 1],
        ['tasks:group:ready:b', 1],
      ]);
      expect(navigationCancel.callCount).to.equal(0);
    }));

    it('should log error when getting task owner lineage fails', async (async () => {
      const navigationCancel = sinon.stub(GlobalActions.prototype, 'navigationCancel');
      const lastCompletedTask = { actions: [{ content: { contact: { _id: 'the_contact' } } }] };
      const contact = { _id: 'the_contact', type: 'person', parent: { _id: 'clinic', parent: { _id: 'hc' } } };
      const leafPlaceTypes = [{ id: 'clinic' }];

      contactTypesService.getLeafPlaceTypes.resolves(leafPlaceTypes);
      contactTypesService.getTypeId.callsFake(c => c.type);
      contactTypesService.isLeafPlaceType
        .withArgs(leafPlaceTypes, 'person').returns(false)
        .withArgs(leafPlaceTypes, 'clinic').returns(true);
      lineageModelGeneratorService.contact.rejects({ error: 'boom' });

      await compileComponent(lastCompletedTask);

      expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
      expect(lineageModelGeneratorService.contact.args[0]).to.deep.equal([contact._id]);

      expect(contactTypesService.getTypeId.callCount).to.equal(0);
      expect(contactTypesService.isLeafPlaceType.callCount).to.equal(0);
      expect(contactViewModelGeneratorService.getContact.callCount).to.equal(0);
      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(0);
      expect(tasksForContactService.get.callCount).to.equal(0);

      expect(component.tasks).to.deep.equal([]);
      expect(component.contentError).to.equal(true);
      expect(navigationCancel.callCount).to.equal(0);

      expect(telemetryService.record.callCount).to.equal(0);
    }));

    it('should log error when getting place model fails', async (async () => {
      const navigationCancel = sinon.stub(GlobalActions.prototype, 'navigationCancel');
      const lastCompletedTask = { actions: [{ content: { contact: { _id: 'the_contact' } } }] };
      const contact = { _id: 'the_contact', type: 'person', parent: { _id: 'clinic', parent: { _id: 'hc' } } };
      const clinic = { _id: 'clinic', type: 'clinic', parent: { _id: 'hc' } };
      const healthCenter = { _id: 'hc', type: 'health_center' };
      const leafPlaceTypes = [{ id: 'clinic' }];

      contactTypesService.getLeafPlaceTypes.resolves(leafPlaceTypes);
      contactTypesService.getTypeId.callsFake(c => c.type);
      contactTypesService.isLeafPlaceType
        .withArgs(leafPlaceTypes, 'person').returns(false)
        .withArgs(leafPlaceTypes, 'clinic').returns(true);
      lineageModelGeneratorService.contact.resolves({ doc: contact, lineage: [clinic, healthCenter] });
      contactViewModelGeneratorService.getContact.rejects({ err: 'omg' });

      await compileComponent(lastCompletedTask);

      expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
      expect(contactTypesService.getTypeId.callCount).to.equal(2);
      expect(contactTypesService.isLeafPlaceType.callCount).to.equal(2);
      expect(contactViewModelGeneratorService.getContact.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(0);
      expect(tasksForContactService.get.callCount).to.equal(0);

      expect(component.tasks).to.deep.equal([]);
      expect(component.contentError).to.equal(true);
      expect(navigationCancel.callCount).to.equal(0);

      expect(telemetryService.record.callCount).to.equal(0);
    }));

    it('should log error when getting place model children fails', async (async () => {
      const navigationCancel = sinon.stub(GlobalActions.prototype, 'navigationCancel');
      const lastCompletedTask = { actions: [{ content: { contact: { _id: 'the_contact' } } }] };
      const contact = { _id: 'the_contact', type: 'person', parent: { _id: 'clinic', parent: { _id: 'hc' } } };
      const clinic = { _id: 'clinic', type: 'clinic', parent: { _id: 'hc' } };
      const healthCenter = { _id: 'hc', type: 'health_center' };
      const leafPlaceTypes = [{ id: 'clinic' }];
      const contactModel = {
        type: { _id: 'clinic' },
        doc: clinic,
      };

      contactTypesService.getLeafPlaceTypes.resolves(leafPlaceTypes);
      contactTypesService.getTypeId.callsFake(c => c.type);
      contactTypesService.isLeafPlaceType
        .withArgs(leafPlaceTypes, 'person').returns(false)
        .withArgs(leafPlaceTypes, 'clinic').returns(true);
      lineageModelGeneratorService.contact.resolves({ doc: contact, lineage: [clinic, healthCenter] });
      contactViewModelGeneratorService.getContact.resolves(contactModel);
      contactViewModelGeneratorService.loadChildren.rejects({ some: 'error' });

      await compileComponent(lastCompletedTask);

      expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
      expect(contactTypesService.getTypeId.callCount).to.equal(2);
      expect(contactTypesService.isLeafPlaceType.callCount).to.equal(2);
      expect(contactViewModelGeneratorService.getContact.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
      expect(tasksForContactService.get.callCount).to.equal(0);

      expect(component.tasks).to.deep.equal([]);
      expect(component.contentError).to.equal(true);
      expect(navigationCancel.callCount).to.equal(0);

      expect(telemetryService.record.callCount).to.equal(0);
    }));

    it('should log error when getting tasks fails', async (async () => {
      const navigationCancel = sinon.stub(GlobalActions.prototype, 'navigationCancel');
      const lastCompletedTask = { actions: [{ content: { contact: { _id: 'the_contact' } } }] };
      const contact = { _id: 'the_contact', type: 'person', parent: { _id: 'clinic', parent: { _id: 'hc' } } };
      const clinic = { _id: 'clinic', type: 'clinic', parent: { _id: 'hc' } };
      const healthCenter = { _id: 'hc', type: 'health_center' };
      const leafPlaceTypes = [{ id: 'clinic' }];
      const contactModel = {
        type: { _id: 'clinic' },
        doc: clinic,
      };

      contactTypesService.getLeafPlaceTypes.resolves(leafPlaceTypes);
      contactTypesService.getTypeId.callsFake(c => c.type);
      contactTypesService.isLeafPlaceType
        .withArgs(leafPlaceTypes, 'person').returns(false)
        .withArgs(leafPlaceTypes, 'clinic').returns(true);
      lineageModelGeneratorService.contact.resolves({ doc: contact, lineage: [clinic, healthCenter] });
      contactViewModelGeneratorService.getContact.resolves(contactModel);
      contactViewModelGeneratorService.loadChildren.resolves({ some: 'children' });
      tasksForContactService.get.rejects({ err: true });
      tasksForContactService.getTasksBreakdown.resolves({
        Ready: 3,
        Cancelled: 2,
        Draft: 12,
        Failed: 4,
      });

      await compileComponent(lastCompletedTask);

      expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
      expect(contactTypesService.getTypeId.callCount).to.equal(2);
      expect(contactTypesService.isLeafPlaceType.callCount).to.equal(2);
      expect(contactViewModelGeneratorService.getContact.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
      expect(tasksForContactService.get.callCount).to.equal(1);

      expect(component.tasks).to.deep.equal([]);
      expect(component.contentError).to.equal(true);
      expect(navigationCancel.callCount).to.equal(0);

      expect(telemetryService.record.callCount).to.equal(0);
    }));
  });

  describe('canDeactivate', () => {
    let navigationCancel;
    beforeEach(async () => {
      navigationCancel = sinon.stub(GlobalActions.prototype, 'navigationCancel');
      await compileComponent();
      sinon.resetHistory();
    });

    it('should return true when no tasks', () => {
      store.overrideSelector(Selectors.getCancelCallback, sinon.stub());
      store.overrideSelector(Selectors.getPreventNavigation, true);
      store.refreshState();

      component.tasks = null;
      expect(component.canDeactivate('')).to.equal(true);

      component.tasks = [];
      expect(component.canDeactivate('')).to.equal(true);

      expect(navigationCancel.callCount).to.equal(0);
    });

    it('should return true when no cancel callback', () => {
      component.tasks = [{ _id: 'a' }];
      store.overrideSelector(Selectors.getCancelCallback, null);
      store.overrideSelector(Selectors.getPreventNavigation, true);
      store.refreshState();

      expect(component.canDeactivate('')).to.equal(true);
      expect(navigationCancel.callCount).to.equal(0);
    });

    it('should return true when nav should not be prevented', () => {
      component.tasks = [{ _id: 'a' }];
      store.overrideSelector(Selectors.getCancelCallback, sinon.stub());
      store.overrideSelector(Selectors.getPreventNavigation, false);
      store.refreshState();

      expect(component.canDeactivate('')).to.equal(true);
      expect(navigationCancel.callCount).to.equal(0);
    });

    it('should return true when emission id is part of current tasks', () => {
      component.tasks = [
        undefined,
        { no: 'emission' },
        { no: 'emissionid', emission: {} },
        { emission: { _id: 'emission1' } },
        { emission: { _id: 'emission2' } },
        { emission: { _id: 'emission3' } },
      ];
      store.overrideSelector(Selectors.getCancelCallback, sinon.stub());
      store.overrideSelector(Selectors.getPreventNavigation, true);
      store.refreshState();

      expect(component.canDeactivate('/tasks/emission1')).to.equal(true);
      expect(component.canDeactivate('/tasks/emission2')).to.equal(true);
      expect(component.canDeactivate('/tasks/emission3')).to.equal(true);
      expect(navigationCancel.callCount).to.equal(0);
    });

    it('should return false when there is no emission id', () => {
      component.tasks = [{ _id: 'a' }];
      store.overrideSelector(Selectors.getCancelCallback, sinon.stub());
      store.overrideSelector(Selectors.getPreventNavigation, true);
      store.refreshState();

      expect(component.canDeactivate('/reports')).to.equal(false);
      expect(component.canDeactivate('/reports/test')).to.equal(false);
      expect(component.canDeactivate('/contacts/test')).to.equal(false);

      expect(navigationCancel.callCount).to.equal(3);
      expect(navigationCancel.args).to.deep.equal([
        ['/reports'],
        ['/reports/test'],
        ['/contacts/test'],
      ]);
    });

    it('should return false when emission id is not part of group tasks', () => {
      component.tasks = [
        { emission: { _id: 'emission1' } },
        { emission: { _id: 'emission2' } },
        { emission: { _id: 'emission3' } },
      ];
      store.overrideSelector(Selectors.getCancelCallback, sinon.stub());
      store.overrideSelector(Selectors.getPreventNavigation, true);
      store.refreshState();

      expect(component.canDeactivate('/tasks/emission5')).to.equal(false);
      expect(component.canDeactivate('/tasks/emission6')).to.equal(false);
      expect(component.canDeactivate('/tasks/emission7')).to.equal(false);

      expect(navigationCancel.callCount).to.equal(3);
      expect(navigationCancel.args).to.deep.equal([
        ['/tasks/emission5'],
        ['/tasks/emission6'],
        ['/tasks/emission7'],
      ]);
    });
  });
});
