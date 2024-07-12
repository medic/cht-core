import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import * as moment from 'moment';
import sinon from 'sinon';

import { ChangesService } from '@mm-services/changes.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { TasksActions } from '@mm-actions/tasks';
import { PerformanceService } from '@mm-services/performance.service';
import { TasksComponent } from '@mm-modules/tasks/tasks.component';
import { NavigationComponent } from '@mm-components/navigation/navigation.component';
import { Selectors } from '@mm-selectors/index';
import { NavigationService } from '@mm-services/navigation.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';

describe('TasksComponent', () => {
  let getComponent;
  let changesService;
  let rulesEngineService;
  let performanceService;
  let stopPerformanceTrackStub;
  let contactTypesService;
  let extractLineageService;
  let clock;
  let store;
  let lineageModelGeneratorService;

  let component: TasksComponent;
  let fixture: ComponentFixture<TasksComponent>;

  beforeEach(async () => {
    changesService = { subscribe: sinon.stub().returns({ unsubscribe: sinon.stub() }) };
    rulesEngineService = {
      isEnabled: sinon.stub().resolves(true),
      fetchTaskDocsForAllContacts: sinon.stub().resolves([]),
      contactsMarkedAsDirty: sinon.stub(),
    };
    stopPerformanceTrackStub = sinon.stub();
    performanceService = { track: sinon.stub().returns({ stop: stopPerformanceTrackStub }) };
    contactTypesService = {
      includes: sinon.stub(),
    };
    lineageModelGeneratorService = { reportSubjects: sinon.stub().resolves([]) };
    extractLineageService = {
      getUserLineageToRemove: sinon.stub(),
      removeUserFacility: ExtractLineageService.prototype.removeUserFacility,
    };

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        RouterTestingModule,
      ],
      providers: [
        provideMockStore(),
        { provide: ChangesService, useValue: changesService },
        { provide: RulesEngineService, useValue: rulesEngineService },
        { provide: PerformanceService, useValue: performanceService },
        { provide: ContactTypesService, useValue: contactTypesService },
        { provide: NavigationService, useValue: {} },
        { provide: ExtractLineageService, useValue: extractLineageService },
        { provide: LineageModelGeneratorService, useValue: lineageModelGeneratorService },
      ],
      declarations: [
        TasksComponent,
        NavigationComponent,
      ],
    });

    getComponent = () => {
      return TestBed.compileComponents().then(() => {
        fixture = TestBed.createComponent(TasksComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        fixture.detectChanges();
      });
    };
  });

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
    clock?.restore();
  });

  it('should ngOnDestroy should unsubscribe and clear state', async () => {
    await getComponent();

    const setTasksList = sinon.stub(TasksActions.prototype, 'setTasksList');
    const setTasksLoaded = sinon.stub(TasksActions.prototype, 'setTasksLoaded');
    const clearTaskGroup = sinon.stub(TasksActions.prototype, 'clearTaskGroup');
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscription, 'unsubscribe');

    component.ngOnDestroy();

    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
    expect(setTasksList.callCount).to.equal(1);
    expect(setTasksList.args[0]).to.deep.equal([[]]);
    expect(setTasksLoaded.callCount).to.equal(1);
    expect(setTasksLoaded.args[0]).to.deep.equal([false]);
    expect(clearTaskGroup.callCount).to.equal(1);
  });

  it('initial state before resolving tasks', async () => {
    rulesEngineService.isEnabled.callsFake(() => new Promise(() => {}));
    await getComponent();

    expect(component.loading).to.be.true;
    expect(!!component.hasTasks).to.be.false;
    expect(!!component.errorStack).to.be.false;
    expect(!!component.tasksDisabled).to.be.false;
  });

  it('rules engine is disabled', async () => {
    rulesEngineService.isEnabled.resolves(false);

    await new Promise(resolve => {
      sinon.stub(TasksActions.prototype, 'setTasksList').callsFake(resolve);
      getComponent();
    });

    expect(component.loading).to.be.false;
    expect(!!component.hasTasks).to.be.false;
    expect(!!component.errorStack).to.be.false;
    expect(component.tasksDisabled).to.be.true;
  });

  it('rules engine throws in initialization', async () => {
    const consoleErrorMock = sinon.stub(console, 'error');
    rulesEngineService.isEnabled.rejects('error');

    await new Promise(resolve => {
      sinon.stub(TasksActions.prototype, 'setTasksList').callsFake(resolve);
      getComponent();
    });

    expect(component.loading).to.be.false;
    expect(!!component.hasTasks).to.be.false;
    expect(!!component.errorStack).to.be.true;
    expect(!!component.tasksDisabled).to.be.false;
    expect((<any>TasksActions.prototype.setTasksList).args).to.deep.eq([[[]]]);
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error getting tasks for all contacts');
  });

  it('tasks render', async () => {
    const now = moment('2020-10-20');
    const futureDate = now.clone().add(3, 'days');
    const pastDate = now.clone().subtract(3, 'days');
    clock = sinon.useFakeTimers(now.valueOf());
    const taskDocs = [
      { _id: '1', emission: { _id: 'e1', dueDate: futureDate.format('YYYY-MM-DD') }, owner: 'a' },
      { _id: '2', emission: { _id: 'e2', dueDate: pastDate.format('YYYY-MM-DD') }, owner: 'b' },
    ];
    const expectedTasks = [
      {
        _id: 'e1',
        dueDate: futureDate.format('YYYY-MM-DD'),
        overdue: false,
        date: new Date(futureDate.valueOf()),
        owner: 'a',
      },
      {
        _id: 'e2',
        dueDate: pastDate.format('YYYY-MM-DD'),
        overdue: true,
        date: new Date(pastDate.valueOf()),
        owner: 'b',
      },
    ];

    rulesEngineService.fetchTaskDocsForAllContacts.resolves(taskDocs);
    await new Promise(resolve => {
      sinon.stub(TasksActions.prototype, 'setTasksList').callsFake(resolve);
      getComponent();
    });

    expect(component.loading).to.be.false;
    expect(component.tasksDisabled).to.be.false;
    expect(component.hasTasks).to.be.true;
    expect(!!component.errorStack).to.be.false;
    expect((<any>TasksActions.prototype.setTasksList).args).to.deep.eq([[expectedTasks]]);
  });

  it('rules engine yields no tasks', async () => {
    await new Promise(resolve => {
      sinon.stub(TasksActions.prototype, 'setTasksList').callsFake(resolve);
      getComponent();
    });

    expect(component.loading).to.be.false;
    expect(component.tasksDisabled).to.be.false;
    expect(component.hasTasks).to.be.false;
    expect(!!component.errorStack).to.be.false;
    expect(rulesEngineService.fetchTaskDocsForAllContacts.callCount).to.eq(1);
    expect((<any>TasksActions.prototype.setTasksList).args).to.deep.eq([[[]]]);
  });

  it('changes feed', async () => {
    contactTypesService.includes
      .withArgs(sinon.match({ type: 'person' })).returns(true)
      .withArgs(sinon.match({ type: 'clinic' })).returns(true)
      .withArgs(sinon.match({ type: 'contact' })).returns(true);

    await new Promise(resolve => {
      sinon.stub(TasksActions.prototype, 'setTasksList').callsFake(resolve);
      getComponent();
    });

    const changesFeed = changesService.subscribe.args[0][0];
    expect(!!changesFeed.filter({})).to.be.false;
    expect(changesFeed.filter({ id: 'person', doc: { _id: 'person', type: 'person' }})).to.be.true;
    expect(changesFeed.filter({ id: 'clinic', doc: { _id: 'clinic', type: 'clinic' }})).to.be.true;
    expect(changesFeed.filter({ id: 'report', doc: { _id: 'report', type: 'data_record', form: 'form' }})).to.be.true;
    expect(changesFeed.filter({ id: 'task', doc: { _id: 'task', type: 'task' }})).to.be.true;

    expect(changesFeed.filter({ id: 'foo', doc: { _id: 'a', type: 'data_record', form: undefined }})).to.be.false;
  });

  it('should react to rulesEngine emissions', fakeAsync(async () => {
    await new Promise(resolve => {
      sinon.stub(TasksActions.prototype, 'setTasksList').callsFake(resolve);
      getComponent();
    });

    expect(rulesEngineService.contactsMarkedAsDirty.callCount).to.equal(1);
    expect(rulesEngineService.fetchTaskDocsForAllContacts.callCount).to.equal(1);

    const callback = rulesEngineService.contactsMarkedAsDirty.args[0][0];
    callback();
    tick(1000); // the refresh tasks call is debounced for 1 second

    expect(rulesEngineService.fetchTaskDocsForAllContacts.callCount).to.equal(2);
  }));

  it('should record telemetry on initial load', async () => {
    await new Promise(resolve => {
      sinon.stub(TasksActions.prototype, 'setTasksList').callsFake(resolve);
      getComponent();
    });

    expect(rulesEngineService.fetchTaskDocsForAllContacts.callCount).to.eq(1);
    expect(performanceService.track.calledOnce).to.be.true;
    expect(stopPerformanceTrackStub.calledOnceWith({ name: 'tasks:load', recordApdex: true })).to.be.true;
  });

  it('should should record telemetry on refresh', fakeAsync(async () => {
    sinon.stub(TasksActions.prototype, 'setTasksLoaded');
    rulesEngineService.isEnabled.resolves(true);

    await new Promise(resolve => {
      sinon.stub(TasksActions.prototype, 'setTasksList').callsFake(resolve);
      getComponent();
    });
    flush();

    expect((<any>TasksActions.prototype.setTasksLoaded).callCount).to.equal(1);
    expect((<any>TasksActions.prototype.setTasksLoaded).args[0]).to.deep.equal([true]);

    store.overrideSelector(Selectors.getTasksLoaded, true);
    store.refreshState();

    const changesArgs = changesService.subscribe.args[0][0];
    const change = { doc: { type: 'task' } };
    changesArgs.callback(change);
    tick(2000); // wait for debounced function to fire
    flush();

    expect(rulesEngineService.fetchTaskDocsForAllContacts.callCount).to.eq(2);
    expect(performanceService.track.calledTwice).to.be.true;
    expect(stopPerformanceTrackStub.calledTwice).to.be.true;
    expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({ name: 'tasks:load', recordApdex: true });
    expect(stopPerformanceTrackStub.args[1][0]).to.deep.equal({ name: 'tasks:refresh', recordApdex: true });
    expect((<any>TasksActions.prototype.setTasksLoaded).callCount).to.equal(1);
  }));

  describe('listTrackBy', () => {
    it('should return task id', () => {
      expect(component.listTrackBy(10, { _id: 'aaa' })).to.equal('aaa');
    });
    it('should nullcheck', () => {
      expect(component.listTrackBy(0, false)).to.equal(undefined);
    });
  });

  describe('lineage and breadcrumbs', () => {
    const taskLineages = [
      {
        _id: 'a',
        lineage: [
          { name: 'Amy Johnsons Household' },
          { name: 'St Elmos Concession' },
          { name: 'Chattanooga Village' },
          { name: 'CHW Bettys Area' },
          null,
        ],
      },
      {
        _id: 'b',
        lineage: [
          { name: 'Amy Johnsons Household' },
          { name: 'St Elmos Concession' },
          { name: 'Chattanooga Village' },
          null,
          null,
        ],
      },
    ];
    const taskDocs = [
      { _id: '1', emission: { _id: 'e1', dueDate: '2020-10-20' }, forId: 'a', owner: 'a' },
      { _id: '2', emission: { _id: 'e2', dueDate: '2020-10-20' }, forId: 'b', owner: 'b' },
    ];

    it('should not remove the lineage when user lineage level is undefined', async () => {
      const expectedTasks = [
        {
          _id: 'e1',
          date: moment('2020-10-20').toDate(),
          dueDate: '2020-10-20',
          lineage: [ 'Amy Johnsons Household', 'St Elmos Concession', 'Chattanooga Village', 'CHW Bettys Area' ],
          overdue: true,
          owner: 'a',
        },
        {
          _id: 'e2',
          date: moment('2020-10-20').toDate(),
          dueDate: '2020-10-20',
          lineage: [ 'Amy Johnsons Household', 'St Elmos Concession', 'Chattanooga Village' ],
          overdue: true,
          owner: 'b',
        },
      ];
      extractLineageService.getUserLineageToRemove.resolves(undefined);
      rulesEngineService.fetchTaskDocsForAllContacts.resolves(taskDocs);
      lineageModelGeneratorService.reportSubjects.resolves(taskLineages);

      await new Promise(resolve => {
        sinon.stub(TasksActions.prototype, 'setTasksList').callsFake(resolve);
        getComponent();
      });

      expect(await component.userLineageLevel).to.be.undefined;
      expect((<any>TasksActions.prototype.setTasksList).args).to.deep.equal([[expectedTasks]]);
    });

    it('should remove lineage when user lineage level is defined', async () => {
      const expectedTasks = [
        {
          _id: 'e1',
          date: moment('2020-10-20').toDate(),
          dueDate: '2020-10-20',
          lineage: [ 'Amy Johnsons Household', 'St Elmos Concession', 'Chattanooga Village' ],
          overdue: true,
          owner: 'a',
        },
        {
          _id: 'e2',
          date: moment('2020-10-20').toDate(),
          dueDate: '2020-10-20',
          lineage: [ 'Amy Johnsons Household', 'St Elmos Concession', 'Chattanooga Village' ],
          overdue: true,
          owner: 'b',
        },
      ];
      extractLineageService.getUserLineageToRemove.resolves('CHW Bettys Area');
      rulesEngineService.fetchTaskDocsForAllContacts.resolves(taskDocs);
      lineageModelGeneratorService.reportSubjects.resolves(taskLineages);

      await new Promise(resolve => {
        sinon.stub(TasksActions.prototype, 'setTasksList').callsFake(resolve);
        getComponent();
      });

      expect(await component.userLineageLevel).to.equal('CHW Bettys Area');
      expect((<any>TasksActions.prototype.setTasksList).args).to.deep.equal([[expectedTasks]]);
    });
  });
});
