const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

let startupLog;
const initialActions = {
  serverChecks: {
    translation: 'Running server checks',
    display: true,
  },
  installationChecks: {
    translation: 'Running installation checks',
    display: true,
  },
  install: {
    translation: 'Installing',
    display: false,
  },
  index: {
    translation: 'Indexing data',
    display: false,
  },
  config: {
    translation: 'Configuring CHT',
    display: true,
  },
  migrate: {
    translation: 'Migrating data',
    display: true,
  },
  configForms: {
    translation: 'Configuring forms',
    display: true,
  }
};

describe('StartUp log', () => {
  beforeEach(() => {
    startupLog = rewire('../../../../src/services/setup/startup-log');
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
      startupLog.start('check');
      const actions = startupLog.getProgress();
      for (const [actionId, action] of Object.entries(actions)) {
        const initialAction = initialActions[actionId];
        if (actionId === 'check') {
          expect(action).to.deep.equal({ ...initialAction, started: true });
        } else {
          expect(action).to.deep.equal(initialAction);
        }
      }
    });

    it('should set an non-displayed action to be displayed', () => {
      startupLog.start('install');
      const actions = startupLog.getProgress();
      for (const [actionId, action] of Object.entries(actions)) {
        const initialAction = initialActions[actionId];
        if (actionId === 'install') {
          expect(action).to.deep.equal({ ...initialAction, started: true, display: true });
        } else {
          expect(action).to.deep.equal(initialAction);
        }
      }
    });

    it('should set the other started tasks as completed', () => {
      startupLog.start('check');
      startupLog.start('install');
      let actions = startupLog.getProgress();

      for (const [actionId, action] of Object.entries(actions)) {
        const initialAction = initialActions[actionId];
        if (actionId === 'check') {
          expect(action).to.deep.equal({ ...initialAction, started: true, display: true });
        } else if (actionId === 'install') {
          expect(action).to.deep.equal({ ...initialAction, started: true, display: true });
        } else {
          expect(action).to.deep.equal(initialAction);
        }
      }

      startupLog.start('index');
      actions = startupLog.getProgress();

      for (const [actionId, action] of Object.entries(actions)) {
        const initialAction = initialActions[actionId];
        if (actionId === 'check') {
          expect(action).to.deep.equal({ ...initialAction, started: true, completed: true });
        } else if (actionId === 'install') {
          expect(action).to.deep.equal({ ...initialAction, started: true, display: true, completed: true });
        } else if (actionId === 'index') {
          expect(action).to.deep.equal({ ...initialAction, started: true, display: true });
        } else {
          expect(action).to.deep.equal(initialAction);
        }
      }

      startupLog.start('migrate');
      actions = startupLog.getProgress();

      for (const [actionId, action] of Object.entries(actions)) {
        const initialAction = initialActions[actionId];
        if (actionId === 'check') {
          expect(action).to.deep.equal({ ...initialAction, started: true, completed: true });
        } else if (actionId === 'install') {
          expect(action).to.deep.equal({ ...initialAction, started: true, display: true, completed: true });
        } else if (actionId === 'index') {
          expect(action).to.deep.equal({ ...initialAction, started: true, display: true, completed: true });
        } else if (actionId === 'migrate') {
          expect(action).to.deep.equal({ ...initialAction, started: true });
        } else {
          expect(action).to.deep.equal(initialAction);
        }
      }
    });
  });
});
