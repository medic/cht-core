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
import { TelemetryService } from '@mm-services/telemetry.service';
import { TourService } from '@mm-services/tour.service';
import { TasksComponent } from '@mm-modules/tasks/tasks.component';
import { NavigationComponent } from '@mm-components/navigation/navigation.component';
import { Selectors } from '@mm-selectors/index';

describe('TasksComponent', () => {
  let getComponent;
  let Changes;
  let RulesEngine;
  let Telemetry;
  let Tour;
  let contactTypesService;
  let clock;
  let store;

  let component: TasksComponent;
  let fixture: ComponentFixture<TasksComponent>;

  beforeEach(async () => {
    Changes = sinon.stub();
    RulesEngine = {
      isEnabled: sinon.stub().resolves(true),
      fetchTaskDocsForAllContacts: sinon.stub().resolves([]),
    };

    Tour = sinon.stub();
    Telemetry = { record: sinon.stub() };
    contactTypesService = {
      includes: sinon.stub(),
    };

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        RouterTestingModule,
      ],
      providers: [
        provideMockStore(),
        { provide: ChangesService, useValue: { subscribe: Changes }},
        { provide: RulesEngineService, useValue: RulesEngine },
        { provide: TelemetryService, useValue: Telemetry },
        { provide: TourService, useValue: { startIfNeeded: TourService } },
        { provide: ContactTypesService, useValue: contactTypesService }
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
    sinon.restore();
    clock?.restore();
  });

  it('initial state before resolving tasks', async () => {
    RulesEngine.isEnabled.callsFake(() => new Promise(() => {}));
    await getComponent();
    expect(component.loading).to.be.true;
    expect(!!component.hasTasks).to.be.false;
    expect(!!component.error).to.be.false;
    expect(!!component.tasksDisabled).to.be.false;

    expect(Tour.callCount).to.eq(0);
  });

  it('task engine is disabled', async () => {
    RulesEngine.isEnabled.resolves(false);

    await new Promise(resolve => {
      sinon.stub(TasksActions.prototype, 'setTasksList').callsFake(resolve);
      getComponent();
    });
    expect(component.loading).to.be.false;
    expect(!!component.hasTasks).to.be.false;
    expect(!!component.error).to.be.false;
    expect(component.tasksDisabled).to.be.true;
  });

  it('task engine throws in initialization', async () => {
    RulesEngine.isEnabled.rejects('error');
    await new Promise(resolve => {
      sinon.stub(TasksActions.prototype, 'setTasksList').callsFake(resolve);
      getComponent();
    });
    expect(component.loading).to.be.false;
    expect(!!component.hasTasks).to.be.false;
    expect(component.error).to.be.true;
    expect(!!component.tasksDisabled).to.be.false;
    expect((<any>TasksActions.prototype.setTasksList).args).to.deep.eq([[[]]]);
  });

  it('tasks render', async () => {
    const now = moment('2020-10-20');
    const futureDate = now.clone().add(3, 'days');
    const pastDate = now.clone().subtract(3, 'days');
    clock = sinon.useFakeTimers(now.valueOf());
    const taskDocs = [
      { _id: '1', emission: { _id: 'e1', dueDate: futureDate.format('YYYY-MM-DD') }},
      { _id: '2', emission: { _id: 'e2', dueDate: pastDate.format('YYYY-MM-DD') }},
    ];
    RulesEngine.fetchTaskDocsForAllContacts.resolves(taskDocs);

    await new Promise(resolve => {
      sinon.stub(TasksActions.prototype, 'setTasksList').callsFake(resolve);
      getComponent();
    });
    expect(component.loading).to.be.false;
    expect(component.tasksDisabled).to.be.false;
    expect(component.hasTasks).to.be.true;
    expect(!!component.error).to.be.false;
    const expectedTasks = [
      { _id: 'e1', dueDate: futureDate.format('YYYY-MM-DD'), overdue: false, date: new Date(futureDate.valueOf()) },
      { _id: 'e2', dueDate: pastDate.format('YYYY-MM-DD'), overdue: true, date: new Date(pastDate.valueOf()) },
    ];
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
    expect(!!component.error).to.be.false;
    expect(RulesEngine.fetchTaskDocsForAllContacts.callCount).to.eq(1);
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

    const changesFeed = Changes.args[0][0];
    expect(!!changesFeed.filter({})).to.be.false;
    expect(changesFeed.filter({ id: 'person', doc: { _id: 'person', type: 'person' }})).to.be.true;
    expect(changesFeed.filter({ id: 'clinic', doc: { _id: 'clinic', type: 'clinic' }})).to.be.true;
    expect(changesFeed.filter({ id: 'report', doc: { _id: 'report', type: 'data_record', form: 'form' }})).to.be.true;
    expect(changesFeed.filter({ id: 'task', doc: { _id: 'task', type: 'task' }})).to.be.true;

    expect(changesFeed.filter({ id: 'foo', doc: { _id: 'a', type: 'data_record', form: undefined }})).to.be.false;
  });

  it('should record telemetry on initial load', async () => {
    await new Promise(resolve => {
      sinon.stub(TasksActions.prototype, 'setTasksList').callsFake(resolve);
      getComponent();
    });

    expect(RulesEngine.fetchTaskDocsForAllContacts.callCount).to.eq(1);
    expect(Telemetry.record.callCount).to.equal(1);
    expect(Telemetry.record.args[0][0]).to.equal('tasks:load');
  });

  it('should should record telemetry on refresh', fakeAsync(async () => {
    sinon.stub(TasksActions.prototype, 'setTasksLoaded');
    RulesEngine.isEnabled.resolves(true);
    await new Promise(resolve => {
      sinon.stub(TasksActions.prototype, 'setTasksList').callsFake(resolve);
      getComponent();
    });

    flush();
    expect((<any>TasksActions.prototype.setTasksLoaded).callCount).to.equal(1);
    expect((<any>TasksActions.prototype.setTasksLoaded).args[0]).to.deep.equal([true]);

    store.overrideSelector(Selectors.getTasksLoaded, true);
    store.refreshState();

    const changesArgs = Changes.args[0][0];
    const change = { doc: { type: 'task' } };
    changesArgs.callback(change);
    tick(2000); // wait for debounced function to fire
    flush();

    expect(RulesEngine.fetchTaskDocsForAllContacts.callCount).to.eq(2);
    expect(Telemetry.record.callCount).to.equal(2);
    expect(Telemetry.record.args[0][0]).to.equal('tasks:load');
    expect(Telemetry.record.args[1][0]).to.equal('tasks:refresh');
  }));

});
