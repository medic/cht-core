import { ComponentFixture, TestBed } from '@angular/core/testing';
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
import { ContactTypesService } from '@mm-services/contact-types.service';
import { TasksForContactService } from '@mm-services/tasks-for-contact.service';
import { ContactViewModelGeneratorService } from '@mm-services/contact-view-model-generator.service';
import { TasksGroupComponent } from '@mm-modules/tasks/tasks-group.component';
import { NavigationComponent } from '@mm-components/navigation/navigation.component';
import { ContentRowListItemComponent } from '@mm-components/content-row-list-item/content-row-list-item.component';
import { TaskDueDatePipe } from '@mm-pipes/date.pipe';
import { SettingsService } from '@mm-services/settings.service';

const nextTick = () => new Promise(r => setTimeout(r));

describe('TasksGroupComponent', () => {
  let component:TasksGroupComponent;
  let fixture: ComponentFixture<TasksGroupComponent>;

  let compileComponent;

  let router;
  let store;
  let contactTypesService;
  let contactViewModelGeneratorService;
  let telemetryService;
  let tasksForContactService;

  beforeEach(() => {
    const mockedSelectors = [
      { selector: Selectors.getLastSubmittedTask, value: null },
    ];
    contactTypesService = {
      getLeafPlaceTypes: sinon.stub(),
      getTypeId: sinon.stub(),
      isLeafPlaceType: sinon.stub(),
    };
    contactViewModelGeneratorService = { loadChildren: sinon.stub().resolves() };
    telemetryService = { record: sinon.stub() };
    tasksForContactService = {
      getIdsForTasks: sinon.stub(),
      getTasksBreakdown: sinon.stub().resolves({}),
    };

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        RouterTestingModule,
      ],
      declarations: [ TasksGroupComponent, NavigationComponent, ContentRowListItemComponent, TaskDueDatePipe ],
      providers: [
        provideMockStore({ selectors: mockedSelectors }),
        { provide: ContactTypesService, useValue: contactTypesService },
        { provide: ContactViewModelGeneratorService, useValue: contactViewModelGeneratorService },
        { provide: TelemetryService, useValue: telemetryService },
        { provide: TasksForContactService, useValue: tasksForContactService },
        { provide: SettingsService, useValue: { get: sinon.stub().resolves({}) }}, // used by TaskDueDatePipe
      ],
    });

    store = TestBed.inject(MockStore);
    compileComponent = (lastSubmittedTask?, tasks?, contact?, loadingContact?) => {
      store.overrideSelector(Selectors.getLastSubmittedTask, lastSubmittedTask);
      store.overrideSelector(Selectors.getTasksList, tasks);
      store.overrideSelector(Selectors.getTaskGroupContact, contact);
      store.overrideSelector(Selectors.getTaskGroupLoadingContact, loadingContact);

      return TestBed.compileComponents().then(() => {
        fixture = TestBed.createComponent(TasksGroupComponent);

        // don't mock the whole routing module, in order to test that the route tree is computed correctly
        router = TestBed.inject(Router);
        sinon.stub(router, 'navigate');
        sinon.stub(router, 'getCurrentNavigation');

        component = fixture.componentInstance;
        fixture.detectChanges();
        return fixture.whenStable();
      });
    };
  });

  afterEach(() => {
    store.resetSelectors();
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
    expect(clearTaskGroup.args[0]).to.deep.equal([]);
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
      expect(contactTypesService.getLeafPlaceTypes.callCount).to.equal(1);

      cancelCallback();

      expect(setPreventNavigation.callCount).to.equal(1);
      expect(setPreventNavigation.args[0]).to.deep.equal([false]);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/tasks']]);
    });

    it('should only load contact children once', async () => {
      const lastSubmittedTask = { _id: 'b' };
      const tasks = [
        { _id: 'a', owner: 'a' },
        { _id: 'b', owner: 'the_contact', },
        { _id: 'c', owner: 'a' },
        { _id: 'd', owner: 'a' },
      ];
      const contactModel = {
        doc: { _id: 'contact', type: 'clinic' },
        type: { id: 'clinic' },
      };
      await compileComponent(lastSubmittedTask, tasks);

      expect(contactTypesService.getLeafPlaceTypes.callCount).to.equal(1);
      store.overrideSelector(Selectors.getLoadingContent, true); // nothing happens
      store.refreshState();
      await Promise.resolve();

      expect(contactTypesService.getLeafPlaceTypes.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(0);

      store.overrideSelector(Selectors.getTaskGroupLoadingContact, false);
      store.overrideSelector(Selectors.getTaskGroupContact, contactModel);
      store.refreshState();
      await Promise.resolve();

      expect(contactTypesService.getLeafPlaceTypes.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.loadChildren.args[0]).to.deep.equal([
        {
          doc: { _id: 'contact', type: 'clinic' },
          type: { id: 'clinic' },
        },
      ]);

      store.overrideSelector(Selectors.getTaskGroupLoadingContact, false);
      store.overrideSelector(Selectors.getTaskGroupContact, contactModel);
      store.refreshState();
      await Promise.resolve();

      expect(contactTypesService.getLeafPlaceTypes.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
    });
  });

  describe('loadGroupTasks', () => {
    beforeEach(() => {
      sinon.stub(GlobalActions.prototype, 'navigationCancel');
      sinon.stub(GlobalActions.prototype, 'setNavigation');
      sinon.stub(GlobalActions.prototype, 'setLoadingContent');
    });

    it('should redirect if last completed task is not set', async () => {
      const tasks = [
        { _id: 'a', owner: 'a', title: 'type1' },
        { _id: 'b', owner: 'the_contact', title: 'type2' },
        { _id: 'c', owner: 'b', title: 'type1' },
        { _id: 'd', owner: 'c', title: 'type3' },
      ];
      await compileComponent(null, tasks, { }, false);

      await nextTick();

      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(0);
      expect(tasksForContactService.getIdsForTasks.callCount).to.equal(0);

      expect((<any>GlobalActions.prototype.navigationCancel).callCount).to.equal(1);
      expect((<any>GlobalActions.prototype.setNavigation).callCount).to.equal(1);
      expect((<any>GlobalActions.prototype.setLoadingContent).callCount).to.equal(1);
    });

    it('should wait until contact is no longer loading to set tasks', async () => {
      const lastSubmittedTask = { _id: 'b' };
      const tasks = [
        { _id: 'a', owner: 'a', title: 'type1' },
        { _id: 'b', owner: 'the_contact', title: 'type2' },
        { _id: 'c', owner: 'b', title: 'type1' },
        { _id: 'd', owner: 'c', title: 'type3' },
      ];
      contactViewModelGeneratorService.loadChildren.resolves(['the', 'children']);
      tasksForContactService.getIdsForTasks.returns(['the_contact', 'a', 'b']);
      tasksForContactService.getTasksBreakdown.resolves({
        Ready: 3,
        Cancelled: 2,
        Draft: 12,
        Failed: 3,
      });

      await compileComponent(lastSubmittedTask, tasks, null, true);

      await nextTick();

      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(0);
      expect(tasksForContactService.getIdsForTasks.callCount).to.equal(0);
      expect(component.tasks).to.deep.equal([]);

      expect((<any>GlobalActions.prototype.navigationCancel).callCount).to.equal(0);
      expect((<any>GlobalActions.prototype.setNavigation).callCount).to.equal(1);
      expect((<any>GlobalActions.prototype.setLoadingContent).callCount).to.equal(1);

      const contactModel = {
        doc: { _id: 'contact' },
        type: { id: 'clinic' },
      };
      store.overrideSelector(Selectors.getTaskGroupContact, { ...contactModel });
      store.refreshState();

      await nextTick();

      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(0);
      expect(tasksForContactService.getIdsForTasks.callCount).to.equal(0);
      expect(component.tasks).to.deep.equal([]);
      expect((<any>GlobalActions.prototype.navigationCancel).callCount).to.equal(0);
      expect((<any>GlobalActions.prototype.setNavigation).callCount).to.equal(1);
      expect((<any>GlobalActions.prototype.setLoadingContent).callCount).to.equal(1);

      store.overrideSelector(Selectors.getTaskGroupLoadingContact, false);
      store.refreshState();
      await nextTick();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.loadChildren.args[0]).to.deep.equal([ { ...contactModel } ]);
      expect(tasksForContactService.getIdsForTasks.callCount).to.equal(1);
      expect(tasksForContactService.getIdsForTasks.args[0]).excluding('getChildren$').to.deep.equal([
        {
          ...contactModel,
          children: ['the', 'children'],
        },
      ]);
      expect(component.tasks).to.deep.equal([
        { _id: 'a', owner: 'a', title: 'type1' },
        { _id: 'c', owner: 'b', title: 'type1' },
      ]);

      expect((<any>GlobalActions.prototype.navigationCancel).callCount).to.equal(0);
      expect((<any>GlobalActions.prototype.setNavigation).callCount).to.equal(2);
      expect((<any>GlobalActions.prototype.setNavigation).args[1][0].preventNavigation).to.equal(true);
      expect((<any>GlobalActions.prototype.setLoadingContent).callCount).to.equal(2);
      expect((<any>GlobalActions.prototype.setLoadingContent).args[1]).to.deep.equal([false]);

      expect(tasksForContactService.getTasksBreakdown.callCount).to.equal(1);
      expect(telemetryService.record.callCount).to.equal(4);
      expect(telemetryService.record.args).to.deep.equal([
        ['tasks:group:all-tasks', 19 ],
        ['tasks:group:cancelled', 2 ],
        ['tasks:group:ready', 2],
        ['tasks:group:ready:type1', 2],
      ]);
    });

    it('should work with no loaded contact and not loading', async () => {
      const lastSubmittedTask = { _id: 'b' };
      const tasks = [
        { _id: 'a', owner: 'a' },
        { _id: 'b', owner: 'the_contact', },
        { _id: 'c', owner: 'b' },
        { _id: 'd', owner: 'c' },
      ];
      await compileComponent(lastSubmittedTask, tasks, null, false);
      await nextTick();
      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(0);
      expect(tasksForContactService.getIdsForTasks.callCount).to.equal(0);
      expect((<any>GlobalActions.prototype.navigationCancel).callCount).to.equal(1);

      expect(tasksForContactService.getTasksBreakdown.callCount).to.equal(0);
      expect(telemetryService.record.callCount).to.equal(0);
    });

    it('should redirect when contact is finished loading and no contact is found', async () => {
      const lastSubmittedTask = { _id: 'b' };
      const tasks = [
        { _id: 'a', owner: 'a' },
        { _id: 'b', owner: 'the_contact', },
        { _id: 'c', owner: 'b' },
        { _id: 'd', owner: 'c' },
      ];
      await compileComponent(lastSubmittedTask, tasks, null, true);
      await nextTick();

      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(0);
      expect(tasksForContactService.getIdsForTasks.callCount).to.equal(0);
      expect((<any>GlobalActions.prototype.navigationCancel).callCount).to.equal(0);

      store.overrideSelector(Selectors.getTaskGroupLoadingContact, false);
      store.refreshState();
      await nextTick();

      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(0);
      expect(tasksForContactService.getIdsForTasks.callCount).to.equal(0);
      expect((<any>GlobalActions.prototype.navigationCancel).callCount).to.equal(1);
    });

    it('should redirect when no contact ids are returned (malformed contact)', async () => {
      tasksForContactService.getIdsForTasks.returns([]);

      const lastSubmittedTask = { _id: 'b' };
      const tasks = [
        { _id: 'a', owner: 'a' },
        { _id: 'b', owner: 'the_contact', },
        { _id: 'c', owner: 'b' },
        { _id: 'd', owner: 'c' },
      ];
      const contact = 'not an object';
      await compileComponent(lastSubmittedTask, tasks, contact, false);
      await nextTick();

      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
      expect(tasksForContactService.getIdsForTasks.callCount).to.equal(1);
      expect(component.tasks).to.deep.equal([]);

      expect((<any>GlobalActions.prototype.navigationCancel).callCount).to.equal(1);

      expect(tasksForContactService.getTasksBreakdown.callCount).to.equal(0);
      expect(telemetryService.record.callCount).to.equal(0);
    });

    it('should redirect when there are no tasks to display and record telemetry', async () => {
      tasksForContactService.getTasksBreakdown.resolves({
        Ready: 1,
        Cancelled: 10,
        Draft: 10,
        Failed: 300,
      });
      tasksForContactService.getIdsForTasks.returns(['ct', 'other']);
      const lastSubmittedTask = { _id: 'b' };
      const tasks = [
        { _id: 'a', owner: 'a' },
        { _id: 'b', owner: 'ct', },
        { _id: 'c', owner: 'b' },
        { _id: 'd', owner: 'c' },
      ];
      const contact = { doc: { _id: 'ct' } };
      await compileComponent(lastSubmittedTask, tasks, contact, false);
      await nextTick();

      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
      expect(tasksForContactService.getIdsForTasks.callCount).to.equal(1);

      expect((<any>GlobalActions.prototype.navigationCancel).callCount).to.equal(1);

      await nextTick();

      expect(tasksForContactService.getTasksBreakdown.callCount).to.equal(1);
      expect(telemetryService.record.callCount).to.deep.equal(3);
      expect(telemetryService.record.args).to.deep.equal([
        ['tasks:group:all-tasks', 320],
        ['tasks:group:cancelled', 10],
        ['tasks:group:ready', 0],
      ]);
    });

    it('should redirect when no contact ids are returned (malformed contact)', async () => {
      tasksForContactService.getIdsForTasks.returns([]);

      const lastSubmittedTask = { _id: 'b' };
      const tasks = [
        { _id: 'a', owner: 'a' },
        { _id: 'b', owner: 'the_contact', },
        { _id: 'c', owner: 'b' },
        { _id: 'd', owner: 'c' },
      ];
      const contact = 'not an object';
      await compileComponent(lastSubmittedTask, tasks, contact, false);
      await nextTick();

      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
      expect(tasksForContactService.getIdsForTasks.callCount).to.equal(1);
      expect(component.tasks).to.deep.equal([]);

      expect((<any>GlobalActions.prototype.navigationCancel).callCount).to.equal(1);

      expect(tasksForContactService.getTasksBreakdown.callCount).to.equal(0);
      expect(telemetryService.record.callCount).to.equal(0);
    });

    it('should exclude last completed task from cherry picked task list and filter tasks by owner', async () => {
      tasksForContactService.getTasksBreakdown.resolves({
        Ready: 6,
        Cancelled: 3,
        Draft: 4,
        Failed: 10,
      });

      tasksForContactService.getIdsForTasks.returns(['a', 'b', 'c']);
      contactViewModelGeneratorService.loadChildren.returns({ some: 'children' });
      const tasks = [
        { _id: 'em1', owner: 'a', title: 'title1' },
        { _id: 'em2', owner: 'b', title: 'title1' },
        { _id: 'em3', owner: 'c', title: 'title1' },
        { _id: 'em4', owner: 'd', title: 'title1' },
        { _id: 'em5', owner: 'e', title: 'title1' },
        { _id: 'em6', owner: 'a', title: 'title2' },
        { _id: 'em7', owner: 'b', title: 'title2' },
        { _id: 'em8', owner: 'c', title: 'title2' },
        { _id: 'em9', owner: 'd', title: 'title2' },
        { _id: 'em10', owner: 'e', title: 'title2' },
      ];
      const lastSubmittedTask = { _id: 'em3' };
      const contactModel = { doc: { _id: 'c' }, type: { id: 'clinic' } };
      await compileComponent(lastSubmittedTask, tasks, contactModel, false);

      await nextTick();

      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.loadChildren.args[0]).to.deep.equal([ { ...contactModel } ]);
      expect(tasksForContactService.getIdsForTasks.callCount).to.equal(1);
      expect(component.tasks).to.deep.equal([
        { _id: 'em1', owner: 'a', title: 'title1' },
        { _id: 'em2', owner: 'b', title: 'title1' },
        { _id: 'em6', owner: 'a', title: 'title2' },
        { _id: 'em7', owner: 'b', title: 'title2' },
        { _id: 'em8', owner: 'c', title: 'title2' },
      ]);
      expect((<any>GlobalActions.prototype.setLoadingContent).callCount).to.equal(2);
      expect((<any>GlobalActions.prototype.setLoadingContent).args[1]).to.deep.equal([false]);

      expect((<any>GlobalActions.prototype.navigationCancel).callCount).to.equal(0);

      expect(tasksForContactService.getTasksBreakdown.callCount).to.equal(1);
      expect(tasksForContactService.getTasksBreakdown.args[0]).excluding('getChildren$').to.deep.equal([{
        ...contactModel,
        children: { some: 'children' },
      }]);
      expect(telemetryService.record.callCount).to.equal(5);
      expect(telemetryService.record.args).to.deep.equal([
        ['tasks:group:all-tasks', 22],
        ['tasks:group:cancelled', 3],
        ['tasks:group:ready', 5],
        ['tasks:group:ready:title1', 2],
        ['tasks:group:ready:title2', 3],
      ]);
    });

    it('should update cherry picked tasks when tasks are refreshed, but only record telemetry once', async () => {
      tasksForContactService.getTasksBreakdown.resolves({
        Ready: 5,
        Cancelled: 9,
        Draft: 1,
        Failed: 22,
      });

      tasksForContactService.getIdsForTasks.returns(['contact1', 'contact2']);
      contactViewModelGeneratorService.loadChildren.returns('children');
      const tasks = [
        { _id: 'em1', owner: 'contact1', title: 'type1' },
        { _id: 'em2', owner: 'contact3', title: 'type2' },
        { _id: 'em3', owner: 'contact2', title: 'type3' },
        { _id: 'em4', owner: 'contact5', title: 'type4' },
        { _id: 'em5', owner: 'contact6', title: 'type5' },
        { _id: 'em6', owner: 'contact1', title: 'type6' },
        { _id: 'em7', owner: 'contact3', title: 'type7' },
        { _id: 'em8', owner: 'contact2', title: 'type8' },
        { _id: 'em9', owner: 'contact2', title: 'type9' },
      ];
      const lastSubmittedTask = { _id: 'em3' };
      const contactModel = { doc: { _id: 'contact1' }, type: { id: 'clinic' } };
      await compileComponent(lastSubmittedTask, tasks, contactModel, false);

      await nextTick();

      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
      expect(tasksForContactService.getIdsForTasks.callCount).to.equal(1);
      expect(component.tasks).to.deep.equal([
        { _id: 'em1', owner: 'contact1', title: 'type1' },
        { _id: 'em6', owner: 'contact1', title: 'type6' },
        { _id: 'em8', owner: 'contact2', title: 'type8' },
        { _id: 'em9', owner: 'contact2', title: 'type9' },
      ]);

      const nextTasks = [
        { _id: 'em11', owner: 'contact1', title: 'type1' },
        { _id: 'em12', owner: 'contact3', title: 'type2' },
        { _id: 'em13', owner: 'contact4', title: 'type3' },
        { _id: 'em14', owner: 'contact2', title: 'type4' },
        { _id: 'em15', owner: 'contact5', title: 'type5' },
      ];

      store.overrideSelector(Selectors.getTasksList, nextTasks);
      store.refreshState();
      await nextTick();

      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
      expect(tasksForContactService.getIdsForTasks.callCount).to.equal(2);
      expect(component.tasks).to.deep.equal([
        { _id: 'em11', owner: 'contact1', title: 'type1' },
        { _id: 'em14', owner: 'contact2', title: 'type4' },
      ]);

      await nextTick();

      // telemetry only reporded once
      expect(tasksForContactService.getTasksBreakdown.callCount).to.equal(1);
      expect(tasksForContactService.getTasksBreakdown.args[0]).excluding('getChildren$').to.deep.equal([{
        ...contactModel,
        children: 'children',
      }]);
      expect(telemetryService.record.callCount).to.equal(7);
      expect(telemetryService.record.args).to.deep.equal([
        ['tasks:group:all-tasks', 36],
        ['tasks:group:cancelled', 9],
        ['tasks:group:ready', 4],
        ['tasks:group:ready:type1', 1],
        ['tasks:group:ready:type6', 1],
        ['tasks:group:ready:type8', 1],
        ['tasks:group:ready:type9', 1],
      ]);
    });

    it('should handle errors while loading children', async () => {
      const lastSubmittedTask = { _id: 'em1' };
      const contact = { doc: { _id: 'clinic' } };
      const tasks = [{ _id: 'em1' }, { _id: 'em2' }];

      contactViewModelGeneratorService.loadChildren.rejects({ err: 'omg' });
      await compileComponent(lastSubmittedTask, tasks, contact, false);

      expect(component.tasks).to.deep.equal([]);
      expect(component.contentError).to.equal(true);
      expect((<any>GlobalActions.prototype.navigationCancel).callCount).to.equal(0);
      expect(tasksForContactService.getTasksBreakdown.callCount).to.equal(0);
      expect(telemetryService.record.callCount).to.equal(0);
      expect(tasksForContactService.getIdsForTasks.callCount).to.equal(0);
    });

    it('should handle errors while getting ids for tasks', async () => {
      const lastSubmittedTask = { _id: 'em1' };
      const contact = { doc: { _id: 'clinic' } };
      const tasks = [{ _id: 'em1' }, { _id: 'em2' }];

      contactViewModelGeneratorService.loadChildren.resolves(['children']);
      tasksForContactService.getIdsForTasks.throws({ some: 'error' });
      await compileComponent(lastSubmittedTask, tasks, contact, false);

      expect(component.tasks).to.deep.equal([]);
      expect(component.contentError).to.equal(true);
      expect((<any>GlobalActions.prototype.navigationCancel).callCount).to.equal(0);
      expect(tasksForContactService.getTasksBreakdown.callCount).to.equal(0);
      expect(telemetryService.record.callCount).to.equal(0);
    });
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
        { noid: 'emission' },
        { _id: 'emission1' },
        { _id: 'emission2' },
        { _id: 'emission3' },
      ];
      store.overrideSelector(Selectors.getCancelCallback, sinon.stub());
      store.overrideSelector(Selectors.getPreventNavigation, true);
      store.refreshState();

      router.getCurrentNavigation.returns({ extras: { state: { tab: 'tasks', id: 'emission1' } } });
      expect(component.canDeactivate('/tasks/emission1')).to.equal(true);
      router.getCurrentNavigation.returns({ extras: { state: { tab: 'tasks', id: 'emission2' } } });
      expect(component.canDeactivate('/tasks/emission2')).to.equal(true);
      router.getCurrentNavigation.returns({ extras: { state: { tab: 'tasks', id: 'emission3' } } });
      expect(component.canDeactivate('/tasks/emission3')).to.equal(true);
      expect(navigationCancel.callCount).to.equal(0);
    });

    it('should return false when there is no emission id', () => {
      component.tasks = [{ _id: 'a' }];
      store.overrideSelector(Selectors.getCancelCallback, sinon.stub());
      store.overrideSelector(Selectors.getPreventNavigation, true);
      store.refreshState();

      router.getCurrentNavigation.returns({ extras: { state: {} } });
      expect(component.canDeactivate('/reports')).to.equal(false);
      router.getCurrentNavigation.returns(undefined);
      expect(component.canDeactivate('/reports/test')).to.equal(false);
      router.getCurrentNavigation.returns({ extras: false });
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
        { _id: 'emission1' },
        { _id: 'emission2' },
        { _id: 'emission3' },
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

  describe('listTrackBy', () => {
    it('should return task id', () => {
      expect(component.listTrackBy(10, { _id: 'aaa' })).to.equal('aaa');
    });
    it('should nullcheck', () => {
      expect(component.listTrackBy(0, false)).to.equal(undefined);
    });
  });
});
