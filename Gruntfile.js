/* eslint-disable max-len */

const fs = require('fs');
const path = require('path');

const {
  BUILD_NUMBER,
  //CI,
  INTERNAL_CONTRIBUTOR,
} = process.env;

const DEV = !BUILD_NUMBER;

const buildUtils = require('./scripts/build');
const buildVersions = require('./scripts/build/versions');

const ESLINT_COMMAND = './node_modules/.bin/eslint --color --cache';

const getSharedLibDirs = () => {
  return fs
    .readdirSync('shared-libs')
    .filter(file => fs.lstatSync(`shared-libs/${file}`).isDirectory());
};

module.exports = function(grunt) {
  'use strict';

  require('jit-grunt')(grunt, {
    ngtemplates: 'grunt-angular-templates',
    /*
    ***** REMOVE - PROTRACTOR
    protractor: 'grunt-protractor-runner',
    * */
  });
  require('time-grunt')(grunt);

  // Project configuration
  grunt.initConfig({
    // this probably needs a script - can't find an config file option
    browserify: {
      options: {
        browserifyOptions: {
          debug: true,
        },
      },
      admin: {
        src: 'admin/src/js/main.js',
        dest: 'api/build/static/admin/js/main.js',
        options: {
          transform: ['browserify-ngannotate'],
          alias: {
            'angular-translate-interpolation-messageformat': './admin/node_modules/angular-translate/dist/angular-translate-interpolation-messageformat/angular-translate-interpolation-messageformat',
            'google-libphonenumber': './admin/node_modules/google-libphonenumber',
            'gsm': './admin/node_modules/gsm',
            'object-path': './admin/node_modules/object-path',
            'bikram-sambat': './admin/node_modules/bikram-sambat',
            'lodash/core': './admin/node_modules/lodash/core',
          },
        },
      },
    },
    env: {
      'version': {
        options: {
          add: {
            VERSION: buildVersions.getVersion(),
          },
        },
      }
    },
    less: {
      admin: {
        files: {
          'api/build/static/admin/css/main.css': 'admin/src/css/main.less',
        },
      },
    },
    cssmin: {
      admin: {
        options: {
          keepSpecialComments: 0,
        },
        files: {
          'api/build/static/admin/css/main.css': 'api/build/static/admin/css/main.css',
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
      'api-ddocs': {
        expand: true,
        cwd: 'build/ddocs/',
        src: '*.json',
        dest: 'api/build/ddocs/',
      },
      'webapp-static': {
        expand: true,
        cwd: 'webapp/src/',
        src: [
          'audio/**/*',
          'fonts/**/*',
          'img/**/*',
        ],
        dest: 'api/build/static/webapp/',
      },
      'api-resources': {
        expand: true,
        cwd: 'api/src/public/',
        src: '**/*',
        dest: 'api/build/static/',
      },
      'built-resources': {
        expand: true,
        cwd: 'build/static',
        src: '**/*',
        dest: 'api/build/static/',
      },
      'api-bowser': {
        src: 'api/node_modules/bowser/bundled.js',
        dest: 'api/src/public/login/lib-bowser.js',
      },
      'admin-static': {
        files: [
          {
            expand: true,
            flatten: true,
            src: 'admin/src/templates/index.html',
            dest: 'api/build/static/admin',
          },
          {
            expand: true,
            flatten: true,
            src: [
              'admin/node_modules/font-awesome/fonts/*',
              'webapp/src/fonts/**/*'
            ],
            dest: 'api/build/static/admin/fonts/',
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
      'compile-ddocs-primary': 'node ./scripts/build/ddoc-compile.js primary',
      'compile-ddocs-staging': 'node ./scripts/build/ddoc-compile.js staging',
      'compile-ddocs-secondary': 'node ./scripts/build/ddoc-compile.js secondary',
      'uglify-api':
        'node ./node_modules/uglify-js/bin/uglifyjs api/build/static/login/script.js -o api/build/static/login/script.js && ' +
        'node ./node_modules/uglify-js/bin/uglifyjs api/build/static/login/lib-bowser.js -o api/build/static/login/lib-bowser.js',
      'uglify-admin':
        'node ./node_modules/uglify-js/bin/uglifyjs api/build/static/admin/js/main.js -o api/build/static/admin/js/main.js && ' +
        'node ./node_modules/uglify-js/bin/uglifyjs api/build/static/admin/js/templates.js -o api/build/static/admin/js/templates.js',
      'push-ddoc-to-staging': 'node ./scripts/build/push-ddoc-to-staging.js',
      'clean-build-dir': 'rm -rf build && mkdir build',
      'mocha-unit-webapp': 'UNIT_TEST_ENV=1 ./node_modules/mocha/bin/_mocha "webapp/tests/mocha/**/*.spec.js"',
      'mocha-unit-api': 'UNIT_TEST_ENV=1 ./node_modules/mocha/bin/_mocha "api/tests/mocha/**/*.js"',
      'mocha-unit-sentinel': 'UNIT_TEST_ENV=1 ./node_modules/mocha/bin/_mocha "sentinel/tests/**/*.js"',
      'mocha-integration-api': './node_modules/mocha/bin/_mocha "api/tests/integration/**/*.js" -t 10000',

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
            'api/src/public/login/lib-bowser.js',
            'api/extracted-resources/**/*',
            'api/build/**/*',
            '**/node_modules/**',
            'build/**',
            '**/pupil/**',
            'api/src/enketo-transformer/**',
            'tests/scalability/report*/**',
            'tests/scalability/jmeter/**'
          ];

          return [ESLINT_COMMAND]
            .concat(ignore.map(glob => `--ignore-pattern "${glob}"`))
            .concat(paths.map(glob => `"${glob}"`))
            .join(' ');
        },
        stdio: 'inherit', // enable colors!
      },
      'eslint-sw': `${ESLINT_COMMAND} -c ./.eslintrc build/service-worker.js`,
      'build-service-images': {
        cmd: () => buildVersions.SERVICES
          .map(service =>
            [
              `cd ${service}`,
              `npm ci --production`,
              `npm dedupe`,
              `rm -rf ./node_modules/pouchdb-fetch/node_modules/node-fetch`,
              `cd ../`,
              `docker build -f ./${service}/Dockerfile --tag ${buildVersions.getImageTag(service)} .`,
            ].join(' && ')
          )
          .join(' && '),
      },
      'build-images': {
        cmd: () => buildVersions.INFRASTRUCTURE
          .map(service =>
            [
              `cd ${service}`,
              `docker build -f ./Dockerfile --tag ${buildVersions.getImageTag(service)} .`,
              'cd ../',
            ].join(' && ')
          )
          .join(' && '),
      },
      'save-service-images': {
        cmd: () => [...buildVersions.SERVICES, ...buildVersions.INFRASTRUCTURE]
          .map(service =>
            [
              `mkdir -p images`,
              `docker save ${buildVersions.getImageTag(service)} > images/${service}.tar`,
            ].join(' && ')
          )
          .join(' && '),
      },
      'push-service-images': {
        cmd: () => [...buildVersions.SERVICES, ...buildVersions.INFRASTRUCTURE]
          .map(service => `docker push ${buildVersions.getImageTag(service)}`)
          .join(' && '),
      },
      'api-dev': {
        cmd:
          'TZ=UTC ./node_modules/.bin/nodemon --inspect=0.0.0.0:9229 --ignore "api/build/static" --ignore "api/build/public" --watch api --watch "shared-libs/**/src/**" api/server.js -- --allow-cors',
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
      bundlesize: {
        cmd: 'node ./node_modules/bundlesize/index.js',
      },
      'npm-ci-api': {
        cmd: `cd api && npm ci`,
      },
      'npm-ci-modules': {
        cmd: ['webapp', 'api', 'sentinel', 'admin']
          // removing pouchdb-fetch/node-fetch forces PouchDb to use a newer version node-fetch
          // https://github.com/medic/cht-core/issues/8173
          .map(dir => `echo "[${dir}]" && cd ${dir} && npm ci && rm -rf ./node_modules/pouchdb-fetch/node_modules/node-fetch && cd ..`)
          .join(' && '),
      },
      /*
        'start-webdriver': {
        cmd:
          'mkdir -p tests/logs && ' +
          './node_modules/.bin/webdriver-manager update && ' +
          './node_modules/.bin/webdriver-manager start > tests/logs/webdriver.log & ' +
          'until nc -z localhost 4444; do sleep 1; done',
      },

      ***** REMOVE - PROTRACTOR
      'start-webdriver-ci': {
        cmd:
          'tests/scripts/start_webdriver.sh'
      },

       */
      'check-env-vars':
        'if [ -z $COUCH_URL ]; then ' +
        'echo "Missing required env var.  Check that all are set: ' +
        'COUCH_URL" && exit 1; fi',
      'check-version': `node scripts/ci/check-versions.js`,
      'undo-patches': {
        cmd: function() {
          const modulesToPatch = [
            'bootstrap-daterangepicker',
            'enketo-core',
            'font-awesome',
            'moment',
          ];
          return modulesToPatch.map(module => {
            const backupPath = `webapp/node_modules_backup/${module}`;
            const modulePath = `webapp/node_modules/${module}`;
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
          'npm run standard-wdio'
        ].join(' && '),
        stdio: 'inherit', // enable colors!
      },
      'wdio-run-default-mobile': {
        cmd: [
          'npm run default-wdio-mobile'
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
        cmd: 'UNIT_TEST_ENV=1 npm test --workspaces --if-present',
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
            'patch webapp/node_modules/enketo-core/src/js/form.js < webapp/patches/enketo-inputs-always-relevant_form.patch',
            'patch webapp/node_modules/enketo-core/src/js/relevant.js < webapp/patches/enketo-inputs-always-relevant_relevant.patch',

            // patch enketo to fix repeat name collision bug - this should be removed when upgrading to a new version of enketo-core
            // https://github.com/enketo/enketo-core/issues/815
            'patch webapp/node_modules/enketo-core/src/js/calculate.js < webapp/patches/enketo-repeat-name-collision.patch',

            // patch messageformat to add a default plural function for languages not yet supported by make-plural #5705
            'patch webapp/node_modules/messageformat/lib/plurals.js < webapp/patches/messageformat-default-plurals.patch',
          ];
          return patches.join(' && ');
        },
      },
      audit: { cmd: 'node ./scripts/audit-all.js' },
      'audit-allowed-list': { cmd: 'git diff $(cat .auditignore | git hash-object -w --stdin) $(node ./scripts/audit-all.js | git hash-object -w --stdin) --word-diff --exit-code' },
      'build-config': {
        cmd: () => {
          const medicConfPath = path.resolve('./node_modules/medic-conf/src/bin/medic-conf.js');
          const configPath = path.resolve('./config/default');
          const buildPath = path.resolve('./api/build/default-docs');
          const actions = ['upload-app-settings', 'upload-app-forms', 'upload-collect-forms', 'upload-contact-forms', 'upload-resources', 'upload-custom-translations'];
          return `node ${medicConfPath} --skip-dependency-check --archive --source=${configPath} --destination=${buildPath} ${actions.join(' ')}`;
        }
      },
      'build-webapp': {
        cmd: () => {
          const configuration = DEV ? 'development' : 'production';
          return [
            `cd webapp`,
            `../node_modules/.bin/ng build --configuration=${configuration} --progress=${DEV ? 'true' : 'false'}`,
            `../node_modules/.bin/ngc`,
            'cd ../',
          ].join(' && ');
        },
        stdio: 'inherit', // enable colors!
      },
      'watch-webapp': {
        cmd: () => {
          const configuration = DEV ? 'development' : 'production';
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
            `UNIT_TEST_ENV=1 ../node_modules/.bin/ng test webapp --watch=false --progress=${DEV ? 'true' : 'false'}`,
            'cd ../',
          ].join(' && ');
        },
        stdio: 'inherit', // enable colors!
      },
      'unit-webapp-continuous': {
        cmd: () => {
          return [
            'cd webapp',
            'UNIT_TEST_ENV=1 ../node_modules/.bin/ng test webapp --watch=true --progress=true',
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
          'notify:deployed',
        ],
      },
      'admin-js': {
        files: ['admin/src/js/**/*', 'shared-libs/*/src/**/*'],
        tasks: [
          'browserify:admin',
          'notify:deployed',
        ],
      },
      'admin-index': {
        files: ['admin/src/templates/index.html'],
        tasks: [
          'copy:admin-static',
          'notify:deployed',
        ],
      },
      'admin-templates': {
        files: ['admin/src/templates/**/*', '!admin/src/templates/index.html'],
        tasks: [
          'ngtemplates:adminApp',
          'notify:deployed',
        ],
      },
      'webapp-js': {
        // instead of watching the source files, watch the build folder and upload on rebuild
        files: ['api/build/static/webapp/**/*', '!api/build/static/webapp/service-worker.js'],
        tasks: ['update-service-worker', 'notify:deployed'],
      },
      'primary-ddoc': {
        files: ['ddocs/medic-db/**/*'],
        tasks: [
          'copy:ddocs',
          'set-ddocs-version',
          'exec:compile-ddocs-primary',
          'copy:api-ddocs',
          'notify:deployed',
        ],
      },
      'secondary-ddocs': {
        files: ['ddocs/*-db/**/*', '!ddocs/medic-db/**/*'],
        tasks: [
          'copy:ddocs',
          'set-ddocs-version',
          'exec:compile-ddocs-secondary',
          'copy:api-ddocs',
          'notify:deployed',
        ],
      },
      'api-public-files': {
        files: ['api/src/public/**/*'],
        tasks: ['copy:api-resources'],
      }
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
    /*
    ***** REMOVE - PROTRACTOR
    protractor: {
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
                'args': ['headless', 'disable-gpu', 'ignore-certificate-errors'],
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
              args: ['window-size=1024,768', 'ignore-certificate-errors']
            }
          }
        }
      }
    },
     */
    ngtemplates: {
      adminApp: {
        cwd: 'admin/src',
        src: ['templates/**/*.html', '!templates/index.html'],
        dest: 'api/build/static/admin/js/templates.js',
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
        implementation: require('sass'),
      },
      compile: {
        cwd: 'webapp/src/css/',
        src: 'enketo/enketo.scss',
        dest: 'api/build/static/webapp',
        ext: '.less',
        expand: true,
        outputStyle: 'expanded',
        flatten: true,
        extDot: 'last',
      },
    },
    'optimize-js': {
      'api/build/static/admin/js/main.js': 'api/build/static/admin/js/main.js',
      'api/build/static/admin/js/templates.js': 'api/build/static/admin/js/templates.js',
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
    'exec:npm-ci-modules',
    'copy:libraries-to-patch',
    'exec:apply-patches',
  ]);

  grunt.registerTask('build-webapp', 'Build webapp resources', [
    'build-enketo-css',
    'exec:build-webapp',
  ]);

  grunt.registerTask('build-enketo-css', 'Build Enketo css', [
    'sass',
  ]);

  grunt.registerTask('build', 'Build the static resources', [
    'exec:clean-build-dir',
    'build-ddocs',
    'build-webapp',
    //'exec:bundlesize', // bundlesize only checks webapp build files
    'build-admin',
    'build-config',
    'create-staging-doc',
    'populate-staging-doc',
  ]);

  grunt.registerTask('build-dev', 'Build the static resources', [
    'exec:clean-build-dir',
    'build-ddocs',
    'build-webapp',
    'build-admin',
    'build-config',
    'copy-static-files-to-api',
    'copy:api-ddocs',
    'notify:deployed',
  ]);

  grunt.registerTask('copy-static-files-to-api', 'Copy build files and static files to api', [
    'copy:api-bowser',
    'copy:api-resources',
    'copy:built-resources',
    'copy:webapp-static',
    'copy:admin-static',
  ]);

  grunt.registerTask('set-build-info', buildUtils.setBuildInfo);

  grunt.registerTask('build-ddocs', 'Builds the ddocs', [
    'copy:ddocs',
    'set-ddocs-version',
    'set-build-info',
    'exec:compile-ddocs-primary',
    'exec:compile-ddocs-secondary',
    'copy:api-ddocs',
  ]);

  grunt.registerTask('build-config', 'Build default configuration', [
    'exec:build-config',
  ]);

  grunt.registerTask('build-admin', 'Build the admin app', [
    'ngtemplates:adminApp',
    'browserify:admin',
    'less:admin',
    'minify-admin',
  ]);

  grunt.registerTask('build-service-images', 'Build api and sentinel images', [
    'copy-static-files-to-api',
    'exec:uglify-api',
    'cssmin:api',
    'env:version',
    'exec:build-service-images',
    'exec:build-images',
  ]);

  /*
  ***** REMOVE PROTRACTOR
  grunt.registerTask('start-webdriver', 'Starts Protractor Webdriver', [
    CI ? 'exec:start-webdriver-ci' : 'exec:start-webdriver',
  ]);
   */

  // Test tasks
  /*grunt.registerTask('e2e-deploy', 'Deploy app for testing', [
    'start-webdriver',
    'e2e-env-setup'
  ]);*/

  grunt.registerTask('e2e-env-setup', 'Deploy app for testing', [
    'build-service-images',
  ]);

  /*
  ***** REMOVE - PROTRACTOR
  grunt.registerTask('e2e-web', 'Deploy app for testing and run e2e tests', [
    'e2e-deploy',
    'protractor:e2e-web-tests',
  ]);
  grunt.registerTask('e2e-mobile', 'Deploy app for testing and run e2e tests', [
    'e2e-deploy',
    'protractor:e2e-mobile-tests',
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

   */

  grunt.registerTask('e2e-integration', 'Deploy app for testing', [
    'e2e-env-setup',
    'exec:e2e-integration',
    'exec:eslint-sw'
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

  grunt.registerTask('test-api-integration', 'Integration tests for api', [
    'exec:check-env-vars',
    'exec:npm-ci-api',
    'exec:mocha-integration-api',
  ]);

  grunt.registerTask('unit', 'Unit tests', [
    'unit-webapp-no-dependencies',
    'unit-admin',
    'exec:shared-lib-unit',
    'exec:mocha-unit-webapp',
    'exec:mocha-unit-api',
    'exec:mocha-unit-sentinel',
  ]);

  grunt.registerTask('unit-api', 'API unit tests', [
    'exec:mocha-unit-api',
  ]);

  grunt.registerTask('unit-sentinel', 'Sentinel unit tests', [
    'exec:mocha-unit-sentinel',
  ]);

  // CI tasks
  grunt.registerTask('minify-admin', 'Minify Admin JS and CSS', DEV ? [] : [
    'exec:uglify-admin',
    'optimize-js',
    'cssmin:admin',
  ]);

  grunt.registerTask('ci-compile-github', 'build, lint, unit, integration test', [
    'exec:check-version',
    'install-dependencies',
    'static-analysis',
    'build',
    'exec:mocha-integration-api',
    'unit',
  ]);

  /*
  ***** REMOVE - PROTRACTOR
  grunt.registerTask('ci-e2e', 'Run e2e tests for CI', [
    'start-webdriver',
    'protractor:e2e-web-tests',
    //'protractor:e2e-mobile-tests',
  ]);
  grunt.registerTask('ci-e2e-mobile', 'Run e2e tests for CI', [
    'start-webdriver',
    'protractor:e2e-mobile-tests',
  ]);
   */

  grunt.registerTask('ci-e2e-integration', 'Run e2e tests for CI', [
    'exec:e2e-integration',
    'exec:eslint-sw',
  ]);

  grunt.registerTask('ci-webdriver-default', 'Run e2e tests using webdriverIO for default config', [
    'exec:wdio-run-default'
  ]);

  grunt.registerTask('ci-webdriver-standard', 'Run e2e tests using webdriverIO for standard config', [
    'exec:wdio-run-standard'
  ]);

  grunt.registerTask('ci-webdriver-default-mobile', 'Run e2e tests using webdriverIO for default config in mobile screen', [
    'exec:wdio-run-default-mobile'
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
    'exec:watch-webapp',
    'watch',
  ]);

  grunt.registerTask('dev-api', 'Run api and watch for file changes', [
    'copy:api-bowser',
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
  grunt.registerTask('create-local-docker-compose-files', buildUtils.localDockerComposeFiles);
  grunt.registerTask('update-service-worker', function () {
    const done = this.async();
    buildUtils.updateServiceWorker().then(done);
  });
  grunt.registerTask('set-ddocs-version', buildUtils.setDdocsVersion);

  grunt.registerTask('publish-service-images', 'Publish service images', (() => {
    if (!BUILD_NUMBER) {
      return [];
    }

    if (INTERNAL_CONTRIBUTOR) {
      return ['exec:push-service-images'];
    }

    return ['exec:save-service-images'];
  })());

  grunt.registerTask('publish-for-testing', 'Build and publish service images, publish the staging doc to the testing server', [
    'build-service-images',
    'publish-service-images',
    'exec:compile-ddocs-staging',
    'exec:push-ddoc-to-staging',
  ]);

  grunt.registerTask('default', 'Build and deploy the webapp for dev', [
    'dev-webapp',
  ]);

  grunt.registerTask('build-documentation', 'Build documentation using jsdoc', [
    'jsdoc'
  ]);
};
