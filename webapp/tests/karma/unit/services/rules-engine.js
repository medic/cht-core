
describe(`RulesEngine service`, () => {
  const { assert, expect } = chai;

  'use strict';

  let $timeout;
  let getService;
  let hasAuth;
  let Changes;
  let RulesEngineCore;
  let Session;
  let Settings;
  let TranslateFrom;
  let UserContact;
  let UserSettings;

  const settingsDoc = {
    _id: 'settings',
    tasks: {
      rules: 'rules',
      schedules: ['schedules'],
      targets: {
        items: [
          { id: 'target' }
        ]
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
  };

  beforeEach(async () => {
    hasAuth = sinon.stub().resolves(true);
    Changes = sinon.stub();
    Session = { isOnlineOnly: sinon.stub().returns(false) };
    Settings = sinon.stub().resolves(settingsDoc);
    TranslateFrom = sinon.stub().returns('translated');
    UserContact = sinon.stub().resolves(userContactDoc);
    UserSettings = sinon.stub().resolves(userSettingsDoc);

    RulesEngineCore = {
      initialize: sinon.stub().resolves(true),
      isEnabled: sinon.stub().returns(true),
      fetchTasksFor: sinon.stub().resolves([]),
      fetchTargets: sinon.stub().resolves([]),
      updateEmissionsFor: sinon.stub(),
      rulesConfigChange: sinon.stub().returns(true),
    };

    module('inboxApp');
    module($provide => {
      $provide.value('$q', Q);
      $provide.value('Auth', { has: hasAuth });
      $provide.value('Changes', Changes);
      $provide.factory('DB', KarmaUtils.mockDB({
        info: () => sinon.stub().resolves(),
        get: sinon.stub().resolves({}),
      }));
      $provide.value('RulesEngineCore', RulesEngineCore);
      $provide.value('Session', Session);
      $provide.value('Settings', Settings);
      $provide.value('TranslateFrom', TranslateFrom);
      $provide.value('UserContact', UserContact);
      $provide.value('UserSettings', UserSettings);
    });

    inject(($injector, _$timeout_, _$translate_) => {
      sinon.stub(_$translate_, 'instant').returns('$translated');
      $timeout = _$timeout_;
      getService = () => $injector.get('RulesEngine');
    });
  });

  const deepCopy = obj => JSON.parse(JSON.stringify(obj));

  afterEach(() => { sinon.restore(); });

  describe('mock shared-lib', () => {
    describe('initialization', () => {

      const expectAsyncToThrow = async (func, include) => {
        try {
          await func();
          assert.fail('Should throw');
        } catch (err) {
          expect(err.name).to.include(include);
        }
      };

      it('disabled when user has no permissions', async () => {
        hasAuth.resolves(true);
        expectAsyncToThrow(getService().isEnabled, 'permission');
      });

      it('tasks disabled', async () => {
        hasAuth.withArgs('can_view_tasks').resolves(false);
        expect(await getService().isEnabled()).to.be.true;
        expect(RulesEngineCore.initialize.callCount).to.eq(1);
        expect(RulesEngineCore.initialize.args[0][0]).to.nested.include({
          enableTasks: false,
          enableTargets: true,
          user: userSettingsDoc,
          contact: userContactDoc,
        });
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

    describe('changes feeds', () => {
      const changeFeedFormat = doc => ({ id: doc._id, doc });
      const scenarios = [
        {
          doc: { _id: 'person', type: 'person' },
          expected: 'person',
        },

        {
          doc: { _id: 'contact', type: 'contact', contact_type: 'person' },
          expected: 'contact',
        },

        {
          doc: { _id: 'report', type: 'data_record', form: 'form', patient_id: 'patient' },
          expected: 'patient',
        },
      ];

      for (const scenario of scenarios) {
        it(`trigger update for ${scenario.doc._id}`, async () => {
          expect(await getService().isEnabled()).to.be.true;
          const change = Changes.args[0][0];
          expect(change.filter(changeFeedFormat(scenario.doc))).to.be.true;
          change.callback(changeFeedFormat(scenario.doc));
          expect(RulesEngineCore.updateEmissionsFor.callCount).to.eq(1);
          expect(RulesEngineCore.updateEmissionsFor.args[0][0]).to.deep.eq(scenario.expected);
        });
      }

      it(`does not trigger`, async () => {
        expect(await getService().isEnabled()).to.be.true;
        const changeFeed = Changes.args[0][0];
        expect(changeFeed.filter({ id: 'id' })).to.be.false;
        expect(changeFeed.filter({ id: 'id', doc: { _id: 'task', type: 'task', requester: 'requester' } })).to.be.false;
        expect(changeFeed.filter(changeFeedFormat({ _id: 'doc' }))).to.be.false;
        expect(changeFeed.filter(changeFeedFormat({ _id: 'a', type: 'data_record', form: undefined }))).to.be.false;
      });

      const cachebustScenarios = [
        { _id: 'settings', settings: settingsDoc },
        userContactDoc,
        userContactGrandparent,
      ];

      for (const scenarioDoc of cachebustScenarios) {
        it(`bust cache for settings ${scenarioDoc._id}`, async () => {
          expect(await getService().isEnabled()).to.be.true;
          const change = changeFeedFormat(scenarioDoc);
          const changeFeed = Changes.args[1][0];
          expect(changeFeed.filter(change)).to.be.true;
          await changeFeed.callback(change);
          expect(RulesEngineCore.rulesConfigChange.callCount).to.eq(1);
          expect(RulesEngineCore.rulesConfigChange.args[0]).to.deep.eq([expectedRulesConfig]);
        });
      }

      it('no bust cache for unknown id', async () => {
        expect(await getService().isEnabled()).to.be.true;
        const changeFeed = Changes.args[1][0];
        expect(changeFeed.filter({ id: 'id' })).to.be.false;
        expect(changeFeed.filter(changeFeedFormat({ _id: 'task', type: 'task' }))).to.be.false;
      });
    });

    it('fetchTaskDocsForAllContacts', async () => {
      RulesEngineCore.fetchTasksFor.resolves([deepCopy(sampleTaskDoc)]);
      const actual = await getService().fetchTaskDocsForAllContacts();
      expect(RulesEngineCore.fetchTasksFor.callCount).to.eq(1);
      expect(RulesEngineCore.fetchTasksFor.args[0][0]).to.be.undefined;

      expect(actual.length).to.eq(1);
      expect(actual[0]).to.nested.include({
        _id: 'taskdoc',
        'emission.title': '$translated',
        'emission.priorityLabel': '$translated',
        'emission.other': true,
      });
    });

    it('fetchTaskDocsFor', async () => {
      const contactIds = ['a', 'b', 'c'];
      RulesEngineCore.fetchTasksFor.resolves([deepCopy(sampleTaskDoc)]);
      const actual = await getService().fetchTaskDocsFor(contactIds);
      expect(RulesEngineCore.fetchTasksFor.callCount).to.eq(1);
      expect(RulesEngineCore.fetchTasksFor.args[0][0]).to.eq(contactIds);

      expect(actual.length).to.eq(1);
      expect(actual[0]).to.nested.include({
        _id: 'taskdoc',
        'emission.title': '$translated',
        'emission.priorityLabel': '$translated',
        'emission.other': true,
      });
    });

    it('correct range is passed when getting targets', async () => {
      const actual = await getService().fetchTargets();
      expect(actual).to.deep.eq([]);

      expect(RulesEngineCore.fetchTargets.callCount).to.eq(1);
      expect(RulesEngineCore.fetchTargets.args[0][0]).to.have.keys('start', 'end');
    });

    it('ensure freshness of tasks and targets', async () => {
      const service = getService();
      await service.isEnabled();
      $timeout.flush(500 * 1000);

      await service.isEnabled(); // to resolve promises
      expect(RulesEngineCore.fetchTasksFor.callCount).to.eq(1);
      expect(RulesEngineCore.fetchTargets.callCount).to.eq(1);
    });

    it('ensure freshness of tasks only', async () => {
      const service = getService();
      await service.isEnabled();

      await service.fetchTargets();
      $timeout.flush(500 * 1000);

      await service.isEnabled(); // to resolve promises
      expect(RulesEngineCore.fetchTasksFor.callCount).to.eq(1);
      expect(RulesEngineCore.fetchTargets.callCount).to.eq(1);
    });

    it('cancel all ensure freshness threads', async () => {
      const service = getService();
      await service.isEnabled();

      await service.fetchTargets();
      await service.fetchTaskDocsForAllContacts();
      $timeout.flush(500 * 1000);

      await service.isEnabled(); // to resolve promises
      expect(RulesEngineCore.fetchTasksFor.callCount).to.eq(1);
      expect(RulesEngineCore.fetchTargets.callCount).to.eq(1);
    });
  });
});
