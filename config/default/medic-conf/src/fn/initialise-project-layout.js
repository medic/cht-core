const path = require('path');

const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const { info } = require('../lib/log');

const LAYOUT = {
  'contact-summary.js': '',
  'privacy-policies.json': {},
  'privacy-policies': {},
  'resources.json': {},
  resources: {},
  'targets.js': 'module.exports = [];',
  'tasks.js': 'module.exports = [];',
  '.eslintrc': `{
  "env": {
    "node": true,
    "es6": true
  },
  "parserOptions": {
    "ecmaVersion": 6
  }
}`,
  forms: {
    app: {},
    collect: {},
    contact: {},
  },
  translations: {},
  app_settings: {
    'base_settings.json': {},
    'forms.json': {},
    'schedules.json': [],
  },
};

function createRecursively(dir, layout) {
  fs.mkdir(dir);

  for (const k in layout) {
    const path = `${dir}/${k}`;

    const val = layout[k];
    if (typeof val === 'object') {
      if (k.match(/.json$/)) {
        fs.writeJson(path, val);
      } else {
        createRecursively(path, val);
      }
    } else fs.write(path, val);
  }
}

function execute() {
  const { extraArgs } = environment;
  if(extraArgs && extraArgs.length) extraArgs.forEach(createProject);
  else createProject('.');

  function createProject(root) {
    const dir = path.join(environment.pathToProject, root);
    info(`Initialising project at ${dir}`);
    createRecursively(dir, LAYOUT);
  }
}

module.exports = {
  requiresInstance: false,
  execute
};
