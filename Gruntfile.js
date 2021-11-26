/* eslint-disable max-len */

const fs = require('fs');
const path = require('path');

const {
  COUCH_NODE_NAME,
  MARKET_URL,
  BUILDS_SERVER,
  BUILD_NUMBER,
  CI,
} = process.env;

const buildUtils = require('./scripts/build');
const couchConfig = buildUtils.getCouchConfig();

const ESLINT_COMMAND = './node_modules/.bin/eslint --color';

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
    uglify: 'grunt-contrib-uglify-es',
  });
  require('time-grunt')(grunt);

  // Project configuration
  grunt.initConfig({
    'couch-compile': {
      primary: {
        files: {
          'build/ddocs/medic.json': 'build/ddocs/medic-db/*',
        },
      },
      secondary: {
        files: {
          'build/ddocs/sentinel.json': 'build/ddocs/sentinel-db/*',
          'build/ddocs/users-meta.json': 'build/ddocs/users-meta-db/*',
          'build/ddocs/logs.json': 'build/ddocs/logs-db/*',
        },
      },
      staging: {
        files: {
          'build/staging.json': 'build/staging',
        }
      }
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
          [couchConfig.withPathNoAuth(couchConfig.dbName + '-sentinel')]: 'build/ddocs/sentinel.json',
          [couchConfig.withPathNoAuth(couchConfig.dbName + '-users-meta')]: 'build/ddocs/users-meta.json',
          [couchConfig.withPathNoAuth(couchConfig.dbName + '-logs')]: 'build/ddocs/logs.json',
        }
      },
      test: {
        files: {
          ['http://admin:pass@localhost:4984/medic-test']: 'build/ddocs/medic.json',
        },
      },
      testing: {
        files: [
          {
            src: 'build/staging.json',
            dest: `${MARKET_URL}/${BUILDS_SERVER}`,
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
      admin: {
        src: 'admin/src/js/main.js',
        dest: 'build/static/admin/js/main.js',
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
          '/*! Medic <%= grunt.template.today("yyyy-mm-dd") %> */\n',
      },
      web: {
        files: {
          'build/static/admin/js/main.js': 'build/static/admin/js/main.js',
          'build/static/admin/js/templates.js': 'build/static/admin/js/templates.js'
        },
      },
      api: {
        files: {
          // static api files
          'api/build/static/login/script.js': 'api/build/static/login/script.js',
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
      admin: {
        files: {
          'build/static/admin/css/main.css': 'admin/src/css/main.less',
        },
      },
    },
    cssmin: {
      web: {
        options: {
          keepSpecialComments: 0,
        },
        files: {
          'build/static/admin/css/main.css': 'build/static/admin/css/main.css',
        },
      },
      api: {
        options: {
          keepSpecialComments: 0,
        },
        files: {
          'api/build/static/login/style.css': 'api/build/static/login/style.css',
        },
      }
    },
    copy: {
      ddocs: {
        expand: true,
        cwd: 'ddocs/',
        src: '**/*',
        dest: 'build/ddocs/',
      },
      'webapp-static': {
        expand: true,
        cwd: 'webapp/src/',
        src: [
          'audio/**/*',
          'fonts/**/*',
          'img/**/*',
        ],
        dest: 'build/static/webapp/',
      },
      'api-resources': {
        expand: true,
        cwd: 'api/src/public/',
        src: '**/*',
        dest: 'api/build/static/',
      },
      'static-resources': {
        expand: true,
        cwd: 'build/static',
        src: '**/*',
        dest: 'api/build/static/',
      },
      'default-docs': {
        expand: true,
        cwd: 'build/default-docs/',
        src: '**/*',
        dest: 'api/build/default-docs/',
      },
      'admin-resources': {
        files: [
          {
            expand: true,
            flatten: true,
            src: 'admin/src/templates/index.html',
            dest: 'build/static/admin',
          },
          {
            expand: true,
            flatten: true,
            src: [
              'admin/node_modules/font-awesome/fonts/*',
              'webapp/src/fonts/**/*'
            ],
            dest: 'build/static/admin/fonts/',
          },
        ],
      },
      'libraries-to-patch': {
        expand: true,
        cwd: 'webapp/node_modules',
        src: [
          'bootstrap-daterangepicker/**',
          'enketo-core/**',
          'font-awesome/**',
          'messageformat/**',
          'moment/**'
        ],
        dest: 'webapp/node_modules_backup',
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
            'webapp/src/**/*.ts',
            'webapp/tests/**/*.js',
            'webapp/tests/**/*.ts',
            'config/**/*.js',
            'scripts/**/*.js',
            'webapp/src/ts/**/*.component.html',
          ];
          const ignore = [
            'webapp/src/ts/providers/xpath-element-path.provider.ts',
            'webapp/src/js/bootstrap-tour-standalone.js',
            'api/extracted-resources/**/*',
            'api/build/**/*',
            '**/node_modules/**',
            'build/**',
            '**/pupil/**',
          ];

          return [ESLINT_COMMAND]
            .concat(ignore.map(glob => `--ignore-pattern "${glob}"`))
            .concat(paths.map(glob => `"${glob}"`))
            .join(' ');
        },
        stdio: 'inherit', // enable colors!
      },
      'eslint-sw': `${ESLINT_COMMAND} -c ./.eslintrc build/service-worker.js`,
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
              `mv medic-*.tgz ../build/staging/_attachments/`,
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
        cmd: () => `echo "${buildUtils.getVersion()}" > build/ddocs/medic-db/medic/version`,
      },
      'api-dev': {
        cmd:
          'TZ=UTC ./node_modules/.bin/nodemon --inspect=0.0.0.0:9229 --ignore "api/build/**" --watch api --watch "shared-libs/**/src/**" api/server.js -- --allow-cors',
      },
      'sentinel-dev': {
        cmd:
          'TZ=UTC ./node_modules/.bin/nodemon --inspect=0.0.0.0:9228 --watch sentinel --watch "shared-libs/**/src/**" sentinel/server.js',
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
          'sh scripts/e2e/wait_for_response_code.sh 4984 200 couch',
          `curl 'http://localhost:4984/_cluster_setup' -H 'Content-Type: application/json' --data-binary '{"action":"enable_single_node","username":"admin","password":"pass","bind_address":"0.0.0.0","port":5984,"singlenode":true}'`,
          'COUCH_URL=http://admin:pass@localhost:4984/medic COUCH_NODE_NAME=nonode@nohost grunt secure-couchdb', // yo dawg, I heard you like grunt...
          // Useful for debugging etc, as it allows you to use Fauxton easily
          `curl -X PUT "http://admin:pass@localhost:4984/_node/nonode@nohost/_config/httpd/WWW-Authenticate" -d '"Basic realm=\\"administrator\\""' -H "Content-Type: application/json"`
        ].join('&& ')
      },
      'wait_for_api_down': {
        cmd: [
          'sh scripts/e2e/wait_for_response_code.sh 4988 000 api',
        ].join('&& '),
        exitCodes: [0, 1] // 1 if e2e-couchdb doesn't exist, which is fine
      },
      'clean-test-database': {
        cmd: [
          'docker stop e2e-couchdb'
        ].join('&& '),
        exitCodes: [0, 1] // 1 if e2e-couchdb doesn't exist, which is fine
      },
      'e2e-servers': {
        cmd: `${BUILD_NUMBER ? 'echo running in CI' :'node ./scripts/e2e/e2e-servers.js &'}`
      },
      bundlesize: {
        cmd: 'node ./node_modules/bundlesize/index.js',
      },
      'setup-api-integration': {
        cmd: `cd api && npm ci && ${linkSharedLibs('api')}`,
      },
      'npm-ci-shared-libs': {
        cmd: (production) => {
          return getSharedLibDirs()
            .map(
              lib =>
                `echo Installing shared library: ${lib} &&
                  (cd shared-libs/${lib} && npm ci ${production ? '--production' : ''})`
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
      'start-webdriver-ci': {
        cmd:
          'scripts/e2e/start_webdriver.sh'
      },
      'check-env-vars':
        'if [ -z $COUCH_URL ] || [ -z $COUCH_NODE_NAME ]; then ' +
        'echo "Missing required env var.  Check that all are set: ' +
        'COUCH_URL, COUCH_NODE_NAME" && exit 1; fi',
      'check-version': `node scripts/ci/check-versions.js`,
      'undo-patches': {
        cmd: function() {
          const modulesToPatch = [
            'bootstrap-daterangepicker',
            'enketo-core',
            'font-awesome',
            'moment',
            'pouchdb-browser',
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
      'test-config-standard': {
        cmd: [
          'cd config/standard',
          'npm ci',
          'npm run ci'
        ].join(' && '),
        stdio: 'inherit', // enable colors!
      },
      'wdio-run-default': {
        cmd: [
          'npm run wdio'
        ].join(' && '),
        stdio: 'inherit', // enable colors!
      },
      'wdio-run-standard': {
        cmd: [
          'npm run wdio-standard'
        ].join(' && '),
        stdio: 'inherit', // enable colors!
      },
      'test-config-default': {
        cmd: [
          'cd config/default',
          'npm ci',
          'npm run test'
        ].join(' && '),
        stdio: 'inherit', // enable colors!
      },
      'shared-lib-unit': {
        cmd: () => {
          const sharedLibs = getSharedLibDirs();
          return sharedLibs
            .map(lib => `echo Testing shared library: ${lib} && (cd shared-libs/${lib} && npm test)`)
            .join(' && ');
        },
        stdio: 'inherit', // enable colors!
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

            // patch enketo to always mark the /inputs group as relevant
            'patch webapp/node_modules/enketo-core/src/js/Form.js < webapp/patches/enketo-inputs-always-relevant.patch',

            // patch enketo so forms with no active pages are considered valid
            // https://github.com/medic/medic/issues/5484
            'patch webapp/node_modules/enketo-core/src/js/page.js < webapp/patches/enketo-handle-no-active-pages.patch',

            // patch messageformat to add a default plural function for languages not yet supported by make-plural #5705
            'patch webapp/node_modules/messageformat/lib/plurals.js < webapp/patches/messageformat-default-plurals.patch',

            // patch pouchdb to catch unhandled rejections
            // https://github.com/medic/cht-core/issues/6626
            'patch webapp/node_modules/pouchdb-browser/lib/index.js < webapp/patches/pouchdb-unhandled-rejection.patch',
          ];
          return patches.join(' && ');
        },
      },
      audit: { cmd: 'node ./scripts/audit-all.js' },
      'audit-whitelist': { cmd: 'git diff $(cat .auditignore | git hash-object -w --stdin) $(node ./scripts/audit-all.js | git hash-object -w --stdin) --word-diff --exit-code' },
      'build-config': {
        cmd: () => {
          const medicConfPath = path.resolve('./node_modules/medic-conf/src/bin/medic-conf.js');
          const configPath = path.resolve('./config/default');
          const buildPath = path.resolve('./build/default-docs');
          const actions = ['upload-app-settings', 'upload-app-forms', 'upload-collect-forms', 'upload-contact-forms', 'upload-resources', 'upload-custom-translations'];
          return `node ${medicConfPath} --skip-dependency-check --archive --source=${configPath} --destination=${buildPath} ${actions.join(' ')}`;
        }
      },
      'build-webapp': {
        cmd: () => {
          const configuration = BUILD_NUMBER ? 'production' : 'development';
          return [
            `cd webapp`,
            `../node_modules/.bin/ng build --configuration=${configuration} --progress=${BUILD_NUMBER ? 'false' : 'true'}`,
            `../node_modules/.bin/ngc`,
            'cd ../',
          ].join(' && ');
        },
        stdio: 'inherit', // enable colors!
      },
      'watch-webapp': {
        cmd: () => {
          const configuration = BUILD_NUMBER ? 'production' : 'development';
          return `
            cd webapp && ../node_modules/.bin/ng build --configuration=${configuration} --watch=true &
            cd ../
          `;
        },
        stdio: 'inherit', // enable colors!
      },
      'unit-webapp': {
        cmd: () => {
          return [
            'cd webapp',
            `../node_modules/.bin/ng test webapp --watch=false --progress=${BUILD_NUMBER ? 'false' : 'true'}`,
            'cd ../',
          ].join(' && ');
        },
        stdio: 'inherit', // enable colors!
      },
      'unit-webapp-continuous': {
        cmd: () => {
          return [
            'cd webapp',
            '../node_modules/.bin/ng test webapp --watch=true --progress=true',
            'cd ../',
          ].join(' && ');
        },
        stdio: 'inherit', // enable colors!
      },
      //using npm run, as 'grunt-mocha-test' has issues with the integration with newer versions of mocha.
      'e2e-integration': {
        cmd: 'npm run e2e-integration'
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
          'copy:static-resources',
          'couch-compile:primary',
          'couch-push:primary',
          'notify:deployed',
        ],
      },
      'admin-js': {
        files: ['admin/src/js/**/*', 'shared-libs/*/src/**/*'],
        tasks: [
          'browserify:admin',
          'copy:static-resources',
          'couch-compile:primary',
          'couch-push:primary',
          'notify:deployed',
        ],
      },
      'admin-index': {
        files: ['admin/src/templates/index.html'],
        tasks: [
          'copy:admin-resources',
          'copy:static-resources',
          'couch-compile:primary',
          'couch-push:primary',
          'notify:deployed',
        ],
      },
      'admin-templates': {
        files: ['admin/src/templates/**/*', '!admin/src/templates/index.html'],
        tasks: [
          'ngtemplates:adminApp',
          'copy:static-resources',
          'couch-compile:primary',
          'couch-push:primary',
          'notify:deployed',
        ],
      },
      'webapp-js': {
        // instead of watching the source files, watch the build folder and upload on rebuild
        files: ['build/static/webapp/**/*'],
        tasks: [
          'copy:static-resources',
          'couch-compile:primary',
          'deploy',
        ],
      },
      'primary-ddoc': {
        files: ['ddocs/medic-db/**/*'],
        tasks: ['copy:ddocs', 'couch-compile:primary', 'deploy'],
      },
      'secondary-ddocs': {
        files: ['ddocs/*-db/**/*', '!ddocs/medic-db/**/*'],
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
          title: 'Medic',
          message: 'Deployed successfully',
        },
      },
    },
    karma: {
      admin: {
        configFile: './admin/tests/karma-unit.conf.js',
        singleRun: true,
        browsers: ['Chrome_Headless'],
      },
    },
    protractor: {
      'e2e-cht-release-tests': {
        options: {
          configFile: 'tests/conf.js',
          args: {
            suite: 'cht',
          }
        }
      },
      'e2e-web-tests': {
        options: {
          configFile: 'tests/conf.js',
          args: {
            suite: 'web',
          }
        }
      },
      'e2e-mobile-tests': {
        options: {
          configFile: 'tests/conf.js',
          args: {
            suite: 'mobile',
            capabilities: {
              chromeOptions: {
                'args': ['headless','disable-gpu'],
                mobileEmulation: { 'deviceName': 'Nexus 5' }
              }
            }
          }
        }
      },
      'e2e-tests-debug': {
        options: {
          configFile: 'tests/conf.js',
          args: {
            suite: 'web'
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
      api: {
        src: [
          'api/tests/mocha/**/*.js'
        ],
      },
      sentinel: {
        src: [
          'sentinel/tests/**/*.js'
        ],
      }
    },
    ngtemplates: {
      adminApp: {
        cwd: 'admin/src',
        src: ['templates/**/*.html', '!templates/index.html'],
        dest: 'build/static/admin/js/templates.js',
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
        dest: 'build/static/webapp',
        ext: '.less',
        expand: true,
        outputStyle: 'expanded',
        flatten: true,
        extDot: 'last',
      },
    },
    'optimize-js': {
      'build/static/admin/js/main.js': 'build/static/admin/js/main.js',
      'build/static/admin/js/templates.js': 'build/static/admin/js/templates.js',
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
          '!api/extracted-resources/**',
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
    'exec:build-webapp',
  ]);

  grunt.registerTask('build-css', 'Build the CSS resources', [
    'sass',
  ]);

  grunt.registerTask('build', 'Build the static resources', [
    'exec:clean-build-dir',
    'copy:ddocs',
    'build-common',
    'build-node-modules',
    'minify',
    'couch-compile:primary',
    'populate-staging-doc',
  ]);

  grunt.registerTask('build-dev', 'Build the static resources', [
    'exec:clean-build-dir',
    'copy:ddocs',
    'copy:api-resources',
    'build-common',
    'copy:static-resources',
    'couch-compile:primary',
  ]);

  grunt.registerTask('set-build-info', buildUtils.setBuildInfo);

  grunt.registerTask('build-common', 'Build the static resources', [
    'build-css',
    'build-js',
    'exec:set-ddoc-version',
    'set-build-info',
    'build-admin',
    'build-ddoc',
    'exec:build-config',
    'copy:webapp-static',
    'copy:default-docs',
  ]);

  grunt.registerTask('build-ddoc', 'Build the main ddoc', [
    'couch-compile:secondary',
  ]);

  grunt.registerTask('build-admin', 'Build the admin app', [
    'copy:admin-resources',
    'ngtemplates:adminApp',
    'browserify:admin',
    'less:admin',
  ]);

  grunt.registerTask('deploy', 'Deploy the webapp', [
    'couch-push:localhost',
    'couch-push:localhost-secondary',
    'notify:deployed',
  ]);

  grunt.registerTask('build-node-modules', 'Build and pack api and sentinel bundles', [
    'copy:api-resources',
    'copy:static-resources',
    'uglify:api',
    'cssmin:api',
    'exec:bundle-dependencies',
    'create-staging-doc',
    'exec:pack-node-modules',
  ]);

  grunt.registerTask('start-webdriver', 'Starts Protractor Webdriver', [
    CI ? 'exec:start-webdriver-ci' : 'exec:start-webdriver',
  ]);

  // Test tasks
  grunt.registerTask('e2e-deploy', 'Deploy app for testing', [
    'start-webdriver',
    'e2e-env-setup'
  ]);

  grunt.registerTask('e2e-env-setup', 'Deploy app for testing', [
    'exec:clean-test-database',
    'exec:setup-test-database',
    'couch-push:test',
    'exec:e2e-servers',
  ]);

  grunt.registerTask('e2e-web', 'Deploy app for testing and run e2e tests', [
    'e2e-deploy',
    'protractor:e2e-web-tests',
    'exec:clean-test-database',
  ]);
  grunt.registerTask('e2e-mobile', 'Deploy app for testing and run e2e tests', [
    'e2e-deploy',
    'protractor:e2e-mobile-tests',
    'exec:clean-test-database',
  ]);
  grunt.registerTask('e2e', 'Deploy app for testing and run e2e tests', [
    'e2e-deploy',
    'protractor:e2e-web-tests',
  ]);

  grunt.registerTask('e2e-debug', 'Deploy app for testing and run e2e tests in a visible Chrome window', [
    'e2e-deploy',
    'protractor:e2e-tests-debug',
    'exec:clean-test-database',
  ]);

  grunt.registerTask('e2e-integration', 'Deploy app for testing', [
    'e2e-env-setup',
    'exec:e2e-integration',
    'exec:eslint-sw'
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

  grunt.registerTask('unit-webapp', 'Run webapp unit test after installing dependencies.', [
    'install-dependencies',
    'exec:unit-webapp'
  ]);

  grunt.registerTask('unit-webapp-no-dependencies', 'Run webapp unit test, without reinstalling dependencies.', [
    'exec:unit-webapp'
  ]);

  grunt.registerTask('unit-admin', 'Build and run admin unit tests', [
    'karma:admin',
  ]);

  grunt.registerTask('unit-webapp-continuous', 'Run webapp unit test in a loop, without reinstalling dependencies.', [
    'exec:unit-webapp-continuous'
  ]);

  grunt.registerTask('test-api-integration', 'Integration tests for medic-api', [
    'exec:check-env-vars',
    'exec:setup-api-integration',
    'mochaTest:api-integration',
  ]);

  grunt.registerTask('unit', 'Unit tests', [
    'env:unit-test',
    'exec:npm-ci-shared-libs',
    'unit-webapp-no-dependencies',
    'unit-admin',
    'exec:shared-lib-unit',
    'mochaTest:unit',
  ]);

  grunt.registerTask('unit-api', 'API unit tests', [
    'env:unit-test',
    'mochaTest:api',
  ]);

  grunt.registerTask('unit-sentinel', 'Sentinel unit tests', [
    'env:unit-test',
    'mochaTest:sentinel',
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
    'static-analysis',
    'install-dependencies',
    'build',
    'mochaTest:api-integration',
    'unit',
    'exec:test-config-default',
    'exec:test-config-standard',
  ]);

  grunt.registerTask('ci-compile-github', 'build, lint, unit, integration test', [
    'exec:check-version',
    'static-analysis',
    'install-dependencies',
    'build',
    'mochaTest:api-integration',
    'unit',
  ]);

  grunt.registerTask('ci-e2e', 'Run e2e tests for CI', [
    'start-webdriver',
    'exec:e2e-servers',
    'protractor:e2e-web-tests',
    //'protractor:e2e-mobile-tests',
  ]);
  grunt.registerTask('ci-e2e-mobile', 'Run e2e tests for CI', [
    'start-webdriver',
    'exec:e2e-servers',
    'protractor:e2e-mobile-tests',
  ]);

  grunt.registerTask('ci-e2e-integration', 'Run e2e tests for CI', [
    'exec:e2e-servers',
    'exec:e2e-integration',
    'exec:eslint-sw',
  ]);

  grunt.registerTask('ci-e2e-cht', 'Run e2e tests for CI', [
    'start-webdriver',
    'exec:e2e-servers',
    'protractor:e2e-cht-release-tests'
  ]);

  grunt.registerTask('ci-webdriver-default', 'Run e2e tests using webdriverIO for default config', [
    'exec:e2e-servers',
    'exec:wdio-run-default'
  ]);

  grunt.registerTask('ci-webdriver-standard', 'Run e2e tests using webdriverIO for standard config', [
    'exec:e2e-servers',
    'exec:wdio-run-standard'
  ]);

  grunt.registerTask('ci-performance', 'Run performance tests on CI', [
    'start-webdriver',
    'exec:e2e-servers',
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
    'exec:watch-webapp',
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

  grunt.registerTask('create-staging-doc', buildUtils.createStagingDoc);
  grunt.registerTask('populate-staging-doc', buildUtils.populateStagingDoc);

  grunt.registerTask('publish-for-testing', 'Publish the staging doc to the testing server', [
    'couch-compile:staging',
    'couch-push:testing',
  ]);

  grunt.registerTask('default', 'Build and deploy the webapp for dev', [
    'dev-webapp',
  ]);

  grunt.registerTask('build-documentation', 'Build documentation using jsdoc', [
    'jsdoc'
  ]);
};
