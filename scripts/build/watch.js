const Gaze = require('gaze').Gaze;
const { spawn } = require('child_process');
const rootdir = __dirname + '/../../';

const watchers = [];

const GAZE_OPTIONS = {
  interval: 1000 // how often the target should be polled in milliseconds
};

const configs = [
  // admin css
  { 
    files: [ 'admin/src/css/**/*' ],
    task: 'exec:less',
  },

  // admin-js
  {
    files: [ 'admin/src/js/**/*', 'shared-libs/*/src/**/*' ],
    task: 'exec:browserify-admin',
  },

  // admin-templates
  {
    files: [ 'admin/src/templates/**/*' ],
    task: 'exec:compile-admin-templates',
  },

  // webapp-js
  // instead of watching the source files which are watched separately, watch the build folder and upload on rebuild
  {
    files: [ 'api/build/static/webapp/**/*', '!api/build/static/webapp/service-worker.js' ],
    task: 'update-service-worker',
  },

  // api-public-files
  {
    files: [ 'api/src/public/**/*' ],
    task: 'exec:copy-api-resources',
  },

  // ddocs
  {
    files: [ 'ddocs/*-db/**/*' ],
    task: 'build-ddocs',
  },
];

const run = (task) => {
  const child = spawn('grunt', [ task ], { cwd: rootdir });
  child.stdout.on('data', data => console.log(data.toString()));
  child.stderr.on('data', data => console.error(data.toString()));
  child.on('error', err => console.error(err));
};

const startWatchers = () => {
  for (const config of configs) {
    const watcher = new Gaze(config.files, GAZE_OPTIONS);
    watchers.push(watcher);
    watcher.on('all', (event, filepath) => {
      console.log(`${filepath} updated...`);
      run(config.task);
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
  const watcher = new Gaze([ 'Gruntfile.js', 'package.json' ], GAZE_OPTIONS);
  watcher.on('all', (event, filepath) => {
    console.log(`${filepath} updated...`);
    clearWatchers();
    init();
  });
};

const init = () => {
  startWatchers();
  startConfigWatcher();
  console.log('watching...');
};

(() => {
  init();
})();
