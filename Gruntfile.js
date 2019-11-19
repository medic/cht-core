/* eslint-disable max-len */

const url = require('url');
const packageJson = require('./package.json');
const fs = require('fs');
const path = require('path');

const {
  TRAVIS_TAG,
  TRAVIS_BRANCH,
  COUCH_URL,
  COUCH_NODE_NAME,
  UPLOAD_URL,
  STAGING_SERVER,
  BUILDS_SERVER,
  TRAVIS_BUILD_NUMBER
} = process.env;

const releaseName = TRAVIS_TAG || TRAVIS_BRANCH || 'local-development';
const ESLINT_COMMAND = './node_modules/.bin/eslint --color';

const couchConfig = (() => {
  if (!COUCH_URL) {
    throw 'Required environment variable COUCH_URL is undefined. (eg. http://your:pass@localhost:5984/medic)';
  }
  const parsedUrl = url.parse(COUCH_URL);
  if (!parsedUrl.auth) {
    throw 'COUCH_URL must contain admin authentication information';
  }

  const [ username, password ] = parsedUrl.auth.split(':', 2);

  return {
    username,
    password,
    dbName: parsedUrl.path.substring(1),
    withPath: path => `${parsedUrl.protocol}//${parsedUrl.auth}@${parsedUrl.host}/${path}`,
    withPathNoAuth: path => `${parsedUrl.protocol}//${parsedUrl.host}/${path}`,
  };
})();

const getSharedLibDirs = () => {
  return fs
    .readdirSync('shared-libs')
    .filter(file => fs.lstatSync(`shared-libs/${file}`).isDirectory());
};

const copySharedLibs = [
  'rm -rf ../shared-libs/*/node_modules/@medic',
  'mkdir ./node_modules/@medic',
  'cp -RP ../shared-libs/* ./node_modules/@medic'
].join( '&& ');

const linkSharedLibs = dir => {
  const sharedLibPath = lib => path.resolve(__dirname, 'shared-libs', lib);
  const symlinkPath = lib => path.resolve(__dirname, dir, 'node_modules', '@medic', lib);
  return [
    'mkdir ./node_modules/@medic',
    ...getSharedLibDirs().map(lib => `ln -s ${sharedLibPath(lib)} ${symlinkPath(lib)}`)
  ].join(' && ');
};

module.exports = function(grunt) {
  'use strict';

  require('jit-grunt')(grunt, {
    'couch-compile': 'grunt-couch',
    'couch-push': 'grunt-couch',
    ngtemplates: 'grunt-angular-templates',
    protractor: 'grunt-protractor-runner',
    replace: 'grunt-text-replace',
    uglify: 'grunt-contrib-uglify-es',
  });
  require('./grunt/service-worker')(grunt);
  require('time-grunt')(grunt);

  // Project configuration
  grunt.initConfig({
    replace: {
      'change-ddoc-id-for-testing': {
        src: ['build/ddocs/medic.json'],
        overwrite: true,
        replacements: [
          {
            from: '"_id": "_design/medic"',
            to: `"_id": "medic:medic:test-${TRAVIS_BUILD_NUMBER}"`,
          },
        ],
      },
    },
    'couch-compile': {
      primary: {
        files: {
          'build/ddocs/medic.json': 'build/ddocs/medic/',
        },
      },
      secondary: {
        files: {
          'build/ddocs/medic/_attachments/ddocs/compiled.json':
            'build/ddocs/medic-*/',
        },
      },
    },
    'couch-push': {
      localhost: {
        options: {
          user: couchConfig.username,
          pass: couchConfig.password,
        },
        files: {
          [couchConfig.withPathNoAuth(couchConfig.dbName)]: 'build/ddocs/medic.json',
        },
      },
      // push just the secondary ddocs to save time in dev
      'localhost-secondary': {
        options: {
          user: couchConfig.username,
          pass: couchConfig.password,
        },
        files: {
          [couchConfig.withPathNoAuth(couchConfig.dbName)]: 'build/ddocs/medic/_attachments/ddocs/compiled.json',
        }
      },
      test: {
        options: {
          user: couchConfig.username,
          pass: couchConfig.password,
        },
        files: {
          ['http://admin:pass@localhost:4984/medic-test']: 'build/ddocs/medic.json',
        },
      },
      staging: {
        files: [
          {
            src: 'build/ddocs/medic.json',
            dest: `${UPLOAD_URL}/${STAGING_SERVER}`,
          },
        ],
      },
      testing: {
        files: [
          {
            src: 'build/ddocs/medic.json',
            dest: `${UPLOAD_URL}/${BUILDS_SERVER}`,
          },
        ],
      }
    },
    browserify: {
      options: {
        browserifyOptions: {
          debug: true,
        },
      },
      webapp: {
        src: 'webapp/src/js/app.js',
        dest: 'build/ddocs/medic/_attachments/js/inbox.js',
        browserifyOptions: {
          detectGlobals: false,
        },
        options: {
          transform: [
            ['babelify', {
              presets: [['@babel/preset-env', {
                targets: { esmodules: true },
                exclude: ['babel-plugin-transform-classes']
              }]],
              global: true,
              compact: false,
              only: [/^.*\/node_modules\/enketo-core\/.*$/]
            }],
            'browserify-ngannotate'
          ],
          alias: {
            'enketo-config': './webapp/src/js/enketo/config.json',
            'enketo/widgets': './webapp/src/js/enketo/widgets',
            'enketo/file-manager': './webapp/src/js/enketo/file-manager',
            './xpath-evaluator-binding': './webapp/src/js/enketo/OpenrosaXpathEvaluatorBinding',
            'extended-xpath': './webapp/node_modules/openrosa-xpath-evaluator/src/extended-xpath',
            'openrosa-xpath-extensions': './webapp/node_modules/openrosa-xpath-evaluator/src/openrosa-xpath-extensions',
            // translator for enketo's internal i18n
            'translator': './webapp/src/js/enketo/translator',
            // enketo currently duplicates bootstrap's dropdown code.  working to resolve this upstream
            // https://github.com/enketo/enketo-core/issues/454
            '../../js/dropdown.jquery': './webapp/node_modules/bootstrap/js/dropdown',
            'angular-translate-interpolation-messageformat': './webapp/node_modules/angular-translate/dist/angular-translate-interpolation-messageformat/angular-translate-interpolation-messageformat',
            'angular-translate-handler-log': './webapp/node_modules/angular-translate/dist/angular-translate-handler-log/angular-translate-handler-log',
            'bikram-sambat': './webapp/node_modules/bikram-sambat',
            'moment': './webapp/node_modules/moment',
            'lodash/core': './webapp/node_modules/lodash/core',
            'lodash/intersection': './webapp/node_modules/lodash/intersection',
            'lodash/uniq': './webapp/node_modules/lodash/uniq',
            'lodash/uniqBy': './webapp/node_modules/lodash/uniqBy',
            'lodash/groupBy': './webapp/node_modules/lodash/groupBy',
          },
        },
      },
      admin: {
        src: 'admin/src/js/main.js',
        dest: 'build/ddocs/medic-admin/_attachments/js/main.js',
        options: {
          transform: ['browserify-ngannotate'],
          alias: {
            'angular-translate-interpolation-messageformat': './admin/node_modules/angular-translate/dist/angular-translate-interpolation-messageformat/angular-translate-interpolation-messageformat',
            'google-libphonenumber': './admin/node_modules/google-libphonenumber',
            'gsm': './admin/node_modules/gsm',
            'object-path': './admin/node_modules/object-path',
            'bikram-sambat': './admin/node_modules/bikram-sambat',
            '@medic/phone-number': './admin/node_modules/@medic/phone-number',
            'lodash/core': './admin/node_modules/lodash/core',
          },
        },
      },
    },
    uglify: {
      options: {
        banner:
          '/*! Medic Mobile <%= grunt.template.today("yyyy-mm-dd") %> */\n',
      },
      web: {
        files: {
          // webapp files
          'build/ddocs/medic/_attachments/js/templates.js': 'build/ddocs/medic/_attachments/js/templates.js',
          'build/ddocs/medic/_attachments/js/inbox.js': 'build/ddocs/medic/_attachments/js/inbox.js',
          'build/ddocs/medic/_attachments/js/service-worker.js': 'build/ddocs/medic/_attachments/js/service-worker.js',

          // admin files
          'build/ddocs/medic-admin/_attachments/js/main.js': 'build/ddocs/medic-admin/_attachments/js/main.js',
          'build/ddocs/medic-admin/_attachments/js/templates.js': 'build/ddocs/medic-admin/_attachments/js/templates.js'
        },
      },
      api: {
        files: {
          // public api files
          'api/build/public/login/script.js': 'api/build/public/login/script.js',
        }
      }
    },
    env: {
      'unit-test': {
        options: {
          add: {
            UNIT_TEST_ENV: '1',
          },
        },
      }
    },
    less: {
      webapp: {
        files: {
          'build/ddocs/medic/_attachments/css/inbox.css':
            'webapp/src/css/inbox.less',
        },
      },
      admin: {
        files: {
          'build/ddocs/medic-admin/_attachments/css/main.css':
            'admin/src/css/main.less',
        },
      },
    },
    cssmin: {
      web: {
        options: {
          keepSpecialComments: 0,
        },
        files: {
          'build/ddocs/medic/_attachments/css/inbox.css': 'build/ddocs/medic/_attachments/css/inbox.css',
          'build/ddocs/medic-admin/_attachments/css/main.css': 'build/ddocs/medic-admin/_attachments/css/main.css',
        },
      },
      api: {
        options: {
          keepSpecialComments: 0,
        },
        files: {
          'api/build/public/login/style.css': 'api/build/public/login/style.css',
        },
      }
    },
    postcss: {
      options: {
        processors: [
          require('autoprefixer')(),
        ],
      },
      dist: {
        src: 'build/ddocs/medic/_attachments/css/*.css',
      },
    },
    'generate-service-worker': {
      config: {
        staticDirectoryPath: 'build/ddocs/medic/_attachments',
        apiSrcDirectoryPath: 'api/src',
        scriptOutputPath: 'build/ddocs/medic/_attachments/js/service-worker.js',
      }
    },
    copy: {
      ddocs: {
        expand: true,
        cwd: 'ddocs/',
        src: '**/*',
        dest: 'build/ddocs/',
      },
      webapp: {
        expand: true,
        flatten: true,
        src: 'webapp/node_modules/font-awesome/fonts/*',
        dest: 'build/ddocs/medic/_attachments/fonts/',
      },
      'inbox-file-attachment': {
        expand: true,
        cwd: 'webapp/src/',
        src: 'templates/inbox.html',
        dest: 'build/ddocs/medic/_attachments/',
      },
      'ddoc-attachments': {
        expand: true,
        cwd: 'webapp/src/',
        src: [
          'audio/**/*',
          'fonts/**/*',
          'img/**/*',
          'templates/inbox.html',
          'ddocs/medic/_attachments/**/*',
        ],
        dest: 'build/ddocs/medic/_attachments/',
      },
      'api-resources': {
        expand: true,
        cwd: 'api/src/public/',
        src: '**/*',
        dest: 'api/build/public/',
      },
      'admin-resources': {
        files: [
          {
            expand: true,
            flatten: true,
            src: 'admin/src/templates/index.html',
            dest: 'build/ddocs/medic-admin/_attachments/',
          },
          {
            expand: true,
            flatten: true,
            src: [
              'admin/node_modules/font-awesome/fonts/*',
              'webapp/src/fonts/**/*'
            ],
            dest: 'build/ddocs/medic-admin/_attachments/fonts/',
          },
        ],
      },
      'libraries-to-patch': {
        expand: true,
        cwd: 'webapp/node_modules',
        src: [
          'bootstrap-daterangepicker/**',
          'font-awesome/**',
          'messageformat/**',
          'moment/**'
        ],
        dest: 'webapp/node_modules_backup',
      },
      'test-libraries-to-patch': {
        expand: true,
        cwd: 'node_modules',
        src: [
          'protractor/node_modules/webdriver-manager/**'
        ],
        dest: 'node_modules_backup',
      },
    },
    exec: {
      'clean-build-dir': {
        cmd: 'rm -rf build && mkdir build',
      },
      // Running this via exec instead of inside the grunt process makes eslint
      // run ~4x faster. For some reason. Maybe cpu core related.
      'eslint': {
        cmd: () => {
          const paths = [
            'Gruntfile.js',
            'admin/**/*.js',
            'api/**/*.js',
            'ddocs/**/*.js',
            'sentinel/**/*.js',
            'shared-libs/**/*.js',
            'tests/**/*.js',
            'webapp/src/**/*.js',
            'webapp/tests/**/*.js',
            'config/**/*.js',
            'scripts/**/*.js',
          ];
          const ignore = [
            'webapp/src/js/modules/xpath-element-path.js',
            'api/src/extracted-resources/**/*',
            'api/build/**/*',
            '**/node_modules/**',
            'build/**',
            'shared-libs/transitions/src/lib/pupil/**',
          ];

          return [ESLINT_COMMAND]
            .concat(ignore.map(glob => `--ignore-pattern "${glob}"`))
            .concat(paths.map(glob => `"${glob}"`))
            .join(' ');
        }
      },
      'eslint-sw': `${ESLINT_COMMAND} build/ddocs/medic/_attachments/js/service-worker.js`,
      'pack-node-modules': {
        cmd: ['api', 'sentinel']
          .map(module =>
            [
              `cd ${module}`,
              `npm ci --production`,
              `${copySharedLibs}`,
              `npm dedupe`,
              `npm pack`,
              `ls -l medic-${module}-0.1.0.tgz`,
              `mv medic-*.tgz ../build/ddocs/medic/_attachments/`,
              `cd ..`,
            ].join(' && ')
          )
          .join(' && '),
      },
      'bundle-dependencies': {
        cmd: () => {
          ['api', 'sentinel'].forEach(module => {
            const filePath = `${module}/package.json`;
            const pkg = this.file.readJSON(filePath);
            pkg.bundledDependencies = Object.keys(pkg.dependencies);
            if (pkg.sharedLibs) {
              pkg.sharedLibs.forEach(lib => pkg.bundledDependencies.push(`@medic/${lib}`));
            }
            this.file.write(filePath, JSON.stringify(pkg, undefined, '  ') + '\n');
            console.log(`Updated 'bundledDependencies' for ${filePath}`); // eslint-disable-line no-console
          });
          return 'echo "Node module dependencies updated"';
        },
      },
      'set-ddoc-version': {
        cmd: () => {
          let version;
          if (TRAVIS_TAG) {
            version = TRAVIS_TAG;
          } else {
            version = packageJson.version;
            if (TRAVIS_BRANCH === 'master') {
              version += `-alpha.${TRAVIS_BUILD_NUMBER}`;
            }
          }
          return `echo "${version}" > build/ddocs/medic/version`;
        },
      },
      'set-horticulturalist-metadata': {
        cmd: () => `
          mkdir -p build/ddocs/medic/build_info;
          cd build/ddocs/medic/build_info;
          echo "${releaseName}" > version;
          echo "${packageJson.version}" > base_version;
          echo "${new Date().toISOString()}" > time;
          echo "grunt on \`whoami\`" > author;`,
      },
      'api-dev': {
        cmd:
          'TZ=UTC ./node_modules/.bin/nodemon --ignore "api/src/extracted-resources/**" --watch api --watch "shared-libs/**/src/**" api/server.js -- --allow-cors',
      },
      'sentinel-dev': {
        cmd:
          'TZ=UTC ./node_modules/.bin/nodemon --watch sentinel --watch "shared-libs/**/src/**" sentinel/server.js',
      },
      'blank-link-check': {
        cmd: `echo "Checking for dangerous _blank links..." &&
               ! (git grep -E  'target\\\\?="_blank"' -- webapp/src admin/src |
                      grep -Ev 'target\\\\?="_blank" rel\\\\?="noopener noreferrer"' |
                      grep -Ev '^\\s*//' &&
                  echo 'ERROR: Links found with target="_blank" but no rel="noopener noreferrer" set.  Please add required rel attribute.')`,
      },
      'setup-admin': {
        cmd:
          ` curl -X PUT ${couchConfig.withPath('_node/' + COUCH_NODE_NAME + '/_config/admins/admin')} -d '"${couchConfig.password}"'` +
          ` && curl -X PUT --data '"true"' ${couchConfig.withPath('_node/' + COUCH_NODE_NAME + '/_config/chttpd/require_valid_user')}` +
          ` && curl -X PUT --data '"4294967296"' ${couchConfig.withPath('_node/' + COUCH_NODE_NAME + '/_config/httpd/max_http_request_size')}` +
          ` && curl -X PUT ${couchConfig.withPath(couchConfig.dbName)}`
      },
      'setup-test-database': {
        cmd: [
          `docker run -d -p 4984:5984 -p 4986:5986 --rm --name e2e-couchdb --mount type=tmpfs,destination=/opt/couchdb/data couchdb:2`,
          'sh scripts/e2e/wait_for_couch.sh 4984',
          `curl 'http://localhost:4984/_cluster_setup' -H 'Content-Type: application/json' --data-binary '{"action":"enable_single_node","username":"admin","password":"pass","bind_address":"0.0.0.0","port":5984,"singlenode":true}'`,
          'COUCH_URL=http://admin:pass@localhost:4984/medic COUCH_NODE_NAME=nonode@nohost grunt secure-couchdb', // yo dawg, I heard you like grunt...
          // Useful for debugging etc, as it allows you to use Fauxton easily
          `curl -X PUT "http://admin:pass@localhost:4984/_node/nonode@nohost/_config/httpd/WWW-Authenticate" -d '"Basic realm=\\"administrator\\""' -H "Content-Type: application/json"'`
        ].join('&& ')
      },
      'clean-test-database': {
        cmd: [
          'docker stop e2e-couchdb'
        ].join('&& '),
        exitCodes: [0, 1] // 1 if e2e-couchdb doesn't exist, which is fine
      },
      'e2e-servers': {
        cmd: 'node ./scripts/e2e/e2e-servers.js &'
      },
      bundlesize: {
        cmd: 'node ./node_modules/bundlesize/index.js',
      },
      'setup-api-integration': {
        cmd: `cd api && npm ci && ${linkSharedLibs('api')}`,
      },
      'npm-ci-shared-libs': {
        cmd: () => {
          return getSharedLibDirs()
            .map(
              lib =>
                `echo Installing shared library: ${lib} &&
                  (cd shared-libs/${lib} && npm ci --production)`
            )
            .join(' && ');
        }
      },
      'npm-ci-modules': {
        cmd: ['webapp', 'api', 'sentinel', 'admin']
          .map(dir => `echo "[${dir}]" && cd ${dir} && npm ci && ${linkSharedLibs(dir)} && cd ..`)
          .join(' && '),
      },
      'start-webdriver': {
        cmd:
          'mkdir -p tests/logs && ' +
          './node_modules/.bin/webdriver-manager update && ' +
          './node_modules/.bin/webdriver-manager start > tests/logs/webdriver.log & ' +
          'until nc -z localhost 4444; do sleep 1; done',
      },
      'check-env-vars':
        'if [ -z $COUCH_URL ] || [ -z $COUCH_NODE_NAME ]; then ' +
        'echo "Missing required env var.  Check that all are set: ' +
        'COUCH_URL, COUCH_NODE_NAME" && exit 1; fi',
      'check-version': `node scripts/travis/check-versions.js`,
      'undo-patches': {
        cmd: function() {
          const modulesToPatch = [
            'bootstrap-daterangepicker',
            'font-awesome',
            'moment',
          ];
          return modulesToPatch.map(module => {
            const backupPath = 'webapp/node_modules_backup/' + module;
            const modulePath = 'webapp/node_modules/' + module;
            return `
              [ -d ${backupPath} ] &&
              rm -rf ${modulePath} &&
              mv ${backupPath} ${modulePath} &&
              echo "Module restored: ${module}" ||
              echo "No restore required for: ${module}"
            `;
          }).join(' && ');
        },
      },
      'undo-test-patches': {
        cmd: () => {
          const modulesToPatch = [
            'protractor/node_modules/webdriver-manager'
          ];

          return modulesToPatch.map(module => {
            const backupPath = 'node_modules_backup/' + module;
            const modulePath = 'node_modules/' + module;
            return `
              [ -d ${backupPath} ] &&
              rm -rf ${modulePath} &&
              mv ${backupPath} ${modulePath} &&
              echo "Module restored: ${module}" ||
              echo "No restore required for: ${module}"
            `;
          }).join(' && ');
        },
      },
      'test-config-standard': {
        cmd: [
          'cd config/standard',
          'npm ci',
          'npm run travis'
        ].join(' && ')
      },
      'test-config-default': {
        cmd: [
          'cd config/default',
          'npm ci',
          'npm run travis'
        ].join(' && ')
      },
      'shared-lib-unit': {
        cmd: () => {
          const sharedLibs = getSharedLibDirs();
          return [
            ...sharedLibs.map(lib => `(cd shared-libs/${lib} && npm ci)`),
            ...sharedLibs.map(lib => `echo Testing shared library: ${lib} && (cd shared-libs/${lib} && npm test)`),
          ].join(' && ');
        },
      },
      // To monkey patch a library...
      // 1. copy the file you want to change
      // 2. make the changes
      // 3. run `diff -c original modified > webapp/patches/my-patch.patch`
      // 4. update grunt targets: "apply-patches", "undo-patches", and "libraries-to-patch"
      'apply-patches': {
        cmd: function() {
          const patches = [
            // patch the daterangepicker for responsiveness
            // https://github.com/dangrossman/bootstrap-daterangepicker/pull/437
            'patch webapp/node_modules/bootstrap-daterangepicker/daterangepicker.js < webapp/patches/bootstrap-daterangepicker.patch',

            // patch font-awesome to remove version attributes
            // https://github.com/FortAwesome/Font-Awesome/issues/3286
            'patch webapp/node_modules/font-awesome/less/path.less < webapp/patches/font-awesome-remove-version-attribute.patch',

            // patch moment.js to use western arabic (european) numerals in Hindi
            'patch webapp/node_modules/moment/locale/hi.js < webapp/patches/moment-hindi-use-euro-numerals.patch',

            // patch messageformat to add a default plural function for languages not yet supported by make-plural #5705
            'patch webapp/node_modules/messageformat/lib/plurals.js < webapp/patches/messageformat-default-plurals.patch',
          ];
          return patches.join(' && ');
        },
      },
      'apply-test-patches': {
        cmd: () => {
          const patches = [
            'patch node_modules/protractor/node_modules/webdriver-manager/built/config.json < tests/patches/webdriver-manager-config.patch',
          ];
          return patches.join(' && ');
        },
      },
      audit: { cmd: 'node ./scripts/audit-all.js' },
      'audit-whitelist': { cmd: 'git diff $(cat .auditignore | git hash-object -w --stdin) $(node ./scripts/audit-all.js | git hash-object -w --stdin) --word-diff --exit-code' },
      'envify': {
        cmd: () => {
          if (!TRAVIS_BUILD_NUMBER) {
            return 'echo "Not building on Travis so not envifying"';
          }
          return 'mv build/ddocs/medic/_attachments/js/inbox.js inbox.tmp.js && ' +
                 'NODE_ENV=production node node_modules/loose-envify/cli.js inbox.tmp.js > build/ddocs/medic/_attachments/js/inbox.js && ' +
                 'rm inbox.tmp.js && ' +
                 'echo "Envify complete"';
        }
      },
      'build-config': {
        cmd: () => {
          const medicConfPath = path.resolve('./node_modules/medic-conf/src/bin/medic-conf.js');
          const configPath = path.resolve('./config/default');
          const buildPath = path.resolve('./build/ddocs/medic/_attachments/default-docs');
          const actions = ['upload-app-settings', 'upload-app-forms', 'upload-collect-forms', 'upload-contact-forms', 'upload-resources', 'upload-custom-translations'];
          return `node ${medicConfPath} --skip-dependency-check --archive --source=${configPath} --destination=${buildPath} ${actions.join(' ')}`;
        }
      }
    },
    watch: {
      options: {
        interval: 1000,
      },
      'config-files': {
        files: ['Gruntfile.js', 'package.json'],
        options: {
          reload: true,
        },
      },
      'admin-css': {
        files: ['admin/src/css/**/*'],
        tasks: [
          'less:admin',
          'couch-compile:secondary',
          'couch-push:localhost-secondary',
          'notify:deployed',
        ],
      },
      'admin-js': {
        files: ['admin/src/js/**/*', 'webapp/src/js/**/*', 'shared-libs/*/src/**/*'],
        tasks: [
          'browserify:admin',
          'couch-compile:secondary',
          'couch-push:localhost-secondary',
          'notify:deployed',
        ],
      },
      'admin-index': {
        files: ['admin/src/templates/index.html'],
        tasks: [
          'copy:admin-resources',
          'couch-compile:secondary',
          'couch-push:localhost-secondary',
          'notify:deployed',
        ],
      },
      'admin-templates': {
        files: ['admin/src/templates/**/*', '!admin/src/templates/index.html'],
        tasks: [
          'ngtemplates:adminApp',
          'couch-compile:secondary',
          'couch-push:localhost-secondary',
          'notify:deployed',
        ],
      },
      'webapp-css': {
        files: ['webapp/src/css/**/*'],
        tasks: [
          'sass',
          'less:webapp',
          'generate-service-worker',
          'couch-compile:primary',
          'deploy',
        ],
      },
      'webapp-js': {
        files: ['webapp/src/js/**/*', 'shared-libs/*/src/**/*'],
        tasks: [
          'browserify:webapp',
          'generate-service-worker',
          'couch-compile:primary',
          'deploy',
        ],
      },
      'webapp-templates': {
        files: [
          'webapp/src/templates/**/*',
          '!webapp/src/templates/inbox.html',
        ],
        tasks: [
          'ngtemplates:inboxApp',
          'generate-service-worker',
          'couch-compile:primary',
          'deploy',
        ],
      },
      'inbox-html-template': {
        files: 'webapp/src/templates/inbox.html',
        tasks: [
          'copy:inbox-file-attachment',
          'generate-service-worker',
          'couch-compile:primary',
          'deploy',
        ],
      },
      'primary-ddoc': {
        files: ['ddocs/medic/**/*'],
        tasks: ['copy:ddocs', 'couch-compile:primary', 'deploy'],
      },
      'secondary-ddocs': {
        files: ['ddocs/medic-*/**/*'],
        tasks: [
          'copy:ddocs',
          'couch-compile:secondary',
          'couch-push:localhost-secondary',
          'notify:deployed',
        ],
      },
    },
    notify: {
      deployed: {
        options: {
          title: 'Medic Mobile',
          message: 'Deployed successfully',
        },
      },
    },
    karma: {
      unit: {
        configFile: './webapp/tests/karma/karma-unit.conf.js',
        singleRun: true,
        browsers: ['Chrome_Headless'],
      },
      'unit-continuous': {
        configFile: './webapp/tests/karma/karma-unit.conf.js',
        singleRun: false,
        browsers: ['Chrome_Headless'],
      },
      admin: {
        configFile: './admin/tests/karma-unit.conf.js',
        singleRun: true,
        browsers: ['Chrome_Headless'],
      },
    },
    protractor: {
      'e2e-tests': {
        options: {
          args: {
            suite: 'e2e'
          },
          configFile: 'tests/conf.js'
        }
      },
      'e2e-tests-debug': {
        options: {
          configFile: 'tests/conf.js',
          args: {
            suite: 'e2e'
          },
          capabilities: {
            chromeOptions: {
              args: ['window-size=1024,768']
            }
          }
        }
      },
      'performance-tests-and-services': {
        options: {
          args: {
            suite: 'performance'
          },
          configFile: 'tests/conf.js'
        }
      }
    },
    mochaTest: {
      unit: {
        src: [
          'webapp/tests/mocha/unit/**/*.spec.js',
          'webapp/tests/mocha/unit/*.spec.js',
          'api/tests/mocha/**/*.js',
          'sentinel/tests/**/*.js',
        ],
      },
      'api-integration': {
        src: 'api/tests/integration/**/*.js',
        options: {
          timeout: 10000,
        },
      },
    },
    ngtemplates: {
      inboxApp: {
        cwd: 'webapp/src',
        src: [
          'templates/modals/**/*.html',
          'templates/partials/**/*.html',
          'templates/directives/**/*.html',
        ],
        dest: 'build/ddocs/medic/_attachments/js/templates.js',
        options: {
          htmlmin: {
            collapseBooleanAttributes: true,
            collapseWhitespace: true,
            removeAttributeQuotes: true,
            removeComments: true,
            removeEmptyAttributes: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
          },
        },
      },
      adminApp: {
        cwd: 'admin/src',
        src: ['templates/**/*.html', '!templates/index.html'],
        dest: 'build/ddocs/medic-admin/_attachments/js/templates.js',
        options: {
          htmlmin: {
            collapseBooleanAttributes: true,
            collapseWhitespace: true,
            removeAttributeQuotes: true,
            removeComments: true,
            removeEmptyAttributes: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
          },
        },
      },
    },
    sass: {
      options: {
        implementation: require('node-sass'),
      },
      compile: {
        cwd: 'webapp/src/css/',
        src: 'enketo/enketo.scss',
        dest: 'build',
        ext: '.less',
        expand: true,
        outputStyle: 'expanded',
        flatten: true,
        extDot: 'last',
      },
    },
    'optimize-js': {
      'build/ddocs/medic/_attachments/js/inbox.js':
        'build/ddocs/medic/_attachments/js/inbox.js',
      'build/ddocs/medic/_attachments/js/templates.js':
        'build/ddocs/medic/_attachments/js/templates.js',
      'build/ddocs/medic-admin/_attachments/js/main.js':
        'build/ddocs/medic-admin/_attachments/js/main.js',
      'build/ddocs/medic-admin/_attachments/js/templates.js':
        'build/ddocs/medic-admin/_attachments/js/templates.js',
    },
    jsdoc: {
      admin: {
        src: [
          'admin/src/js/**/*.js'
        ],
        options: {
          destination: 'jsdocs/admin',
          configure: 'node_modules/angular-jsdoc/common/conf.json',
          template: 'node_modules/angular-jsdoc/angular-template'
        }
      },
      api: {
        src: [
          'api/src/**/*.js',
          '!api/src/extracted-resources/**',
        ],
        options: {
          destination: 'jsdocs/api',
          readme: 'api/README.md'
        }
      },
      sentinel: {
        src: [
          'sentinel/src/**/*.js'
        ],
        options: {
          destination: 'jsdocs/sentinel'
        }
      },
      'shared-libs': {
        src: getSharedLibDirs().map(lib => path.resolve(__dirname, 'shared-libs', lib, 'src') + '/**/*.js'),
        options: {
          destination: 'jsdocs/shared-libs'
        }
      },
      webapp: {
        src: [
          'webapp/src/js/**/*.js'
        ],
        options: {
          destination: 'jsdocs/webapp',
          configure: 'node_modules/angular-jsdoc/common/conf.json',
          template: 'node_modules/angular-jsdoc/angular-template',
          readme: './README.md'
        }
      },
    },
  });

  // Build tasks
  grunt.registerTask('install-dependencies', 'Update and patch dependencies', [
    'exec:undo-patches',
    'exec:npm-ci-shared-libs',
    'exec:npm-ci-modules',
    'copy:libraries-to-patch',
    'exec:apply-patches',
  ]);

  grunt.registerTask('build-js', 'Build the JS resources', [
    'browserify:webapp',
    'ngtemplates:inboxApp',
  ]);

  grunt.registerTask('build-css', 'Build the CSS resources', [
    'sass',
    'less:webapp',
    'postcss',
  ]);

  grunt.registerTask('build', 'Build the static resources', [
    'exec:clean-build-dir',
    'copy:ddocs',
    'build-common',
    'exec:envify',
    'build-node-modules',
    'minify',
    'couch-compile:primary',
  ]);

  grunt.registerTask('build-dev', 'Build the static resources', [
    'exec:clean-build-dir',
    'copy:ddocs',
    'copy:api-resources',
    'build-common',
    'couch-compile:primary',
  ]);

  grunt.registerTask('build-common', 'Build the static resources', [
    'build-css',
    'build-js',
    'copy:webapp',
    'exec:set-ddoc-version',
    'exec:set-horticulturalist-metadata',
    'build-admin',
    'build-ddoc',
    'exec:build-config',
  ]);

  grunt.registerTask('build-ddoc', 'Build the main ddoc', [
    'couch-compile:secondary',
    'copy:ddoc-attachments',
    'build-service-worker',
  ]);

  grunt.registerTask('build-service-worker', 'Build the service worker', [
    'generate-service-worker',
    'exec:eslint-sw',
  ]);

  grunt.registerTask('build-admin', 'Build the admin app', [
    'copy:admin-resources',
    'ngtemplates:adminApp',
    'browserify:admin',
    'less:admin',
  ]);

  grunt.registerTask('deploy', 'Deploy the webapp', [
    'couch-push:localhost',
    'notify:deployed',
  ]);

  grunt.registerTask('build-node-modules', 'Build and pack api and sentinel bundles', [
    'copy:api-resources',
    'uglify:api',
    'cssmin:api',
    'exec:bundle-dependencies',
    'exec:pack-node-modules',
  ]);

  grunt.registerTask('patch-webdriver', 'Patches webdriver to support latest Chrome', [
    'exec:undo-test-patches',
    'copy:test-libraries-to-patch',
    'exec:apply-test-patches',
  ]);

  grunt.registerTask('start-webdriver', 'Starts Protractor Webdriver', [
    'patch-webdriver',
    'exec:start-webdriver',
  ]);

  // Test tasks
  grunt.registerTask('e2e-deploy', 'Deploy app for testing', [
    'start-webdriver',
    'exec:clean-test-database',
    'exec:setup-test-database',
    'couch-push:test',
    'exec:e2e-servers',
  ]);

  grunt.registerTask('e2e', 'Deploy app for testing and run e2e tests', [
    'e2e-deploy',
    'protractor:e2e-tests',
    'exec:clean-test-database',
  ]);

  grunt.registerTask('e2e-debug', 'Deploy app for testing and run e2e tests in a visible Chrome window', [
    'e2e-deploy',
    'protractor:e2e-tests-debug',
    'exec:clean-test-database',
  ]);

  grunt.registerTask('test-perf', 'Run performance-specific tests', [
    'exec:clean-test-database',
    'exec:setup-test-database',
    'build-node-modules',
    'build-ddoc',
    'couch-compile:primary',
    'couch-push:test',
    'protractor:performance-tests-and-services',
  ]);

  grunt.registerTask('unit-continuous', 'Run karma unit tests in a loop', [
    'karma:unit-continuous'
  ]);

  grunt.registerTask('test-api-integration', 'Integration tests for medic-api', [
    'exec:check-env-vars',
    'exec:setup-api-integration',
    'mochaTest:api-integration',
  ]);

  grunt.registerTask('unit', 'Unit tests', [
    'karma:unit',
    'karma:admin',
    'env:unit-test',
    'exec:shared-lib-unit',
    'mochaTest:unit',
  ]);

  // CI tasks
  grunt.registerTask('minify', 'Minify JS and CSS', [
    'uglify:web',
    'optimize-js',
    'cssmin:web',
    'exec:bundlesize',
  ]);

  grunt.registerTask('ci-compile', 'build, lint, unit, integration test', [
    'exec:check-version',
    'install-dependencies',
    'static-analysis',
    'build',
    'mochaTest:api-integration',
    'unit',
    'exec:test-config-default',
    'exec:test-config-standard'
  ]);

  grunt.registerTask('ci-e2e', 'Run e2e tests for CI', [
    'start-webdriver',
    'protractor:e2e-tests',
  ]);

  grunt.registerTask('ci-performance', 'Run performance tests on CI', [
    'start-webdriver',
    'protractor:performance-tests-and-services',
  ]);

  // Dev tasks
  grunt.registerTask('dev-webapp', 'Build and deploy the webapp for dev', [
    'install-dependencies',
    'dev-webapp-no-dependencies',
  ]);

  grunt.registerTask('static-analysis', 'Static analysis checks', [
    'exec:blank-link-check',
    'eslint',
  ]);

  grunt.registerTask('eslint', 'Runs eslint', [
    'exec:eslint'
  ]);

  grunt.registerTask('dev-webapp-no-dependencies', 'Build and deploy the webapp for dev, without reinstalling dependencies.', [
    'build-dev',
    'deploy',
    'watch',
  ]);

  grunt.registerTask('dev-api', 'Run api and watch for file changes', [
    'exec:api-dev',
  ]);

  grunt.registerTask('secure-couchdb', 'Basic developer setup for CouchDB', [
    'exec:setup-admin',
  ]);

  grunt.registerTask('dev-sentinel', 'Run sentinel and watch for file changes', [
    'exec:sentinel-dev',
  ]);

  grunt.registerTask('publish-for-testing', 'Publish the ddoc to the testing server', [
    'replace:change-ddoc-id-for-testing',
    'couch-push:testing',
  ]);

  grunt.registerTask('default', 'Build and deploy the webapp for dev', [
    'dev-webapp',
  ]);

  grunt.registerTask('build-documentation', 'Build documentation using jsdoc', [
    'jsdoc'
  ]);
};
