
describe(`RulesEngine service`, () => {
  const { assert, expect } = chai;

  'use strict';

  let
    getService,
    Auth,
    Changes,
    RulesEngineCore,
    Session,
    Settings,
    TranslateFrom,
    UserContact;

  const settingsDoc = { _id: 'settings' };
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
      
  beforeEach(async () => {
    Auth = sinon.stub().resolves(true);
    Changes = sinon.stub();
    Session = { isOnlineOnly: sinon.stub().returns(false) };
    Settings = sinon.stub().resolves(settingsDoc);
    TranslateFrom = sinon.stub().returns('translated');
    UserContact = sinon.stub().resolves(userContactDoc);

    RulesEngineCore = {
      initialize: sinon.stub().resolves(true),
      isEnabled: sinon.stub().returns(true),
      fetchTasksFor: sinon.stub().resolves([]),
      updateEmissionsFor: sinon.stub(),
      rulesConfigChange: sinon.stub().returns(true),
    };

    module('inboxApp');
    module($provide => {
      $provide.value('$q', Q);
      $provide.value('Auth', Auth);
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
    });

    inject(($injector, _$translate_) => {
      sinon.stub(_$translate_, 'instant').returns('$translated');
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
        Auth.rejects();
        expectAsyncToThrow(getService().isEnabled, 'permission');
      });

      it('tasks disabled', async () => {
        Auth.withArgs('can_view_tasks').rejects();
        expect(await getService().isEnabled()).to.be.true;
        expect(RulesEngineCore.initialize.callCount).to.eq(1);
        expect(RulesEngineCore.initialize.args[0][3]).to.deep.eq({ enableTasks: false, enableTargets: true });
      });

      it('targets disabled', async () => {
        Auth.withArgs('can_view_analytics').rejects();
        expect(await getService().isEnabled()).to.be.true;
        expect(RulesEngineCore.initialize.callCount).to.eq(1);
        expect(RulesEngineCore.initialize.args[0][3]).to.deep.eq({ enableTasks: true, enableTargets: false });
      });

      it('disabled for online users', async () => {
        Session.isOnlineOnly.returns(true);
        expectAsyncToThrow(getService().isEnabled, 'permission');
      });

      it('disabled if initialize throws', async () => {
        RulesEngineCore.initialize.rejects('error');
        expectAsyncToThrow(getService().isEnabled, 'error');
      });

      it('parameters to shared-lib', async () => {
        expect(await getService().isEnabled()).to.be.true;
        expect(RulesEngineCore.initialize.callCount).to.eq(1);
        expect(RulesEngineCore.initialize.args[0][0]).to.have.property('get');
        expect(RulesEngineCore.initialize.args[0][1]).to.eq(settingsDoc);
        expect(RulesEngineCore.initialize.args[0][2]).to.eq(userContactDoc);
        expect(RulesEngineCore.initialize.args[0][3]).to.deep.eq({ enableTasks: true, enableTargets: true });
      });
    });

    describe('changes feeds', () => {
      const changeFeedFormat = doc => ({ id: doc._id, doc });
      const settingsDoc = { _id: 'settings' };
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

      for (let scenario of scenarios) {
        it(`trigger update for ${scenario.doc._id}`, async () => {
          expect(await getService().isEnabled()).to.be.true;
          const change = Changes.args[0][0];
          expect(change.filter(changeFeedFormat(scenario.doc))).to.be.true;
          change.callback(changeFeedFormat(scenario.doc));
          expect(RulesEngineCore.updateEmissionsFor.callCount).to.eq(1);
          expect(RulesEngineCore.updateEmissionsFor.args[0][1]).to.deep.eq(scenario.expected);
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
        settingsDoc,
        userContactDoc,
        userContactGrandparent,
      ];

      for (let scenarioDoc of cachebustScenarios) {
        it(`bust cache for settings ${scenarioDoc._id}`, async () => {
          expect(await getService().isEnabled()).to.be.true;
          const change = changeFeedFormat(scenarioDoc);
          const changeFeed = Changes.args[1][0];
          expect(changeFeed.filter(change)).to.be.true;
          await changeFeed.callback(change);
          expect(RulesEngineCore.rulesConfigChange.callCount).to.eq(1);
          expect(RulesEngineCore.rulesConfigChange.args[0]).to.deep.eq([settingsDoc, userContactDoc]);
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
      expect(RulesEngineCore.fetchTasksFor.args[0][0]).to.have.property('get');
      expect(RulesEngineCore.fetchTasksFor.args[0][1]).to.be.undefined;

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
      expect(RulesEngineCore.fetchTasksFor.args[0][0]).to.have.property('get');
      expect(RulesEngineCore.fetchTasksFor.args[0][1]).to.eq(contactIds);

      expect(actual.length).to.eq(1);
      expect(actual[0]).to.nested.include({
        _id: 'taskdoc',
        'emission.title': '$translated',
        'emission.priorityLabel': '$translated',
        'emission.other': true,
      });
    });
  });
});
