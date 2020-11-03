/*import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import * as RulesEngineCore from '@medic/rules-engine';

import { SessionService } from '@mm-services/session.service';
import { AuthService } from '@mm-services/auth.service';
import { SettingsService } from '@mm-services/settings.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { UHCSettingsService } from '@mm-services/uhc-settings.service';
import { UserContactService } from '@mm-services/user-contact.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { ParseProvider } from '@mm-providers/parse.provider';
import { ChangesService } from '@mm-services/changes.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';

describe('RulesEngineService', () => {
  let service;
  let authService;
  let sessionService;
  let settingsService;
  let telemetryService;
  let uhcSettingsService;
  let userContactService;
  let userSettingsService;
  let parseProvider;
  let changesService;
  let contactTypesService;
  let translateFromService;
  let rulesEngineCoreStubs;

  let fetchTasksFor;
  let fetchTasksForRecursive;
  let fetchTasksResult;
  let fetchTargets;
  let fetchTargetsRecursive;
  let fetchTargetsResult;

  const settingsDoc = {
    _id: 'settings',
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
    emission: {
      _id: 'emission_id',
      title: 'translate.this',
      priorityLabel: 'and.this',
      other: true,
    },
  };
  const userSettingsDoc = {
    _id: 'org.couchdb.user:username',
    type: 'user-settings',
    roles: [],
  };
  const expectedRulesConfig = {
    rules: 'rules',
    taskSchedules: ['schedules'],
    targets: [{ id: 'target' }],
    enableTasks: true,
    enableTargets: true,
    contact: userContactDoc,
    user: userSettingsDoc,
    monthStartDate: 1,
  };
  
  beforeEach(() => {
    authService = { has: sinon.stub().resolves(true) };
    changesService = { subscribe: sinon.stub() };
    sessionService = { isOnlineOnly: sinon.stub().returns(false) };
    settingsService = { get: sinon.stub().resolves(settingsDoc) };
    translateFromService = { get: sinon.stub().resolves(settingsDoc) };
    userContactService = { get: sinon.stub().resolves(userContactDoc) };
    userSettingsService = { get: sinon.stub().resolves(userSettingsDoc) };
    uhcSettingsService = { getMonthStartDate: sinon.stub().returns(1) };
    telemetryService = { record: sinon.stub() };

    fetchTasksResult = Promise.resolve;
    fetchTasksFor = sinon.stub(RulesEngineCore, 'fetchTasksFor');
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

    fetchTargetsResult = Promise.resolve;
    fetchTargets = sinon.stub(RulesEngineCore, 'fetchTargets');
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

    rulesEngineCoreStubs = {
      initialize: sinon.stub(RulesEngineCore, 'initialize').resolves(true),
      isEnabled: sinon.stub(RulesEngineCore, 'isEnabled').returns(true),
      fetchTasksFor: fetchTasksFor,
      fetchTargets: fetchTargets,
      updateEmissionsFor: sinon.stub(RulesEngineCore, 'updateEmissionsFor').resolves(),
      rulesConfigChange: sinon.stub(RulesEngineCore, 'updateEmissionsFor').returns(true),
      getDirtyContacts: sinon.stub(RulesEngineCore, 'updateEmissionsFor').returns([]),
    };

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
      ],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: SessionService, useValue: sessionService },
        { provide: SettingsService, useValue: settingsService },
        { provide: TelemetryService, useValue: telemetryService },
        { provide: UHCSettingsService, useValue: uhcSettingsService },
        { provide: UserContactService, useValue: userContactService },
        { provide: UserSettingsService, useValue: userSettingsService },
        { provide: ParseProvider, useValue: parseProvider },
        { provide: ChangesService, useValue: changesService },
        { provide: ContactTypesService, useValue: contactTypesService },
        { provide: TranslateFromService, useValue: translateFromService }
      ]
    });

    service = TestBed.inject(RulesEngineService);
    authService = TestBed.inject(AuthService);
    sessionService = TestBed.inject(SessionService);
    settingsService = TestBed.inject(SettingsService);
    telemetryService = TestBed.inject(TelemetryService);
    uhcSettingsService = TestBed.inject(UHCSettingsService);
    userContactService = TestBed.inject(UserContactService);
    userSettingsService = TestBed.inject(UserSettingsService);
    parseProvider = TestBed.inject(ParseProvider);
    changesService = TestBed.inject(ChangesService);
    contactTypesService = TestBed.inject(ContactTypesService);
    translateFromService = TestBed.inject(TranslateFromService);
  });

  afterEach(() => {
    sinon.restore();
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
      authService.has.resolves(true);

      expectAsyncToThrow(service.isEnabled, 'permission');

      expect(telemetryService.record.callCount).to.equal(0);
    });

    it('tasks disabled', async () => {
      authService.has.withArgs('can_view_tasks').resolves(false);

      const result = service.isEnabled();

      expect(result).to.be.true;
      expect(rulesEngineCoreStubs.initialize.callCount).to.equal(1);
      expect(rulesEngineCoreStubs.initialize.args[0][0]).to.nested.include({
        enableTasks: false,
        enableTargets: true,
        user: userSettingsDoc,
        contact: userContactDoc,
      });
      expect(telemetryService.record.callCount).to.equal(1);
      expect(telemetryService.record.args[0][0]).to.equal('rules-engine:initialize');
    });

    it('targets disabled', async () => {
      hasAuth.withArgs('can_view_analytics').resolves(false);
      expect(await getService().isEnabled()).to.be.true;
      expect(RulesEngineCore.initialize.callCount).to.eq(1);
      expect(RulesEngineCore.initialize.args[0][0]).to.nested.include({ enableTasks: true, enableTargets: false });
    });

    it('disabled for online users', async () => {
      Session.isOnlineOnly.returns(true);
      expectAsyncToThrow(getService().isEnabled, 'permission');
    });

    it('disabled if initialize throws', async () => {
      RulesEngineCore.initialize.rejects('error');
      expectAsyncToThrow(getService().isEnabled, 'error');
    });

    it('targets are filtered by context', async () => {
      const allContexts = { id: 'all' };
      const emptyContext = { id: 'empty', context: '' };
      const matchingContext = { id: 'match', context: 'user.parent._id === "parent"' };
      const noMatchingContext = { id: 'no-match', context: '!!user.dne' };
      const settingsDoc = {
        _id: 'settings',
        tasks: {
          targets: {
            items: [ allContexts, emptyContext, matchingContext, noMatchingContext ]
          }
        }
      };

      Settings.resolves(settingsDoc);
      expect(await getService().isEnabled()).to.be.true;

      const { targets } = RulesEngineCore.initialize.args[0][0];
      expect(targets.map(target => target.id)).to.deep.eq([allContexts.id, emptyContext.id, matchingContext.id]);
    });

    it('parameters to shared-lib', async () => {
      expect(await getService().isEnabled()).to.be.true;
      expect(RulesEngineCore.initialize.callCount).to.eq(1);
      expect(RulesEngineCore.initialize.args[0][0]).to.deep.eq(expectedRulesConfig);
    });

  });
});
*/
