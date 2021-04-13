const open = require('open');
const checkForUpdates = require('../lib/check-for-updates');
const checkMedicConfDependencyVersion = require('../lib/check-medic-conf-dependency-version');
const environment = require('./environment');
const fs = require('../lib/sync-fs');
const getApiUrl = require('../lib/get-api-url');
const log = require('../lib/log');
const userPrompt = require('../lib/user-prompt');
const redactBasicAuth = require('redact-basic-auth');
const shellCompletionSetup = require('../cli/shell-completion-setup');
const supportedActions = require('../cli/supported-actions');
const usage = require('../cli/usage');

const { error, info, warn } = log;
const defaultActions = [
  'check-git',
  'compile-app-settings',
  'backup-app-settings',
  'upload-app-settings',
  'convert-app-forms',
  'convert-collect-forms',
  'convert-contact-forms',
  'backup-all-forms',
  'delete-all-forms',
  'upload-app-forms',
  'upload-collect-forms',
  'upload-contact-forms',
  'upload-resources',
  'upload-branding',
  'upload-partners',
  'upload-custom-translations',
  'upload-privacy-policies',
];
const defaultArchiveActions = [
  'compile-app-settings',
  'upload-app-settings',
  'convert-app-forms',
  'convert-collect-forms',
  'convert-contact-forms',
  'upload-app-forms',
  'upload-collect-forms',
  'upload-contact-forms',
  'upload-resources',
  'upload-branding',
  'upload-partners',
  'upload-custom-translations',
  'upload-privacy-policies',
];

module.exports = async (argv, env) => {
  // No params at all
  if(argv.length <= 2) {
    usage(0);
    return -1;
  }

  const cmdArgs = require('minimist')(argv.slice(2), {
    boolean: true,
    '--': true
  });

  //
  // General single use actions
  //
  if (cmdArgs.help) {
    usage(0);
    return 0;
  }

  if (cmdArgs['shell-completion']) {
    return shellCompletionSetup(cmdArgs['shell-completion']);
  }

  if (cmdArgs['supported-actions']) {
    info('Supported actions:\n', supportedActions.join('\n  '));
    return 0;
  }

  if (cmdArgs.version) {
    info(require('../../package.json').version);
    return 0;
  }

  if (cmdArgs.changelog) {
    await open('https://github.com/medic/medic-conf/releases', { url: true });
    return process.exit(0);
  }

  if (cmdArgs.archive && !cmdArgs.destination) {
    error('--destination=<path to save files> is required with --archive.');
    return -1;
  }

  if (cmdArgs['accept-self-signed-certs']) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
  }

  //
  // Logging
  //
  if (cmdArgs.silent) {
    log.level = log.LEVEL_NONE;
  } else if (cmdArgs.verbose) {
    log.level = log.LEVEL_TRACE;
  } else {
    log.level = log.LEVEL_INFO;
  }

  //
  // Dependency check
  //
  const pathToProject = fs.path.resolve(cmdArgs.source || '.');
  if (!cmdArgs['skip-dependency-check']) {
    checkMedicConfDependencyVersion(pathToProject);
  }

  //
  // Build up actions
  //
  let actions = cmdArgs._;
  if (!actions.length) {
    actions = !cmdArgs.archive ? defaultActions : defaultArchiveActions;
  }

  const unsupported = actions.filter(a => !supportedActions.includes(a));
  if(unsupported.length) {
    error(`Unsupported action(s): ${unsupported.join(' ')}`);
    return -1;
  }

  if (cmdArgs['skip-git-check']) {
    actions = actions.filter(a => a !== 'check-git');
  }

  actions = actions.map(actionName => {
    const action = require(`../fn/${actionName}`);

    if (typeof action.execute !== 'function') {
      throw new Error(`${actionName} has not been implemented correctly: no 'execute' function`);
    }

    if (!Object.hasOwnProperty.call(action, 'requiresInstance')) {
      action.requiresInstance = true;
    }

    action.name = actionName;

    return action;
  });

  //
  // Initialize the environment
  //
  const projectName = fs.path.basename(pathToProject);

  let apiUrl;
  if (actions.some(action => action.requiresInstance)) {
    apiUrl = getApiUrl(cmdArgs, env);
    if (!apiUrl) {
      error('Failed to obtain a url to the API');
      return -1;
    }
  }

  let extraArgs = cmdArgs['--'];
  if (!extraArgs.length) {
    extraArgs = undefined;
  }

  environment.initialize(
    pathToProject,
    !!cmdArgs.archive,
    cmdArgs.destination,
    extraArgs,
    apiUrl,
    cmdArgs.force,
    cmdArgs['skip-translation-check']
  );

  const productionUrlMatch = environment.instanceUrl && environment.instanceUrl.match(/^https:\/\/(?:[^@]*@)?(.*)\.(app|dev)\.medicmobile\.org(?:$|\/)/);
  const expectedOptions = ['alpha', projectName];
  if (productionUrlMatch && !expectedOptions.includes(productionUrlMatch[1])) {
    warn(`Attempting to use project for \x1b[31m${projectName}\x1b[33m`,
        `against non-matching instance: \x1b[31m${redactBasicAuth(environment.instanceUrl)}\x1b[33m`);
    if(!userPrompt.keyInYN()) {
      error('User failed to confirm action.');
      return false;
    }
  }

  //
  // GO GO GO
  //
  info(`Processing config in ${projectName}.`);
  info('Actions:\n     -', actions.map(({name}) => name).join('\n     - '));

  const skipCheckForUpdates = cmdArgs.check === false;
  if (actions.some(action => action.name === 'check-for-updates') && !skipCheckForUpdates) {
    await checkForUpdates({ nonFatal: true });
  }

  for (let action of actions) {
    info(`Starting action: ${action.name}…`);
    await executeAction(action);
    info(`${action.name} complete.`);
  }

  if (actions.length > 1) {
    await info('All actions completed.');
  }
};

// Exists for generic mocking purposes
const executeAction = action => action.execute();
