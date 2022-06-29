const sinon = require('sinon');
const rewire = require('rewire');
const _ = require('lodash');
const { expect } = require('chai');

const config = require('../../../../src/config');

let startupLog;
const initialActions = [
  {
    translation: 'api.startup.checks',
    text: undefined,
    display: true,
  },
  {
    translation: 'api.startup.install',
    text: undefined,
    display: false,
  },
  {
    translation: 'api.startup.index',
    text: undefined,
    display: false,
  },
  {
    translation: 'api.startup.config',
    text: undefined,
    display: true,
  },
  {
    translation: 'api.startup.migrate',
    text: undefined,
    display: true,
  },
  {
    translation: 'api.startup.forms',
    text: undefined,
    display: true,
  },
];

describe('StartUp log', () => {
  beforeEach(() => {
    startupLog = rewire('../../../../src/services/setup/startup-log');
    sinon.stub(config, 'translate');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should have correct actions', () => {
    const actions = startupLog.getProgress();
    expect(actions).to.deep.equal(initialActions);
  });

  describe('start', () => {
    it('should do nothing when action not found', () => {
      startupLog.start('not an action');
      const actions = startupLog.getProgress();
      expect(actions).to.deep.equal(initialActions);
    });

    it('should set the action as started', () => {
      startupLog.start('installationChecks');
      const actions = startupLog.getProgress();
      const expectedActions = _.cloneDeep(initialActions);
      expectedActions[0].started = true;

      expect(actions).to.deep.equal(expectedActions);
    });

    it('should set an non-displayed action to be displayed', () => {
      startupLog.start('install');
      const actions = startupLog.getProgress();
      const expectedActions = _.cloneDeep(initialActions);
      expectedActions[1].started = true;
      expectedActions[1].display = true;

      expect(actions).to.deep.equal(expectedActions);
    });

    it('should set the other started tasks as completed', () => {
      startupLog.start('installationChecks');
      startupLog.start('install');
      let actions = startupLog.getProgress();
      const expectedActions = _.cloneDeep(initialActions);
      expectedActions[0].started = true;
      expectedActions[0].completed = true;
      expectedActions[1].started = true;
      expectedActions[1].display = true;
      expect(actions).to.deep.equal(expectedActions);

      startupLog.start('index');
      actions = startupLog.getProgress();

      expectedActions[0].completed = true;
      expectedActions[1].completed = true;
      expectedActions[2].started = true;
      expectedActions[2].display = true;
      expect(actions).to.deep.equal(expectedActions);

      startupLog.start('migrate');
      actions = startupLog.getProgress();
      expectedActions[2].completed = true;
      expectedActions[4].started = true;
      expect(actions).to.deep.equal(expectedActions);
    });
  });

  describe('getProgress', () => {
    it('should translate actions texts', () => {
      config.translate.callsFake((key, locale) => `translated ${key} in ${locale}`);
      startupLog = rewire('../../../../src/services/setup/startup-log');
      const actions = startupLog.getProgress('thelocale');
      expect(actions).to.deep.equal([
        {
          translation: 'api.startup.checks',
          text: 'translated api.startup.checks in thelocale',
          display: true,
        },
        {
          translation: 'api.startup.install',
          text: 'translated api.startup.install in thelocale',
          display: false,
        },
        {
          translation: 'api.startup.index',
          text: 'translated api.startup.index in thelocale',
          display: false,
        },
        {
          translation: 'api.startup.config',
          text: 'translated api.startup.config in thelocale',
          display: true,
        },
        {
          translation: 'api.startup.migrate',
          text: 'translated api.startup.migrate in thelocale',
          display: true,
        },
        {
          translation: 'api.startup.forms',
          text: 'translated api.startup.forms in thelocale',
          display: true,
        },
      ]);

      expect(config.translate.callCount).to.equal(initialActions.length);
      expect(config.translate.args).to.deep.equal(initialActions.map(action => ([
        action.translation,
        'thelocale',
      ])));
    });
  });
});
