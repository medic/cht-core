const sinon = require('sinon');
const rewire = require('rewire');
const _ = require('lodash');
const { expect } = require('chai');

const config = require('../../../../src/config');

let startupLog;
const initialActions = {
  checks: {
    translation: 'api.startup.checks',
    text: undefined,
    display: true,
  },
  install: {
    translation: 'api.startup.install',
    text: undefined,
    display: false,
  },
  index: {
    translation: 'api.startup.index',
    text: undefined,
    display: false,
  },
  config: {
    translation: 'api.startup.config',
    text: undefined,
    display: true,
  },
  migrate: {
    translation: 'api.startup.migrate',
    text: undefined,
    display: true,
  },
  forms: {
    translation: 'api.startup.forms',
    text: undefined,
    display: true,
  },
};

describe('StartUp log', () => {
  beforeEach(() => {
    startupLog = rewire('../../../../src/services/setup/startup-log');
    sinon.stub(config, 'translate');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should have correct actions', () => {
    const progress = startupLog.getProgress();
    expect(progress).to.deep.equal({
      actions: initialActions,
      completed: false,
    });
  });

  describe('start', () => {
    it('should do nothing when action not found', () => {
      startupLog.start('not an action');
      const progress = startupLog.getProgress();
      expect(progress).to.deep.equal({
        actions: initialActions,
        completed: false,
      });
    });

    it('should set the action as started', () => {
      startupLog.start('checks');
      const progress = startupLog.getProgress();
      const expectedActions = _.cloneDeep(initialActions);
      expectedActions.checks.started = true;

      expect(progress).to.deep.equal({
        actions: expectedActions,
        completed: false,
      });
    });

    it('should set an non-displayed action to be displayed', () => {
      startupLog.start('install');
      const progress = startupLog.getProgress();
      const expectedActions = _.cloneDeep(initialActions);
      expectedActions.install.started = true;
      expectedActions.install.display = true;

      expect(progress).to.deep.equal({
        actions: expectedActions,
        completed: false,
      });
    });

    it('should set the other started tasks as completed', () => {
      startupLog.start('checks');
      startupLog.start('install');
      let progress = startupLog.getProgress();
      const expectedActions = _.cloneDeep(initialActions);
      expectedActions.checks.started = true;
      expectedActions.checks.completed = true;

      expectedActions.install.started = true;
      expectedActions.install.display = true;

      expect(progress).to.deep.equal({
        actions: expectedActions,
        completed: false,
      });

      startupLog.start('index');
      progress = startupLog.getProgress();

      expectedActions.install.completed = true;
      expectedActions.index.display = true;
      expectedActions.index.started = true;

      expect(progress).to.deep.equal({
        actions: expectedActions,
        completed: false,
      });

      startupLog.start('migrate');
      progress = startupLog.getProgress();
      expectedActions.index.completed = true;
      expectedActions.migrate.started = true;

      expect(progress).to.deep.equal({
        actions: expectedActions,
        completed: false,
      });
    });
  });

  describe('getProgress', () => {
    it('should translate actions texts', () => {
      config.translate.callsFake((key, locale) => `translated ${key} in ${locale}`);
      startupLog = rewire('../../../../src/services/setup/startup-log');
      const progress = startupLog.getProgress('thelocale');

      expect(progress).to.deep.equal({
        actions: {
          checks: {
            translation: 'api.startup.checks',
            text: 'translated api.startup.checks in thelocale',
            display: true,
          },
          install: {
            translation: 'api.startup.install',
            text: 'translated api.startup.install in thelocale',
            display: false,
          },
          index: {
            translation: 'api.startup.index',
            text: 'translated api.startup.index in thelocale',
            display: false,
          },
          config: {
            translation: 'api.startup.config',
            text: 'translated api.startup.config in thelocale',
            display: true,
          },
          migrate: {
            translation: 'api.startup.migrate',
            text: 'translated api.startup.migrate in thelocale',
            display: true,
          },
          forms: {
            translation: 'api.startup.forms',
            text: 'translated api.startup.forms in thelocale',
            display: true,
          },
        },
        completed: false,
      });

      expect(config.translate.callCount).to.equal(Object.keys(initialActions).length);
      expect(config.translate.args).to.deep.equal(Object.values(initialActions).map(action => ([
        action.translation,
        'thelocale',
      ])));
    });
  });

  it('should return as completed when all initially displayed actions are completed', () => {
    startupLog.start('checks');
    startupLog.start('config');
    startupLog.start('migrate');
    startupLog.start('forms');
    startupLog.complete();

    expect(startupLog.getProgress().completed).to.equal(true);
  });

  it('should return as completed when all displayed actions are completed', () => {
    startupLog.start('checks');
    startupLog.start('install');
    startupLog.start('config');
    startupLog.start('migrate');
    startupLog.start('forms');
    startupLog.complete();

    expect(startupLog.getProgress().completed).to.equal(true);
  });

  it('should return as not completed when at least one displayed action is not completed', () => {
    startupLog.start('checks');
    startupLog.start('install');
    startupLog.start('config');
    startupLog.start('migrate');

    expect(startupLog.getProgress().completed).to.equal(false);
  });
});
