const Gaze = require('gaze').Gaze;
const { spawn } = require('child_process');
const rootdir = __dirname + '/../../';

const watchers = [];

const DEBOUNCE = 10; // 10 ms
const GAZE_OPTIONS = {
  interval: 1000 // how often the target should be polled in milliseconds
};

const configs = [
  // admin css
  { 
    files: [ 'admin/src/css/**/*' ],
    cmd: 'lessc',
    args: [ 'admin/src/css/main.less', 'api/build/static/admin/css/main.css' ]
  },

  // admin-js
  {
    files: [ 'admin/src/js/**/*', 'shared-libs/*/src/**/*' ],
    cmd: './scripts/build/browserify-admin.sh',
    args: [ ]
  },

  // admin-templates
  {
    files: [ 'admin/src/templates/**/*' ],
    cmd: 'node',
    args: [ './scripts/build/build-angularjs-template-cache.js' ]
  },

  // webapp-js
  // instead of watching the source files which are watched separately, watch the build folder and upload on rebuild
  {
    files: [ 'api/build/static/webapp/**/*', '!api/build/static/webapp/service-worker.js' ],
    cmd: 'npm',
    args: [ 'run', 'update-service-worker' ]
  },

  // api-public-files
  {
    files: [ 'api/src/public/**/*' ],
    cmd: 'npm',
    args: [ 'run', 'copy-api-resources' ]
  },

  // ddocs
  {
    files: [ 'ddocs/*-db/**/*' ],
    cmd: 'npm',
    args: [ 'run', 'build-ddocs' ]
  },
];

// debounce to make sure the task isn't run multiple times
const debounceCache = {};

const run = ({ cmd, args }) => {
  const name = `${cmd}-${args.join('-')}`;
  if (debounceCache[name]) {
    clearTimeout(debounceCache[name]);
  }
  debounceCache[name] = setTimeout(() => {
    const child = spawn(cmd, args, { cwd: rootdir });
    child.stdout.on('data', data => console.log(data.toString()));
    child.stderr.on('data', data => console.error(data.toString()));
    child.on('error', err => console.error(err));
    child.on('close', () => console.log('Update complete.\nWaiting...'));
  }, DEBOUNCE);
};

const startWatchers = () => {
  for (const config of configs) {
    const watcher = new Gaze(config.files, GAZE_OPTIONS);
    watchers.push(watcher);
    watcher.on('all', (event, filepath) => {
      console.log(`${filepath} updated...`);
      run(config);
    });
  }
};

const clearWatchers = () => {
  for (const watcher of watchers) {
    watcher.close();
  }
  watchers.length = 0;
};

const startConfigWatcher = () => {
  const watcher = new Gaze([ 'package.json' ], GAZE_OPTIONS);
  watcher.on('all', (event, filepath) => {
    console.log(`${filepath} updated...`);
    clearWatchers();
    init();
  });
};

const init = () => {
  startWatchers();
  startConfigWatcher();
  console.log('Waiting...');
};

(() => {
  init();
})();
