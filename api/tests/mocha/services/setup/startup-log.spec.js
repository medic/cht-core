const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

let startupLog;
const initialActions = [
  {
    id: 'check',
    translation: 'Running installation checks',
    display: true,
  },
  {
    id: 'install',
    translation: 'Installing',
    display: false,
  },
  {
    id: 'index',
    translation: 'Indexing data',
    display: false,
  },
  {
    id: 'config',
    translation: 'Configuring CHT',
    display: true,
  },
  {
    id: 'migrate',
    translation: 'Migrating data',
    display: true,
  },
  {
    id: 'config_forms',
    translation: 'Configuring forms',
    display: true,
  },
];

const findAction = (actions, actionId) => actions.find(action => action.id === actionId);

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
      actions.forEach(action => {
        const initialAction = findAction(initialActions, action.id);
        if (action.id === 'check') {
          expect(action).to.deep.equal({ ...initialAction, started: true });
        } else {
          expect(action).to.deep.equal(initialAction);
        }
      });
    });

    it('should set an non-displayed action to be displayed', () => {
      startupLog.start('install');
      const actions = startupLog.getProgress();
      actions.forEach(action => {
        const initialAction = findAction(initialActions, action.id);
        if (action.id === 'install') {
          expect(action).to.deep.equal({ ...initialAction, started: true, display: true });
        } else {
          expect(action).to.deep.equal(initialAction);
        }
      });
    });

    it('should set the other started tasks as completed', () => {
      startupLog.start('check');
      startupLog.start('install');
      let actions = startupLog.getProgress();
      actions.forEach(action => {
        const initialAction = findAction(initialActions, action.id);
        if (action.id === 'check') {
          expect(action).to.deep.equal({ ...initialAction, started: true, completed: true });
        } else if (action.id === 'install') {
          expect(action).to.deep.equal({ ...initialAction, started: true, display: true });
        } else {
          expect(action).to.deep.equal(initialAction);
        }
      });

      startupLog.start('index');
      actions = startupLog.getProgress();
      actions.forEach(action => {
        const initialAction = findAction(initialActions, action.id);
        if (action.id === 'check') {
          expect(action).to.deep.equal({ ...initialAction, started: true, completed: true });
        } else if (action.id === 'install') {
          expect(action).to.deep.equal({ ...initialAction, started: true, display: true, completed: true });
        } else if (action.id === 'index') {
          expect(action).to.deep.equal({ ...initialAction, started: true, display: true });
        } else {
          expect(action).to.deep.equal(initialAction);
        }
      });

      startupLog.start('migrate');
      actions = startupLog.getProgress();

      actions.forEach(action => {
        const initialAction = findAction(initialActions, action.id);
        if (action.id === 'check') {
          expect(action).to.deep.equal({ ...initialAction, started: true, completed: true });
        } else if (action.id === 'install') {
          expect(action).to.deep.equal({ ...initialAction, started: true, display: true, completed: true });
        } else if (action.id === 'index') {
          expect(action).to.deep.equal({ ...initialAction, started: true, display: true, completed: true });
        } else if (action.id === 'migrate') {
          expect(action).to.deep.equal({ ...initialAction, started: true });
        } else {
          expect(action).to.deep.equal(initialAction);
        }
      });
    });
  });
});
