import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Store } from '@ngrx/store';
import sinon from 'sinon';
import { assert, expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { DOC_IDS } from '@medic/constants';

import { SessionService } from '@mm-services/session.service';
import { AuthService } from '@mm-services/auth.service';
import { SettingsService } from '@mm-services/settings.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { PerformanceService } from '@mm-services/performance.service';
import { UHCSettingsService } from '@mm-services/uhc-settings.service';
import { UserContactService } from '@mm-services/user-contact.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { ParseProvider } from '@mm-providers/parse.provider';
import { ChangesService } from '@mm-services/changes.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { RulesEngineCoreFactoryService, RulesEngineService } from '@mm-services/rules-engine.service';
import { PipesService } from '@mm-services/pipes.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { TargetInterval } from '@medic/cht-datasource';
import { ReportingPeriod } from '@mm-modules/analytics/analytics-sidebar-filter.component';

describe('RulesEngineService', () => {
  let service: RulesEngineService;
  let authService;
  let sessionService;
  let settingsService;
  let telemetryService;
  let uhcSettingsService;
  let userContactService;
  let userSettingsService;
  let changesService;
  let translateFromService;
  let rulesEngineCoreStubs;
  let pipesService;
  let chtDatasourceService;
  let performanceService;
  let stopPerformanceTrackStub;
  let clock;

  let fetchTasksFor;
  let fetchTasksForRecursive;
  let fetchTasksResult;
  let fetchTargets;
  let fetchTargetsRecursive;
  let fetchTargetsResult;
  let refreshEmissionsFor;
  let refreshEmissionsForRecursive;
  let getTargetInterval;

  const settingsDoc = {
    _id: DOC_IDS.SETTINGS,
    tasks: {
      rules: 'rules',
      schedules: ['schedules'],
      targets: {
        items: [ { id: 'target' } ]
      },
    },
  };
  const userContactGrandparent = { _id: 'grandparent' };
  const userContactDoc = {
    _id: 'user',
    parent: {
      _id: 'parent',
      parent: userContactGrandparent,
    },
  };
  const sampleTaskDoc = {
    _id: 'taskdoc',
    type: 'task',
    owner: 'contact-1234',
    emission: {
      _id: 'emission_id',
      title: 'translate.this',
      priorityLabel: 'and.this',
      other: true,
      dueDate: '2023-10-24',
    },
  };
  const sampleTarget =  {
    id: 'pregnancy-registrations-this-month',
    value: {
      pass: 0,
      total: 0
    }
  };

  const userSettingsDoc = {
    _id: 'org.couchdb.user:username',
    type: 'user-settings',
    roles: [],
  };
  const chtScriptApi = {
    v1: {
      hasPermissions: sinon.stub(),
      hasAnyPermission: sinon.stub()
    }
  };
  const expectedRulesConfig = {
    rules: 'rules',
    taskSchedules: ['schedules'],
    targets: [{ id: 'target' }],
    enableTasks: true,
    enableTargets: true,
    rulesAreDeclarative: false,
    contact: userContactDoc,
    user: userSettingsDoc,
    monthStartDate: 1,
    chtScriptApi
  };

  const realSetTimeout = setTimeout;
  const nextTick = () => new Promise<void>(resolve => realSetTimeout(() => resolve()));

  beforeEach(() => {
    authService = { has: sinon.stub().resolves(true) };
    changesService = { subscribe: sinon.stub().returns({ unsubscribe: sinon.stub() }) };
    sessionService = { isOnlineOnly: sinon.stub().returns(false), userCtx: () => ({ name: 'fred' }) };
    settingsService = { get: sinon.stub().resolves(settingsDoc) };
    translateFromService = { get: sinon.stub().resolves(settingsDoc) };
    userContactService = { get: sinon.stub().resolves(userContactDoc) };
    userSettingsService = { get: sinon.stub().resolves(userSettingsDoc) };
    uhcSettingsService = { getMonthStartDate: sinon.stub().returns(1) };
    telemetryService = { record: sinon.stub() };
    pipesService = {
      pipesMap: new Map(),
      getPipeNameVsIsPureMap: PipesService.prototype.getPipeNameVsIsPureMap
    };
    getTargetInterval = sinon.stub();
    chtDatasourceService = {
      get: sinon.stub().returns(chtScriptApi),
      bind: sinon.stub().returnsArg(0)
    };
    chtDatasourceService.bind.withArgs(TargetInterval.v1.get).returns(getTargetInterval);
    stopPerformanceTrackStub = sinon.stub();
    performanceService = { track: sinon.stub().returns({ stop: stopPerformanceTrackStub }) };
    fetchTasksResult = () => Promise.resolve();
    fetchTasksFor = sinon.stub();
    fetchTasksForRecursive = sinon.stub();
    fetchTasksFor.events = {};
    fetchTasksForRecursive.callsFake((event, fn) => {
      fetchTasksFor.events[event] = fetchTasksFor.events[event] || [];
      fetchTasksFor.events[event].push(fn);
      const promise = fetchTasksResult();
      promise.on = fetchTasksForRecursive;
      return promise;
    });
    fetchTasksFor.returns({ on: fetchTasksForRecursive });

    fetchTargetsResult = sinon.stub().resolves([]);
    fetchTargets = sinon.stub();
    fetchTargets.events = {};
    fetchTargetsRecursive = sinon.stub();
    fetchTargetsRecursive.callsFake((event, fn) => {
      fetchTargets.events[event] = fetchTargets.events[event] || [];
      fetchTargets.events[event].push(fn);
      const promise = fetchTargetsResult();
      promise.on = fetchTargetsRecursive;
      return promise;
    });
    fetchTargets.returns({ on: fetchTargetsRecursive });

    refreshEmissionsFor = sinon.stub();
    refreshEmissionsFor.events = {};
    refreshEmissionsForRecursive = sinon.stub();
    refreshEmissionsForRecursive.callsFake((event, fn) => {
      refreshEmissionsFor.events[event] = refreshEmissionsFor.events[event] || [];
      refreshEmissionsFor.events[event].push(fn);
      const promise = () => Promise.resolve();
      promise.on = refreshEmissionsForRecursive;
      return promise;
    });
    refreshEmissionsFor.returns({ on: refreshEmissionsForRecursive });

    rulesEngineCoreStubs = {
      initialize: sinon.stub().resolves(true),
      isEnabled: sinon.stub().returns(true),
      fetchTasksFor: fetchTasksFor,
      fetchTargets: fetchTargets,
      updateEmissionsFor: sinon.stub().resolves(true),
      rulesConfigChange: sinon.stub().returns(true),
      getDirtyContacts: sinon.stub().returns([]),
      fetchTasksBreakdown: sinon.stub(),
      refreshEmissionsFor: refreshEmissionsFor,
      showTask: sinon.stub().callsFake(doc => doc?.emission?.state === 'Ready'),
    };
    const rulesEngineCoreFactory= { get: () => rulesEngineCoreStubs };

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
      ],
      providers: [
        provideMockStore(),
        ParseProvider,
        ContactTypesService,
        { provide: AuthService, useValue: authService },
        { provide: SessionService, useValue: sessionService },
        { provide: SettingsService, useValue: settingsService },
        { provide: TelemetryService, useValue: telemetryService },
        { provide: PerformanceService, useValue: performanceService },
        { provide: UHCSettingsService, useValue: uhcSettingsService },
        { provide: UserContactService, useValue: userContactService },
        { provide: UserSettingsService, useValue: userSettingsService },
        { provide: ChangesService, useValue: changesService },
        { provide: TranslateFromService, useValue: translateFromService },
        { provide: RulesEngineCoreFactoryService, useValue: rulesEngineCoreFactory },
        { provide: PipesService, useValue: pipesService },
        { provide: CHTDatasourceService, useValue: chtDatasourceService }
      ]
    });
  });

  afterEach(() => {
    sinon.restore();
    clock && clock.restore();
  });

  describe('initialization', () => {
    const expectAsyncToThrow = async (func, include) => {
      try {
        await func();
        assert.fail('Should throw');
      } catch (err) {
        expect(err.name).to.include(include);
      }
    };

    it('should disable when user has no permissions', async () => {
      authService.has.resolves(false);
      rulesEngineCoreStubs.isEnabled.returns(false);
      service = TestBed.inject(RulesEngineService);

      const result = await service.isEnabled();

      expect(result).to.equal(false);
      expect(telemetryService.record.callCount).to.equal(0);
    });

    it('should initialize enableTasks as disabled', async () => {
      authService.has.withArgs('can_view_tasks').resolves(false);
      service = TestBed.inject(RulesEngineService);

      const result = await service.isEnabled();

      expect(result).to.be.true;
      expect(rulesEngineCoreStubs.initialize.callCount).to.equal(1);
      expect(rulesEngineCoreStubs.initialize.args[0][0]).to.nested.include({
        enableTasks: false,
        enableTargets: true,
        user: userSettingsDoc,
        contact: userContactDoc,
      });
      expect(stopPerformanceTrackStub.calledOnce).to.be.true;
      expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({ name: 'rules-engine:initialize' });
    });

    it('should initialize enableTargets as disabled', async () => {
      authService.has.withArgs('can_view_analytics').resolves(false);
      service = TestBed.inject(RulesEngineService);

      const result = await service.isEnabled();

      expect(result).to.be.true;
      expect(rulesEngineCoreStubs.initialize.callCount).to.eq(1);
      expect(rulesEngineCoreStubs.initialize.args[0][0]).to.nested.include({ enableTasks: true, enableTargets: false });
    });

    it('should be disabled for online users', async () => {
      sessionService.isOnlineOnly.returns(true);
      rulesEngineCoreStubs.isEnabled.returns(true);
      service = TestBed.inject(RulesEngineService);

      const result = await service.isEnabled();

      expect(result).to.equal(false);
      expect(telemetryService.record.callCount).to.equal(0);
    });

    it('should be disabled if disabled in rules engine', async () => {
      sessionService.isOnlineOnly.returns(false);
      rulesEngineCoreStubs.isEnabled.returns(false);
      service = TestBed.inject(RulesEngineService);

      const result = await service.isEnabled();

      expect(result).to.equal(false);
      expect(telemetryService.record.callCount).to.equal(0);
    });

    it('should be disabled if initialize throws', async () => {
      rulesEngineCoreStubs.initialize.rejects('error');
      service = TestBed.inject(RulesEngineService);
      await expectAsyncToThrow(() => service.isEnabled(),  'error');
    });

    it('should filter targets by context', async () => {
      const allContexts = { id: 'all' };
      const emptyContext = { id: 'empty', context: '' };
      const matchingContext = { id: 'match', context: 'user.parent._id === "parent"' };
      const noMatchingContext = { id: 'no-match', context: '!!user.dne' };
      const expectedParams = [allContexts.id, emptyContext.id, matchingContext.id];
      const settingsDoc = {
        _id: DOC_IDS.SETTINGS,
        tasks: {
          targets: {
            items: [ allContexts, emptyContext, matchingContext, noMatchingContext ]
          }
        }
      };
      settingsService.get.resolves(settingsDoc);
      service = TestBed.inject(RulesEngineService);

      const result = await service.isEnabled();

      expect(result).to.be.true;
      const targetsResult = rulesEngineCoreStubs.initialize.args[0][0].targets;
      expect(targetsResult.map(t => t.id)).to.deep.eq(expectedParams);
    });

    it('should send parameters to shared-lib', async () => {
      service = TestBed.inject(RulesEngineService);

      const result = await service.isEnabled();

      expect(result).to.be.true;
      expect(rulesEngineCoreStubs.initialize.callCount).to.eq(1);
      expect(rulesEngineCoreStubs.initialize.args[0][0]).to.deep.eq(expectedRulesConfig);
    });

    it('tasks.isDeclarative flag throws an error when false', async () => {
      service = TestBed.inject(RulesEngineService);

      const settingsDoc = {
        _id: DOC_IDS.SETTINGS,
        tasks: {
          rules: 'rules',
          isDeclarative: false,
        },
      };
      settingsService.get.resolves(settingsDoc);
      
      const result = await service.isEnabled();

      expect(result).to.be.true;
      expect(rulesEngineCoreStubs.initialize.callCount).to.eq(1);
      expect(rulesEngineCoreStubs.initialize.args[0][0]).to.include({ rulesAreDeclarative: false });
    });
  });

  const changeFeedFormat = doc => ({ id: doc._id, doc });
  describe('changes feeds', () => {
    const scenarios = [
      {
        doc: { _id: 'person', type: 'person' },
        expected: ['person'],
      },
      {
        doc: { _id: 'contact', type: 'contact', contact_type: 'person' },
        expected: ['contact'],
      },
      {
        doc: { _id: 'report', type: 'data_record', form: 'form', patient_id: 'patient' },
        expected: ['patient'],
      },
    ];

    for (const scenario of scenarios) {
      it(`should trigger update for ${scenario.doc._id}`, fakeAsync(async () => {
        service = TestBed.inject(RulesEngineService);

        const result = await service.isEnabled();
        await service.fetchTargets(); // clear old timers
        stopPerformanceTrackStub.resetHistory();

        expect(result).to.be.true;
        const change = changesService.subscribe.args[0][0];
        expect(change.filter(changeFeedFormat(scenario.doc))).to.be.true;
        await change.callback(changeFeedFormat(scenario.doc));
        tick(2000);
        expect(rulesEngineCoreStubs.updateEmissionsFor.callCount).to.eq(1);
        expect(rulesEngineCoreStubs.updateEmissionsFor.args[0][0]).to.deep.eq(scenario.expected);
        expect(stopPerformanceTrackStub.callCount).to.equal(1);
        expect(stopPerformanceTrackStub.args[0][0])
          .to.deep.equal({ name: 'rules-engine:refresh' });
      }));
    }

    it(`should not trigger`, async () => {
      service = TestBed.inject(RulesEngineService);

      const result = await service.isEnabled();

      expect(result).to.be.true;
      const changeFeed = changesService.subscribe.args[0][0];
      expect(changeFeed.filter({ id: 'id' })).to.be.false;
      expect(changeFeed.filter({ id: 'id', doc: { _id: 'task', type: 'task', requester: 'requester' } })).to.be.false;
      expect(changeFeed.filter(changeFeedFormat({ _id: 'doc' }))).to.be.false;
      expect(changeFeed.filter(changeFeedFormat({ _id: 'a', type: 'data_record', form: undefined }))).to.be.false;
    });

    const cachebustScenarios = [
      { _id: DOC_IDS.SETTINGS, settings: settingsDoc },
      userContactDoc,
      userContactGrandparent,
    ];

    for (const scenarioDoc of cachebustScenarios) {
      it(`bust cache for settings ${scenarioDoc._id}`, async () => {
        service = TestBed.inject(RulesEngineService);

        const result = await service.isEnabled();

        expect(result).to.be.true;
        const change = changeFeedFormat(scenarioDoc);
        const changeFeed = changesService.subscribe.args[1][0];
        expect(changeFeed.filter(change)).to.be.true;
        await changeFeed.callback(change);
        expect(rulesEngineCoreStubs.rulesConfigChange.callCount).to.eq(1);
        expect(rulesEngineCoreStubs.rulesConfigChange.args[0]).to.deep.eq([expectedRulesConfig]);
      });
    }

    it('should not bust cache for unknown id', async () => {
      service = TestBed.inject(RulesEngineService);

      const result = await service.isEnabled();

      expect(result).to.be.true;
      const changeFeed = changesService.subscribe.args[1][0];
      expect(changeFeed.filter({ id: 'id' })).to.be.false;
      expect(changeFeed.filter(changeFeedFormat({ _id: 'task', type: 'task' }))).to.be.false;
    });

    it('should emit when contacts were marked as dirty', fakeAsync(async () => {
      service = TestBed.inject(RulesEngineService);
      await service.isEnabled();
      await service.fetchTargets(); // clear old timers
      stopPerformanceTrackStub.resetHistory();
      telemetryService.record.resetHistory();

      const callback = sinon.stub();
      const subscription = service.contactsMarkedAsDirty(callback);

      const change = changesService.subscribe.args[0][0];
      const doc = { _id: 'doc', type: 'data_record', form: 'theform', fields: { patient_id: '65479' } };
      await change.callback(changeFeedFormat(doc));

      expect(rulesEngineCoreStubs.updateEmissionsFor.callCount).to.equal(0);

      tick(1000);

      expect(rulesEngineCoreStubs.updateEmissionsFor.callCount).to.equal(1);
      expect(rulesEngineCoreStubs.updateEmissionsFor.args[0]).to.deep.equal([['65479']]);

      expect(callback.callCount).to.equal(1);

      subscription.unsubscribe();

      expect(telemetryService.record.calledOnce).to.be.true;
      expect(telemetryService.record.args[0]).to.deep.equal([ 'rules-engine:refresh:dirty-contacts', 1 ]);
      expect(stopPerformanceTrackStub.callCount).to.equal(1);
      expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({ name: 'rules-engine:refresh' });
    }));

    it('should debounce multiple incoming changes', fakeAsync(async () => {
      service = TestBed.inject(RulesEngineService);
      await service.isEnabled();
      await service.fetchTargets(); // clear old timers
      stopPerformanceTrackStub.resetHistory();
      telemetryService.record.resetHistory();

      const callback = sinon.stub();
      const subscription = service.contactsMarkedAsDirty(callback);

      const change = changesService.subscribe.args[0][0];
      await change.callback(changeFeedFormat({ type: 'data_record', form: 'f', fields: { patient_id: 'p1' } }));
      expect(callback.callCount).to.equal(1);
      await change.callback(changeFeedFormat({ _id: '2', type: 'person', patient_id: 'p2' }));
      expect(callback.callCount).to.equal(2);
      tick(500);
      await change.callback(changeFeedFormat({ _id: '3', type: 'person', patient_id: 'p3' }));
      expect(callback.callCount).to.equal(3);
      tick(900);
      await change.callback(changeFeedFormat({ type: 'data_record', form: 'f', fields: { patient_id: 'p3' }}));
      expect(callback.callCount).to.equal(4);

      expect(rulesEngineCoreStubs.updateEmissionsFor.callCount).to.equal(0);

      tick(1000);

      expect(rulesEngineCoreStubs.updateEmissionsFor.callCount).to.equal(1);
      expect(rulesEngineCoreStubs.updateEmissionsFor.args[0][0]).to.have.members([ 'p3', '3', '2', 'p1' ]);
      expect(callback.callCount).to.equal(4);
      subscription.unsubscribe();

      expect(telemetryService.record.calledOnce).to.be.true;
      expect(telemetryService.record.args[0]).to.deep.equal([ 'rules-engine:refresh:dirty-contacts', 4 ]);
      expect(stopPerformanceTrackStub.callCount).to.equal(1);
      expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({ name: 'rules-engine:refresh' });
    }));
  });

  describe('monitorExternalChanges', () => {
    it('should null check and do nothing when no docs', async () => {
      service = TestBed.inject(RulesEngineService);

      await service.monitorExternalChanges();
      expect(rulesEngineCoreStubs.updateEmissionsFor.callCount).to.equal(0);

      await service.monitorExternalChanges({});
      expect(rulesEngineCoreStubs.updateEmissionsFor.callCount).to.equal(0);

      await service.monitorExternalChanges({ docs: [] });
      expect(rulesEngineCoreStubs.updateEmissionsFor.callCount).to.equal(0);

      const docs = [
        { _id: 'report', type: 'data_record' },
        { _id: 'contact', type: 'contact' },
        { _id: 'target', type: 'target' },
        { _id: 'whatever', type: 'whatever' },
      ];
      await service.monitorExternalChanges({ docs });
      expect(rulesEngineCoreStubs.updateEmissionsFor.callCount).to.equal(0);
    });

    it('should only filter tasks and refresh requesters', async () => {
      service = TestBed.inject(RulesEngineService);
      const replicationResult = {
        doc_write_failures: 0,
        docs_read: 6,
        docs_written: 6,
        errors: [],
        ok: true,
        last_seq: 20,
        docs: [
          { _id: 'report1', fields: { patient_id: 'patient' }, type: 'data_record' },
          { _id: 'task~1', emission: { _id: '??' }, requester: 'patient_uuid', type: 'task' },
          { _id: 'contact2', type: 'contact', name: 'C', patient_id: 'patient2' },
          { _id: 'task~2', emission: { _id: '??' }, requester: 'other_patient', type: 'task' },
          { _id: 'task~3', emission: { _id: '!!' }, requester: 'other_patient', type: 'task' },
          { _id: 'report2', fields: { patient_uuid: 'etc' }, type: 'data_record' },
        ]
      };

      await service.monitorExternalChanges(replicationResult);

      expect(rulesEngineCoreStubs.updateEmissionsFor.args[0]).to.deep.equal([['patient_uuid', 'other_patient']]);
      expect(rulesEngineCoreStubs.updateEmissionsFor.callCount).to.equal(1);
    });
  });

  it('fetchTaskDocsForAllContacts() should fetch task for all contacts', async () => {
    const taskDoc = JSON.parse(JSON.stringify(sampleTaskDoc));
    fetchTasksResult = sinon.stub().resolves([taskDoc]);
    rulesEngineCoreStubs.getDirtyContacts.returns(['a', 'b', 'c']);
    service = TestBed.inject(RulesEngineService);

    const actual = await service.fetchTaskDocsForAllContacts();

    expect(rulesEngineCoreStubs.fetchTasksFor.calledOnce).to.be.true;
    expect(rulesEngineCoreStubs.fetchTasksFor.args[0][0]).to.be.undefined;
    expect(actual.length).to.eq(1);
    const actualTask = actual[0];
    expect(actualTask._id).to.equal('taskdoc');
    expect(actualTask.emission.date.toDateString()).to.equal('Tue Oct 24 2023');
    expect(actualTask.emission).to.deep.include({
      _id: 'emission_id',
      title: 'translate.this',
      priorityLabel: 'and.this',
      other: true,
      overdue: true,
      owner: 'contact-1234',
      dueDate: '2023-10-24'
    });
    expect(telemetryService.record.calledOnce).to.be.true;
    expect(telemetryService.record.args[0]).to.deep.equal([ 'rules-engine:tasks:dirty-contacts', 3 ]);
    expect(stopPerformanceTrackStub.callCount).to.equal(3);
    expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({ name: 'rules-engine:initialize' });
    expect(stopPerformanceTrackStub.args[1][0]).to.deep.equal({ name: 'rules-engine:background-refresh:cancel' });
    expect(stopPerformanceTrackStub.args[2][0]).to.deep.equal({ name: 'rules-engine:tasks:all-contacts' });
  });

  it('fetchTaskDocsForAllContacts should wait for contacts to be marked as dirty', fakeAsync(async () => {
    service = TestBed.inject(RulesEngineService);
    await service.isEnabled();
    await service.fetchTargets(); // clear old timers
    stopPerformanceTrackStub.resetHistory();

    const taskDoc = JSON.parse(JSON.stringify(sampleTaskDoc));
    fetchTasksResult = sinon.stub().resolves([taskDoc]);
    rulesEngineCoreStubs.getDirtyContacts.returns(['a', 'b', 'c']);
    service = TestBed.inject(RulesEngineService);

    const callback = sinon.stub();
    const subscription = service.contactsMarkedAsDirty(callback);

    const change = changesService.subscribe.args[0][0];
    await change.callback(changeFeedFormat({ type: 'data_record', form: 'f', fields: { patient_id: 'p1' } }));
    const tasksPromise = service.fetchTaskDocsForAllContacts();
    await change.callback(changeFeedFormat({ _id: '2', type: 'person', patient_id: 'p2' }));
    tick(500);
    expect(rulesEngineCoreStubs.fetchTasksFor.called).to.be.false;
    await change.callback(changeFeedFormat({ _id: '3', type: 'person', patient_id: 'p3' }));
    tick(900);
    expect(rulesEngineCoreStubs.fetchTasksFor.called).to.be.false;
    await change.callback(changeFeedFormat({ type: 'data_record', form: 'f', fields: { patient_id: 'p3' }}));
    expect(rulesEngineCoreStubs.fetchTasksFor.called).to.be.false;

    tick(1000);
    const tasks = await tasksPromise;

    expect(rulesEngineCoreStubs.fetchTasksFor.calledOnce).to.be.true;
    expect(rulesEngineCoreStubs.fetchTasksFor.args[0][0]).to.be.undefined;
    expect(tasks.length).to.eq(1);
    const actualTask = tasks[0];
    expect(actualTask._id).to.equal(taskDoc._id);
    expect(actualTask.emission.date.toDateString()).to.equal('Tue Oct 24 2023');
    expect(actualTask.emission).to.deep.include({
      _id: 'emission_id',
      title: 'translate.this',
      priorityLabel: 'and.this',
      other: true,
      overdue: true,
      owner: 'contact-1234',
      dueDate: '2023-10-24'
    });

    subscription.unsubscribe();
  }));

  it('fetchTaskDocsFor() should fetch task docs', async () => {
    const taskDoc = JSON.parse(JSON.stringify(sampleTaskDoc));
    const contactIds = ['a', 'b', 'c'];
    fetchTasksResult = sinon.stub().resolves([taskDoc]);
    rulesEngineCoreStubs.getDirtyContacts.returns(['a', 'b']);
    service = TestBed.inject(RulesEngineService);

    const actual = await service.fetchTaskDocsFor(contactIds);

    expect(rulesEngineCoreStubs.fetchTasksFor.callCount).to.eq(1);
    expect(rulesEngineCoreStubs.fetchTasksFor.args[0][0]).to.eq(contactIds);
    expect(actual.length).to.eq(1);
    const actualTask = actual[0];
    expect(actualTask._id).to.equal('taskdoc');
    expect(actualTask.emission.date.toDateString()).to.equal('Tue Oct 24 2023');
    expect(actualTask.emission).to.deep.include({
      _id: 'emission_id',
      title: 'translate.this',
      priorityLabel: 'and.this',
      other: true,
      overdue: true,
      owner: 'contact-1234',
      dueDate: '2023-10-24'
    });
    expect(telemetryService.record.calledOnce).to.be.true;
    expect(telemetryService.record.args[0]).to.deep.equal(['rules-engine:tasks:dirty-contacts', 2]);
    expect(stopPerformanceTrackStub.calledTwice).to.be.true;
    expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({ name: 'rules-engine:initialize' });
    expect(stopPerformanceTrackStub.args[1][0]).to.deep.equal({ name: 'rules-engine:tasks:some-contacts' });
  });

  it('fetchTaskDocsFor() should not crash with empty priority label', async () => {
    const taskDoc = JSON.parse(JSON.stringify(sampleTaskDoc));
    taskDoc.emission.priorityLabel = '';
    const contactIds = ['a', 'b', 'c'];
    fetchTasksResult = sinon.stub().resolves([taskDoc]);
    rulesEngineCoreStubs.getDirtyContacts.returns(['a', 'b']);
    service = TestBed.inject(RulesEngineService);

    const actual = await service.fetchTaskDocsFor(contactIds);

    expect(rulesEngineCoreStubs.fetchTasksFor.callCount).to.eq(1);
    expect(rulesEngineCoreStubs.fetchTasksFor.args[0][0]).to.eq(contactIds);
    expect(actual.length).to.eq(1);
    const actualTask = actual[0];
    expect(actualTask._id).to.equal('taskdoc');
    expect(actualTask.emission.date.toDateString()).to.equal('Tue Oct 24 2023');
    expect(actualTask.emission).to.deep.include({
      _id: 'emission_id',
      title: 'translate.this',
      priorityLabel: '',
      other: true,
      overdue: true,
      owner: 'contact-1234',
      dueDate: '2023-10-24'
    });
    expect(telemetryService.record.calledOnce).to.be.true;
    expect(telemetryService.record.args[0]).to.deep.equal(['rules-engine:tasks:dirty-contacts', 2]);
    expect(stopPerformanceTrackStub.calledTwice).to.be.true;
    expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({ name: 'rules-engine:initialize' });
    expect(stopPerformanceTrackStub.args[1][0]).to.deep.equal({ name: 'rules-engine:tasks:some-contacts' });
  });

  it('fetchTasksFor should wait for contacts to be marked as dirty', fakeAsync(async () => {
    service = TestBed.inject(RulesEngineService);
    await service.isEnabled();
    await service.fetchTargets(); // clear old timers
    stopPerformanceTrackStub.resetHistory();

    const taskDoc = JSON.parse(JSON.stringify(sampleTaskDoc));
    fetchTasksResult = sinon.stub().resolves([taskDoc]);
    rulesEngineCoreStubs.getDirtyContacts.returns(['a', 'b', 'c']);
    service = TestBed.inject(RulesEngineService);

    const callback = sinon.stub();
    const subscription = service.contactsMarkedAsDirty(callback);

    const change = changesService.subscribe.args[0][0];
    await change.callback(changeFeedFormat({ type: 'data_record', form: 'f', fields: { patient_id: 'p1' } }));
    const tasksPromise = service.fetchTaskDocsFor(['a']);
    await change.callback(changeFeedFormat({ _id: '2', type: 'person', patient_id: 'p2' }));
    tick(500);
    expect(rulesEngineCoreStubs.fetchTasksFor.called).to.be.false;
    await change.callback(changeFeedFormat({ _id: '3', type: 'person', patient_id: 'p3' }));
    tick(900);
    expect(rulesEngineCoreStubs.fetchTasksFor.called).to.be.false;
    await change.callback(changeFeedFormat({ type: 'data_record', form: 'f', fields: { patient_id: 'p3' }}));
    expect(rulesEngineCoreStubs.fetchTasksFor.called).to.be.false;

    tick(1000);
    const tasks = await tasksPromise;

    expect(rulesEngineCoreStubs.fetchTasksFor.calledOnce).to.be.true;
    expect(tasks.length).to.eq(1);
    const actualTask = tasks[0];
    expect(actualTask._id).to.equal(taskDoc._id);
    expect(actualTask.emission.date.toDateString()).to.equal('Tue Oct 24 2023');
    expect(actualTask.emission).to.deep.include({
      _id: 'emission_id',
      title: 'translate.this',
      priorityLabel: 'and.this',
      other: true,
      overdue: true,
      owner: 'contact-1234',
      dueDate: '2023-10-24'
    });

    subscription.unsubscribe();
  }));

  it('fetchTargets() should send correct range to Rules Engine Core when getting targets', async () => {
    fetchTargetsResult = sinon.stub().resolves([]);
    service = TestBed.inject(RulesEngineService);

    const actual = await service.fetchTargets();

    expect(actual).to.deep.eq([]);
    expect(rulesEngineCoreStubs.fetchTargets.callCount).to.eq(1);
    expect(rulesEngineCoreStubs.fetchTargets.args[0][0]).to.have.keys('start', 'end');
  });

  it('fetchTargets should wait for contacts to be marked as dirty', fakeAsync(async () => {
    fetchTargetsResult = sinon.stub().resolves([{ ...sampleTarget }]);
    service = TestBed.inject(RulesEngineService);
    await service.isEnabled();
    await service.fetchTaskDocsForAllContacts(); // clear old timers
    stopPerformanceTrackStub.resetHistory();

    service = TestBed.inject(RulesEngineService);

    const callback = sinon.stub();
    const subscription = service.contactsMarkedAsDirty(callback);

    const change = changesService.subscribe.args[0][0];
    await change.callback(changeFeedFormat({ type: 'data_record', form: 'f', fields: { patient_id: 'p1' } }));
    const targetsPromise = service.fetchTargets();
    await change.callback(changeFeedFormat({ _id: '2', type: 'person', patient_id: 'p2' }));
    tick(500);
    expect(rulesEngineCoreStubs.fetchTargets.called).to.be.false;
    await change.callback(changeFeedFormat({ _id: '3', type: 'person', patient_id: 'p3' }));
    tick(900);
    expect(rulesEngineCoreStubs.fetchTargets.called).to.be.false;
    await change.callback(changeFeedFormat({ type: 'data_record', form: 'f', fields: { patient_id: 'p3' }}));
    expect(rulesEngineCoreStubs.fetchTargets.called).to.be.false;

    tick(1000);
    const targets = await targetsPromise;

    expect(rulesEngineCoreStubs.fetchTargets.calledOnce).to.be.true;
    expect(targets.length).to.eq(1);

    subscription.unsubscribe();
  }));

  it('should ensure freshness of tasks and targets', fakeAsync(async () => {
    rulesEngineCoreStubs.getDirtyContacts.returns(Array.from({ length: 20 }).map(i => i));
    service = TestBed.inject(RulesEngineService);

    await service.isEnabled();
    tick(1000);

    expect(rulesEngineCoreStubs.refreshEmissionsFor.callCount).to.eq(0);
    expect(rulesEngineCoreStubs.fetchTasksFor.callCount).to.eq(1);
    expect(rulesEngineCoreStubs.fetchTargets.callCount).to.eq(0);
    expect(telemetryService.record.callCount).to.equal(1);
    expect(stopPerformanceTrackStub.calledTwice).to.be.true;
    expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({ name: 'rules-engine:initialize' });
    expect(stopPerformanceTrackStub.args[1][0]).to.deep.equal({ name: 'rules-engine:tasks:all-contacts' });
  }));

  it('should cancel all ensure freshness threads', async () => {
    fetchTargetsResult = sinon.stub().resolves([]);
    fetchTasksResult = sinon.stub().resolves([]);
    clock = sinon.useFakeTimers({ now: 1000});
    service = TestBed.inject(RulesEngineService);

    await service.isEnabled();
    await service.fetchTargets();
    await service.fetchTaskDocsForAllContacts();
    clock.tick(500 * 1000);
    await service.isEnabled(); // to resolve promises

    expect(rulesEngineCoreStubs.fetchTasksFor.callCount).to.eq(1);
    expect(rulesEngineCoreStubs.fetchTargets.callCount).to.eq(1);
    expect(telemetryService.record.calledTwice).to.be.true;
    expect(telemetryService.record.args[0]).to.deep.equal(['rules-engine:targets:dirty-contacts', 0]);
    expect(telemetryService.record.args[1]).to.deep.equal(['rules-engine:tasks:dirty-contacts', 0]);
    expect(stopPerformanceTrackStub.callCount).to.equal(4);
    expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({ name: 'rules-engine:initialize' });
    expect(stopPerformanceTrackStub.args[1][0]).to.deep.equal({ name: 'rules-engine:background-refresh:cancel' });
    expect(stopPerformanceTrackStub.args[2][0]).to.deep.equal({ name: 'rules-engine:targets' });
    expect(stopPerformanceTrackStub.args[3][0]).to.deep.equal({ name: 'rules-engine:tasks:all-contacts' });
  });

  it('should record correct telemetry data with emitted events', async () => {
    clock = sinon.useFakeTimers({ now: 1000});
    let fetchTargetResultPromise;
    const fetchTasksResultPromise: any[] = [];
    fetchTargetsResult = sinon.stub().callsFake(() => new Promise(resolve => fetchTargetResultPromise = resolve));
    fetchTasksResult = sinon.stub().callsFake(() => new Promise(resolve => fetchTasksResultPromise.push(resolve)));
    service = TestBed.inject(RulesEngineService);

    await service.isEnabled();
    service.fetchTargets();
    service.fetchTaskDocsForAllContacts();
    service.fetchTaskDocsFor(['a']);
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchTargets.events).to.have.keys(['queued', 'running']);
    expect(fetchTasksFor.events).to.have.keys(['queued', 'running']);
    expect(telemetryService.record.calledThrice).to.be.true;
    expect(telemetryService.record.args.map(arg => arg[0])).to.deep.equal([
      'rules-engine:targets:dirty-contacts',
      'rules-engine:tasks:dirty-contacts',
      'rules-engine:tasks:dirty-contacts',
    ]);
    expect(stopPerformanceTrackStub.calledTwice).to.be.true;
    expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({ name: 'rules-engine:initialize' });
    expect(stopPerformanceTrackStub.args[1][0]).to.deep.equal({ name: 'rules-engine:background-refresh:cancel' });

    fetchTargets.events.queued[0]();
    fetchTasksFor.events.queued[0]();
    fetchTasksFor.events.queued[1]();

    expect(stopPerformanceTrackStub.calledTwice).to.be.true;
    fetchTargets.events.running[0]();
    expect(stopPerformanceTrackStub.callCount).to.equal(3);
    expect(stopPerformanceTrackStub.args[2][0]).to.deep.equal({ name: 'rules-engine:targets:queued' });


    await Promise.resolve();
    clock.tick(5000);
    fetchTargetResultPromise([]);
    await nextTick();

    expect(stopPerformanceTrackStub.callCount).to.equal(4);
    expect(stopPerformanceTrackStub.args[3][0]).to.deep.equal({ name: 'rules-engine:targets' });
    fetchTasksFor.events.running[0]();
    expect(stopPerformanceTrackStub.callCount).to.equal(5);
    expect(stopPerformanceTrackStub.args[4][0]).to.deep.equal({ name: 'rules-engine:tasks:all-contacts:queued' });
    clock.tick(10000);
    fetchTasksResultPromise[1]([]);

    await nextTick();
    expect(stopPerformanceTrackStub.callCount).to.equal(6);
    expect(stopPerformanceTrackStub.args[5][0]).to.deep.equal({ name: 'rules-engine:tasks:all-contacts' });
    fetchTasksFor.events.running[1]();
    expect(stopPerformanceTrackStub.callCount).to.equal(7);
    expect(stopPerformanceTrackStub.args[6][0]).to.deep.equal({ name: 'rules-engine:tasks:some-contacts:queued' });
    clock.tick(550);
    fetchTasksResultPromise[3]([]);

    await nextTick();
    expect(stopPerformanceTrackStub.callCount).to.equal(8);
    expect(stopPerformanceTrackStub.args[7][0]).to.deep.equal({ name: 'rules-engine:tasks:some-contacts' });
  });

  it('should record correct telemetry data for disabled actions', async () => {
    authService.has.withArgs('can_view_tasks').resolves(false);
    clock = sinon.useFakeTimers({ now: 1000});
    fetchTargetsResult = sinon.stub().resolves([]);
    fetchTasksResult = sinon.stub().resolves([]);
    service = TestBed.inject(RulesEngineService);

    await service.isEnabled();
    service.fetchTargets();
    service.fetchTaskDocsForAllContacts();
    service.fetchTaskDocsFor(['a']);
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchTargets.events).to.have.keys(['queued', 'running']);
    expect(fetchTasksFor.events).to.have.keys(['queued', 'running']);

    expect(telemetryService.record.calledThrice).to.be.true;
    expect(telemetryService.record.args.map(arg => arg[0])).to.include.members([
      'rules-engine:targets:dirty-contacts',
      'rules-engine:tasks:dirty-contacts',
      'rules-engine:tasks:dirty-contacts'
    ]);

    expect(stopPerformanceTrackStub.calledTwice).to.be.true;
    expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({ name: 'rules-engine:initialize' });
    expect(stopPerformanceTrackStub.args[1][0]).to.deep.equal({ name: 'rules-engine:background-refresh:cancel' });

    await nextTick();

    // queued and running events are not emitted!

    expect(stopPerformanceTrackStub.callCount).to.equal(5);
    expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({ name: 'rules-engine:initialize' });
    expect(stopPerformanceTrackStub.args[1][0]).to.deep.equal({ name: 'rules-engine:background-refresh:cancel' });
    expect(stopPerformanceTrackStub.args[2][0]).to.deep.equal({ name: 'rules-engine:targets' });
    expect(stopPerformanceTrackStub.args[3][0]).to.deep.equal({ name: 'rules-engine:tasks:all-contacts' });
    expect(stopPerformanceTrackStub.args[4][0]).to.deep.equal({ name: 'rules-engine:tasks:some-contacts' });
  });

  describe('fetchTasksBreakdown', () => {
    it('should send correct params to Rules Engine Core', async () => {
      rulesEngineCoreStubs.fetchTasksBreakdown.resolves({});
      service = TestBed.inject(RulesEngineService);

      expect(await service.fetchTasksBreakdown()).to.deep.eq({});
      expect(rulesEngineCoreStubs.fetchTasksBreakdown.callCount).to.eq(1);
      expect(rulesEngineCoreStubs.fetchTasksBreakdown.args[0]).to.deep.equal([undefined]);

      expect(await service.fetchTasksBreakdown(['a', 'b'])).to.deep.eq({});
      expect(rulesEngineCoreStubs.fetchTasksBreakdown.callCount).to.eq(2);
      expect(rulesEngineCoreStubs.fetchTasksBreakdown.args[1]).to.deep.equal([['a', 'b']]);
    });

    it('should return results from rulesEngineCore and record telemetry without contactIds', async () => {
      const result = {
        Completed: 10,
        Ready: 2,
        Failed: 22,
      };

      clock = sinon.useFakeTimers({ now: 1000});
      let fetchTasksBreakdownResult;
      rulesEngineCoreStubs.fetchTasksBreakdown.callsFake(() => new Promise(r => fetchTasksBreakdownResult = r));
      service = TestBed.inject(RulesEngineService);
      const promise = service.fetchTasksBreakdown();

      await service.isEnabled(); // resolve initialize

      clock.tick(3000);
      fetchTasksBreakdownResult({ ...result });

      expect(await promise).to.deep.equal(result);

      expect(rulesEngineCoreStubs.fetchTasksBreakdown.callCount).to.equal(1);
      expect(rulesEngineCoreStubs.fetchTasksBreakdown.args[0]).to.deep.equal([undefined]);
      expect(stopPerformanceTrackStub.calledThrice).to.be.true;
      expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({ name: 'rules-engine:initialize' });
      expect(stopPerformanceTrackStub.args[1][0]).to.deep.equal({ name: 'rules-engine:tasks-breakdown:all-contacts' });
    });

    it('should return results from rulesEngineCore and record telemetry with contacts', async () => {
      const result = {
        Failed: 10,
        Ready: 2,
        Draft: 7,
      };

      clock = sinon.useFakeTimers({ now: 1000});
      let fetchTasksBreakdownResult;
      rulesEngineCoreStubs.fetchTasksBreakdown.callsFake(() => new Promise(r => fetchTasksBreakdownResult = r));
      service = TestBed.inject(RulesEngineService);
      const promise = service.fetchTasksBreakdown(['c1', 'c2', 'c3']);

      await service.isEnabled(); // resolve initialize

      clock.tick(2569);
      fetchTasksBreakdownResult({ ...result });

      expect(await promise).to.deep.equal(result);

      expect(rulesEngineCoreStubs.fetchTasksBreakdown.callCount).to.equal(1);
      expect(rulesEngineCoreStubs.fetchTasksBreakdown.args[0]).to.deep.equal([['c1', 'c2', 'c3']]);

      expect(stopPerformanceTrackStub.calledThrice).to.be.true;
      expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({ name: 'rules-engine:initialize' });
      expect(stopPerformanceTrackStub.args[1][0]).to.deep.equal({ name: 'rules-engine:tasks-breakdown:some-contacts' });
    });
  });

  describe('monitorTaskChanges', () => {
    it('should subscribe to task document changes', fakeAsync(async () => {
      service = TestBed.inject(RulesEngineService);
      await service.isEnabled();

      // Trigger the fetchOverdueTasksForAllContacts which calls monitorTaskChanges
      sinon.stub(service, 'fetchTaskDocsForAllContacts').resolves([sampleTaskDoc]);

      // Trigger the background refresh
      tick(1000);

      await nextTick();

      // Verify that task-doc-update subscription was created
      const taskDocSubscription = changesService.subscribe.args.find(
        args => args[0].key === 'task-doc-update'
      );
      expect(taskDocSubscription).to.exist;
    }));

    it('should update overdue tasks when task document changes', fakeAsync(async () => {
      const store = TestBed.inject(Store);
      const dispatchSpy = sinon.spy(store, 'dispatch');

      service = TestBed.inject(RulesEngineService);
      await service.isEnabled();

      // Trigger the fetchOverdueTasksForAllContacts which calls monitorTaskChanges
      sinon.stub(service, 'fetchTaskDocsForAllContacts').resolves([sampleTaskDoc]);
      tick(1000);
      await nextTick();

      // Get the task-doc-update subscription callback
      const taskDocSubscription = changesService.subscribe.args.find(
        args => args[0].key === 'task-doc-update'
      );
      expect(taskDocSubscription).to.exist;

      const callback = taskDocSubscription[0].callback;

      // Simulate a task document change
      const taskChange = {
        id: 'task-1',
        doc: {
          _id: 'task-1',
          type: 'task',
          emission: {
            _id: 'emission-1',
            dueDate: '2023-10-24',
          },
        },
      };

      callback(taskChange);

      // Verify that setOverdueTasks was dispatched
      const setOverdueTasksCalls = dispatchSpy.getCalls().filter(
        call => (call.args[0] as any).type === 'SET_OVERDUE_TASKS'
      );
      expect(setOverdueTasksCalls.length).to.be.greaterThan(0);
      expect((setOverdueTasksCalls[0].args[0] as any).payload.tasks).to.deep.equal([taskChange.doc]);
    }));

    it('should not update overdue tasks for non-task documents', fakeAsync(async () => {
      service = TestBed.inject(RulesEngineService);
      await service.isEnabled();

      // Trigger the fetchOverdueTasksForAllContacts which calls monitorTaskChanges
      sinon.stub(service, 'fetchTaskDocsForAllContacts').resolves([sampleTaskDoc]);
      tick(1000);
      await nextTick();

      // Get the task-doc-update subscription
      const taskDocSubscription = changesService.subscribe.args.find(
        args => args[0].key === 'task-doc-update'
      );
      expect(taskDocSubscription).to.exist;

      const filter = taskDocSubscription[0].filter;

      // Simulate a non-task document change
      const reportChange = {
        id: 'report-1',
        doc: {
          _id: 'report-1',
          type: 'data_record',
          form: 'some-form',
        },
      };

      // Verify that the filter rejects non-task documents
      expect(filter(reportChange)).to.be.false;
    }));

    it('should not update overdue tasks for tasks that are not in Ready state', fakeAsync(async () => {
      service = TestBed.inject(RulesEngineService);
      await service.isEnabled();

      // Trigger the fetchOverdueTasksForAllContacts which calls monitorTaskChanges
      sinon.stub(service, 'fetchTaskDocsForAllContacts').resolves([sampleTaskDoc]);
      tick(1000);
      await nextTick();

      // Get the task-doc-update subscription
      const taskDocSubscription = changesService.subscribe.args.find(
        args => args[0].key === 'task-doc-update'
      );
      expect(taskDocSubscription).to.exist;

      const filter = taskDocSubscription[0].filter;

      // Simulate a task document that is not in Ready state (e.g., Cancelled)
      const cancelledTaskChange = {
        id: 'task-cancelled',
        doc: {
          _id: 'task-cancelled',
          type: 'task',
          state: 'Cancelled',
          emission: {
            _id: 'emission-cancelled',
            state: 'Cancelled',
            dueDate: '2023-10-24',
          },
        },
      };

      // Verify that the filter rejects tasks not in Ready state
      expect(filter(cancelledTaskChange)).to.be.false;

      // Simulate a task document that is in Ready state
      const readyTaskChange = {
        id: 'task-ready',
        doc: {
          _id: 'task-ready',
          type: 'task',
          state: 'Ready',
          emission: {
            _id: 'emission-ready',
            state: 'Ready',
            dueDate: '2023-10-24',
          },
        },
      };

      // Verify that the filter accepts tasks in Ready state
      expect(filter(readyTaskChange)).to.be.true;
    }));
  });

  describe('fetchTargets with ReportingPeriod', () => {
    beforeEach(() => {
      clock = sinon.useFakeTimers(new Date('2025-02-15').getTime());
    });

    afterEach(() => {
      clock && clock.restore();
    });

    it('should fetch current month targets when ReportingPeriod.CURRENT is passed', async () => {
      fetchTargetsResult = sinon.stub().resolves([sampleTarget]);
      service = TestBed.inject(RulesEngineService);

      const actual = await service.fetchTargets(ReportingPeriod.CURRENT);

      expect(actual).to.deep.equal([sampleTarget]);
      expect(rulesEngineCoreStubs.fetchTargets.calledOnce).to.be.true;
      expect(getTargetInterval.called).to.be.false;
    });

    it('should fetch previous month targets when ReportingPeriod.PREVIOUS is passed', async () => {
      const targetIntervalDoc = {
        _id: 'target~2025-01~user~org.couchdb.user:fred',
        type: 'target',
        user: 'org.couchdb.user:fred',
        owner: 'user',
        reporting_period: '2025-01',
        updated_date: Date.now(),
        targets: [
          {
            id: 'target',
            value: {
              pass: 5,
              total: 10
            }
          }
        ]
      };
      getTargetInterval.resolves(targetIntervalDoc);
      service = TestBed.inject(RulesEngineService);

      settingsService.get.resolves({
        _id: 'settings',
        tasks: {
          targets: {
            items: [
              { id: 'target', type: 'count' },
            ]
          }
        }
      });

      const actual = await service.fetchTargets(ReportingPeriod.PREVIOUS);

      expect(getTargetInterval.calledOnce).to.be.true;
      expect(rulesEngineCoreStubs.fetchTargets.called).to.be.false;

      const qualifier = getTargetInterval.args[0][0];
      expect(qualifier).to.have.property('reportingPeriod', '2025-01');
      expect(qualifier).to.have.property('contactUuid', 'user');
      expect(qualifier).to.have.property('username', 'fred');

      expect(actual.length).to.eq(1);
      expect(actual[0]).to.include({
        id: 'target',
        visible: true,
        reportingMonth: 'January'
      });
      expect(actual[0].value).to.deep.eq({ pass: 5, total: 10 });
    });

    it('should return empty targets when username is missing', async () => {
      sessionService.userCtx = () => ({ name: null });
      service = TestBed.inject(RulesEngineService);

      const actual = await service.fetchTargets(ReportingPeriod.PREVIOUS);

      expect(getTargetInterval.called).to.be.false;
      expect(actual).to.deep.eq([]);
    });

    it('should return empty targets when contact is missing', async () => {
      userContactService.get.resolves(null);
      service = TestBed.inject(RulesEngineService);

      const actual = await service.fetchTargets(ReportingPeriod.PREVIOUS);

      expect(getTargetInterval.called).to.be.false;
      expect(actual).to.deep.eq([]);
    });

    it('should return empty array when target interval is not found', async () => {
      getTargetInterval.resolves(null);
      service = TestBed.inject(RulesEngineService);

      const actual = await service.fetchTargets(ReportingPeriod.PREVIOUS);

      expect(getTargetInterval.calledOnce).to.be.true;
      expect(actual).to.deep.eq([]);
    });

    it('should handle errors and return empty array', async () => {
      getTargetInterval.rejects(new Error('Database error'));
      service = TestBed.inject(RulesEngineService);

      const actual = await service.fetchTargets(ReportingPeriod.PREVIOUS);

      expect(getTargetInterval.calledOnce).to.be.true;
      expect(actual).to.deep.eq([]);
    });

    it('should calculate correct reporting period for previous month', async () => {
      const targetIntervalDoc = {
        _id: 'target~2025-01~user~org.couchdb.user:fred',
        type: 'target',
        user: 'org.couchdb.user:fred',
        owner: 'user',
        reporting_period: '2025-01',
        updated_date: Date.now(),
        targets: []
      };
      getTargetInterval.resolves(targetIntervalDoc);
      service = TestBed.inject(RulesEngineService);

      await service.fetchTargets(ReportingPeriod.PREVIOUS);

      expect(getTargetInterval.calledOnce).to.be.true;
      const qualifier = getTargetInterval.args[0][0];
      // Current interval ends in Feb 2025, so previous month should be 2025-01
      expect(qualifier.reportingPeriod).to.eq('2025-01');
    });

    it('should process multiple targets from target interval', async () => {
      const targetIntervalDoc = {
        _id: 'target~2025-01~user~org.couchdb.user:fred',
        type: 'target',
        user: 'org.couchdb.user:fred',
        owner: 'user',
        reporting_period: '2025-01',
        updated_date: Date.now(),
        targets: [
          {
            id: 'target',
            value: {
              pass: 3,
              total: 7
            }
          }
        ]
      };
      const settingsWithMultipleTargets = {
        _id: 'settings',
        tasks: {
          targets: {
            items: [
              { id: 'target', type: 'count' },
              { id: 'another-target', type: 'percent' }
            ]
          }
        }
      };
      settingsService.get.resolves(settingsWithMultipleTargets);
      getTargetInterval.resolves(targetIntervalDoc);
      service = TestBed.inject(RulesEngineService);

      const actual = await service.fetchTargets(ReportingPeriod.PREVIOUS);

      // Only returns targets that exist in the interval doc
      expect(actual.length).to.eq(1);
      expect(actual[0]).to.include({ id: 'target' });
      expect(actual[0].value).to.deep.eq({ pass: 3, total: 7 });
    });
  });

  describe('getTargetIntervalTag', () => {
    beforeEach(() => {
      clock = sinon.useFakeTimers(new Date('2025-02-15').getTime());
    });

    it('should return current interval tag in YYYY-MM format for CURRENT period', () => {
      service = TestBed.inject(RulesEngineService);

      const tag = service.getTargetIntervalTag(settingsDoc, ReportingPeriod.CURRENT);

      expect(tag).to.equal('2025-02');
      expect(uhcSettingsService.getMonthStartDate.calledOnceWithExactly(settingsDoc)).to.be.true;
    });

    it('should return previous interval tag for PREVIOUS period with default monthsAgo', () => {
      service = TestBed.inject(RulesEngineService);

      const tag = service.getTargetIntervalTag(settingsDoc, ReportingPeriod.PREVIOUS);

      expect(tag).to.equal('2025-01');
      expect(uhcSettingsService.getMonthStartDate.calledOnceWithExactly(settingsDoc)).to.be.true;
    });

    it('should support custom monthsAgo parameter', () => {
      service = TestBed.inject(RulesEngineService);

      const tag = service.getTargetIntervalTag(settingsDoc, ReportingPeriod.PREVIOUS, 2);

      expect(tag).to.equal('2024-12');
      expect(uhcSettingsService.getMonthStartDate.calledOnceWithExactly(settingsDoc)).to.be.true;
    });

    it('should handle year boundary when going to previous year', () => {
      clock.restore();
      clock = sinon.useFakeTimers(new Date('2025-01-10').getTime());
      service = TestBed.inject(RulesEngineService);

      const tag = service.getTargetIntervalTag(settingsDoc, ReportingPeriod.PREVIOUS);

      expect(tag).to.equal('2024-12');
      expect(uhcSettingsService.getMonthStartDate.calledOnceWithExactly(settingsDoc)).to.be.true;
    });
  });

  describe('getReportingMonth', () => {
    beforeEach(() => {
      clock = sinon.useFakeTimers(new Date('2025-02-15').getTime());
    });

    it('should return full month name for CURRENT period', () => {
      service = TestBed.inject(RulesEngineService);

      const month = service.getReportingMonth(settingsDoc, ReportingPeriod.CURRENT);

      expect(month).to.equal('February');
      expect(uhcSettingsService.getMonthStartDate.calledOnceWithExactly(settingsDoc)).to.be.true;
    });

    it('should return full month name for PREVIOUS period', () => {
      service = TestBed.inject(RulesEngineService);

      const month = service.getReportingMonth(settingsDoc, ReportingPeriod.PREVIOUS);

      expect(month).to.equal('January');
      expect(uhcSettingsService.getMonthStartDate.calledOnceWithExactly(settingsDoc)).to.be.true;
    });

    it('should return translated fallback when an error occurs', () => {
      service = TestBed.inject(RulesEngineService);
      uhcSettingsService.getMonthStartDate.throws(new Error('test error'));

      const month = service.getReportingMonth(settingsDoc, ReportingPeriod.PREVIOUS);

      expect(month).to.equal('targets.last_month.subtitle');
      expect(uhcSettingsService.getMonthStartDate.calledOnceWithExactly(settingsDoc)).to.be.true;
    });
  });
});
