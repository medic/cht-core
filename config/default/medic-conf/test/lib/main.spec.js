const rewire = require('rewire');
const sinon = require('sinon');
const { expect } = require('chai');

const environment = rewire('../../src/lib/environment');
const main = rewire('../../src/lib/main');
const userPrompt = rewire('../../src/lib/user-prompt');

const defaultActions = main.__get__('defaultActions');
const normalArgv = ['node', 'medic-conf'];

let mocks;
let readline;
describe('main', () => {
  beforeEach(() => {
    readline = {
      question: sinon.stub().returns('pwd'),
      keyInYN: sinon.stub().returns(true)
    };
    environment.__set__('state', {});
    sinon.spy(environment, 'initialize');
    userPrompt.__set__('readline', readline);
    mocks = {
      userPrompt: userPrompt,
      usage: sinon.stub(),
      shellCompletionSetup: sinon.stub(),
      error: sinon.stub(),
      info: sinon.stub(),
      checkMedicConfDependencyVersion: sinon.stub(),
      warn: sinon.stub(),
      executeAction: sinon.stub(),
      getApiUrl: sinon.stub().returns('http://api'),
      environment,
      fs: {
        path: {
          basename: () => 'basename',
          resolve: () => 'resolved',
        },
      },
    };

    for (let attr of Object.keys(mocks)) {
      main.__set__(attr, mocks[attr]);
    }
  });
  afterEach(() => {
    environment.initialize.restore();
  });

  it('no argv yields usage', async () => {
    await main([], {});
    expect(mocks.usage.calledOnce).to.be.true;
  });

  it('default argv yields usage', async () => {
    await main([...normalArgv], {});
    expect(mocks.usage.calledOnce).to.be.true;
  });

  it('--shell-completion', async () => {
    await main([...normalArgv, '--shell-completion=foo'], {});
    expect(mocks.shellCompletionSetup.calledOnce).to.be.true;
    expect(mocks.shellCompletionSetup.args[0]).to.deep.eq(['foo']);
  });

  it('--supported-actions', async () => {
    await main([...normalArgv, '--supported-actions'], {});
    expect(mocks.info.callCount).to.eq(1);
    expect(mocks.info.args[0]).to.include('Supported actions:\n');
  });

  it('--version', async () => {
    await main([...normalArgv, '--version'], {});
    expect(mocks.info.callCount).to.eq(1);
    expect(mocks.info.args[0]).to.match(/[0-9]+\.[0-9]+\.[0-9]/);
  });

  it('--skip-dependency-check', async () => {
    await main([...normalArgv, '--skip-dependency-check'], {});
    expect(mocks.checkMedicConfDependencyVersion.callCount).to.eq(0);
  });

  it('medic conf dependency checked', async () => {
    await main([...normalArgv, '--local'], {});
    expect(mocks.checkMedicConfDependencyVersion.calledOnce).to.be.true;
  });

  it('--local --accept-self-signed-certs', async () => {
    await main([...normalArgv, '--local', '--accept-self-signed-certs'], {});
    expect(mocks.executeAction.callCount).to.deep.eq(defaultActions.length);
    expect(main.__get__('process').env.NODE_TLS_REJECT_UNAUTHORIZED).to.eq('0');
  });

  it('errors if you do not provide an instance when required', async () => {
    mocks.getApiUrl.returns();

    await main([...normalArgv, 'backup-all-forms'], {});

    expect(mocks.executeAction.called).to.be.false;
  });

  it('supports actions that do not require an instance', async () => {
    await main([...normalArgv, 'initialise-project-layout'], {});
    expect(mocks.executeAction.callCount).to.deep.eq(1);
    expect(mocks.executeAction.args[0][0].name).to.eq('initialise-project-layout');
  });

  const expectExecuteActionBehavior = (expectedActions, expectedExtraParams, needsApi) => {
    if (Array.isArray(expectedActions)) {
      expect(mocks.executeAction.args.map(args => args[0].name)).to.deep.eq(expectedActions);
    } else {
      expect(mocks.executeAction.args[0][0].name).to.eq(expectedActions);
    }

    expect(mocks.environment.initialize.args[0][3]).to.deep.eq(expectedExtraParams);

    expect(mocks.environment.initialize.args[0][4]).to.eq(needsApi ? 'http://api' : undefined);
  };

  it('--local no COUCH_URL', async () => {
    await main([...normalArgv, '--local'], {});
    expectExecuteActionBehavior(defaultActions, undefined, true);
  });

  it('--local with COUCH_URL to localhost', async () => {
    const COUCH_URL = 'http://user:pwd@localhost:5988/medic';
    await main([...normalArgv, '--local'], { COUCH_URL });
    expectExecuteActionBehavior(defaultActions, undefined, true);
  });

  it('--instance + 2 ordered actions', async () => {
    await main([...normalArgv, '--instance=test.app', 'convert-app-forms', 'compile-app-settings'], {});
    expect(mocks.executeAction.callCount).to.deep.eq(2);
    expectExecuteActionBehavior('convert-app-forms', undefined);
    expect(mocks.executeAction.args[1][0].name).to.eq('compile-app-settings');
  });

  it('convert one form', async () => {
    const formName = 'form-name';
    await main([...normalArgv, '--local', 'convert-app-forms', '--', formName], {});
    expect(mocks.executeAction.callCount).to.deep.eq(1);
    expectExecuteActionBehavior('convert-app-forms', [formName]);
  });

  it('unsupported action', async () => {
    await main([...normalArgv, '--local', 'not-an-action'], {});
    expect(mocks.executeAction.called).to.be.false;
  });

  describe('--archive', () => {
    it('default actions', async () => {
      await main([...normalArgv, '--archive', '--destination=foo'], {});
      const executed = mocks.executeAction.args.map(args => args[0].name);
      expect(executed).to.include('upload-app-settings');
      expect(executed).to.not.include('delete-all-forms');
    });

    it('single action', async () => {
      await main([...normalArgv, '--archive', '--destination=foo', 'upload-app-settings'], {});
      expectExecuteActionBehavior('upload-app-settings', undefined, true);
      expect(readline.keyInYN.callCount).to.eq(0);
    });

    it('requires destination', async () => {
      const actual = await main([...normalArgv, '--archive', 'upload-app-settings'], {});
      expect(actual).to.eq(-1);
      expect(mocks.executeAction.called).to.be.false;
    });
  });

  it('accept non-matching instance warning', async () => {
    mocks.getApiUrl.returns('https://admin:pwd@url.app.medicmobile.org/medic');
    readline.keyInYN.returns(true);
    const actual = await main([...normalArgv, '---url=https://admin:pwd@url.app.medicmobile.org/']);
    expect(readline.keyInYN.callCount).to.eq(1);
    expect(actual).to.be.undefined;
  });

  it('reject non-matching instance warning', async () => {
    mocks.getApiUrl.returns('https://admin:pwd@url.app.medicmobile.org/medic');
    readline.keyInYN.returns(false);
    const actual = await main([...normalArgv, '---url=https://admin:pwd@url.app.medicmobile.org/']);
    expect(readline.keyInYN.callCount).to.eq(1);
    expect(actual).to.eq(false);
  });

  it('force option skips non-matching instance warning', async () => {
    mocks.getApiUrl.returns('https://admin:pwd@url.app.medicmobile.org/medic');
    environment.__set__('force', true);
    const actual = await main([...normalArgv, '---url=https://admin:pwd@url.app.medicmobile.org/', '--force']);
    expect(readline.keyInYN.callCount).to.eq(1);
    expect(actual).to.be.undefined;
  });
});
