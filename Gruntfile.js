const url = require('url');
const packageJson = require('./package.json');

const {
  TRAVIS_TAG,
  TRAVIS_BRANCH,
  COUCH_URL,
  COUCH_NODE_NAME,
  UPLOAD_URL,
  TRAVIS_BUILD_NUMBER
} = process.env;

const releaseName = TRAVIS_TAG || TRAVIS_BRANCH || 'local-development';

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
  require('time-grunt')(grunt);

  // Project configuration
  grunt.initConfig({
    replace: {
      'update-app-constants': {
        src: ['build/ddocs/medic/_attachments/js/inbox.js'],
        overwrite: true,
        replacements: [
          {
            from: /@@APP_CONFIG.version/g,
            to: packageJson.version,
          },
          {
            from: /@@APP_CONFIG.name/g,
            to: packageJson.name,
          },
        ],
      },
      'change-ddoc-id-for-publish': {
        src: ['build/ddocs/medic.json'],
        overwrite: true,
        replacements: [
          {
            from: '"_id": "_design/medic"',
            to: `"_id": "medic:medic:${releaseName}"`,
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
          [couchConfig.withPathNoAuth('medic-test')]: 'build/ddocs/medic.json',
        },
      },
      staging: {
        files: [
          {
            src: 'build/ddocs/medic.json',
            dest: UPLOAD_URL + '/_couch/builds',
          },
        ],
      },
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
          transform: ['browserify-ngannotate'],
          alias: {
            'enketo-config': './webapp/src/js/enketo/config.json',
            widgets: './webapp/src/js/enketo/widgets',
            './xpath-evaluator-binding':
              './webapp/src/js/enketo/OpenrosaXpathEvaluatorBinding',
            'extended-xpath':
              './webapp/node_modules/openrosa-xpath-evaluator/src/extended-xpath',
            'openrosa-xpath-extensions':
              './webapp/node_modules/openrosa-xpath-evaluator/src/openrosa-xpath-extensions',
            translator: './webapp/src/js/enketo/translator', // translator for enketo's internal i18n
            '../../js/dropdown.jquery':
              './webapp/node_modules/bootstrap/js/dropdown', // enketo currently duplicates bootstrap's dropdown code.  working to resolve this upstream https://github.com/enketo/enketo-core/issues/454
            'angular-translate-interpolation-messageformat':
              './webapp/node_modules/angular-translate/dist/angular-translate-interpolation-messageformat/angular-translate-interpolation-messageformat',
            'angular-translate-handler-log':
              './webapp/node_modules/angular-translate/dist/angular-translate-handler-log/angular-translate-handler-log',
            moment: './webapp/node_modules/moment/moment',
          },
        },
      },
      admin: {
        src: 'admin/src/js/main.js',
        dest: 'build/ddocs/medic-admin/_attachments/js/main.js',
        options: {
          transform: ['browserify-ngannotate'],
          alias: {
            'angular-translate-interpolation-messageformat':
              './admin/node_modules/angular-translate/dist/angular-translate-interpolation-messageformat/angular-translate-interpolation-messageformat',
          },
        },
      },
    },
    uglify: {
      options: {
        banner:
          '/*! Medic Mobile <%= grunt.template.today("yyyy-mm-dd") %> */\n',
      },
      build: {
        files: {
          'build/ddocs/medic/_attachments/js/templates.js':
            'build/ddocs/medic/_attachments/js/templates.js',
          'build/ddocs/medic/_attachments/js/inbox.js':
            'build/ddocs/medic/_attachments/js/inbox.js',
          'build/ddocs/medic-admin/_attachments/js/main.js':
            'build/ddocs/medic-admin/_attachments/js/main.js',
          'build/ddocs/medic-admin/_attachments/js/templates.js':
            'build/ddocs/medic-admin/_attachments/js/templates.js',
        },
      },
    },
    env: {
      'unit-test': {
        options: {
          add: {
            UNIT_TEST_ENV: '1',
          },
        },
      },
      general: {
        options: {
          replace: {
            UNIT_TEST_ENV: '',
          },
        },
      },
    },
    jshint: {
      options: {
        jshintrc: true,
        reporter: require('jshint-stylish'),
        ignores: [
          'webapp/src/js/modules/xpath-element-path.js',
          '**/node_modules/**',
          'sentinel/src/lib/pupil/**',
          'build/**',
          'config/**'
        ],
      },
      all: [
        'Gruntfile.js',
        'webapp/src/**/*.js',
        'webapp/tests/**/*.js',
        'tests/**/*.js',
        'api/**/*.js',
        'sentinel/**/*.js',
        'shared-libs/**/*.js',
        'admin/**/*.js',
        'ddocs/**/*.js',
      ],
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
      all: {
        options: {
          keepSpecialComments: 0,
        },
        files: {
          'build/ddocs/medic/_attachments/css/inbox.css':
            'build/ddocs/medic/_attachments/css/inbox.css',
          'build/ddocs/medic-admin/_attachments/css/main.css':
            'build/ddocs/medic-admin/_attachments/css/main.css',
        },
      },
    },
    postcss: {
      options: {
        processors: [
          require('autoprefixer')({
            browsers: ['last 2 Firefox versions', 'Chrome >= 54'],
          }),
        ],
      },
      dist: {
        src: 'build/ddocs/medic/_attachments/css/*.css',
      },
    },
    copy: {
      ddocs: {
        files: [
          {
            expand: true,
            cwd: 'ddocs/',
            src: '**/*',
            dest: 'build/ddocs/',
          },
        ],
      },
      webapp: {
        files: [
          {
            expand: true,
            flatten: true,
            src: 'webapp/node_modules/font-awesome/fonts/*',
            dest: 'build/ddocs/medic/_attachments/fonts/',
          },
        ],
      },
      'inbox-file-attachment': {
        expand: true,
        cwd: 'webapp/src/',
        src: 'templates/inbox.html',
        dest: 'build/ddocs/medic/_attachments/',
      },
      'ddoc-attachments': {
        files: [
          {
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
        ],
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
            src: ['admin/node_modules/font-awesome/fonts/*', 'webapp/src/fonts/**/*'],
            dest: 'build/ddocs/medic-admin/_attachments/fonts/',
          },
        ],
      },
      'libraries-to-patch': {
        files: [
          {
            expand: true,
            cwd: 'webapp/node_modules',
            src: [
              'bootstrap-daterangepicker/**',
              'enketo-core/**',
              'font-awesome/**',
              'moment/**',
            ],
            dest: 'webapp/node_modules_backup',
          },
        ],
      },
      'enketo-xslt': {
        files: [
          {
            expand: true,
            flatten: true,
            src: 'webapp/node_modules/medic-enketo-xslt/xsl/*.xsl',
            dest: 'build/ddocs/medic/_attachments/xslt/',
          },
        ],
      },
    },
    exec: {
      'clean-build-dir': {
        cmd: 'rm -rf build && mkdir build',
      },
      'pack-node-modules': {
        cmd: ['api', 'sentinel']
          .map(module =>
            [
              `cd ${module}`,
              `rm -rf node_modules`,
              `npm ci --production`,
              `npm pack`,
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
            this.file.write(filePath, JSON.stringify(pkg, undefined, '  '));
            console.log(`Updated 'bundledDependencies' for ${filePath}`);
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
            version = require('./package.json').version;
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
          echo "${require('./package.json').version}" > base_version;
          echo "${new Date().toISOString()}" > time;
          echo "grunt on \`whoami\`" > author;`,
      },
      'api-dev': {
        cmd:
          'TZ=UTC ./node_modules/.bin/nodemon --watch api api/server.js -- --allow-cors',
      },
      'sentinel-dev': {
        cmd:
          'TZ=UTC ./node_modules/.bin/nodemon --watch sentinel sentinel/server.js',
      },
      'blank-link-check': {
        cmd: `echo "Checking for dangerous _blank links..." &&
               ! (git grep -E  'target\\\\?="_blank"' -- webapp/src |
                      grep -Ev 'target\\\\?="_blank" rel\\\\?="noopener noreferrer"' |
                      grep -Ev '^\s*//' &&
                  echo 'ERROR: Links found with target="_blank" but no rel="noopener noreferrer" set.  Please add required rel attribute.')`,
      },
      'setup-admin': {
        cmd:
          `curl -X PUT ${couchConfig.withPathNoAuth(couchConfig.dbName)}` +
          ` && curl -X PUT ${couchConfig.withPathNoAuth('_users')}` +
          ` && curl -X PUT ${couchConfig.withPathNoAuth('_node/' + COUCH_NODE_NAME + '/_config/admins/admin')} -d '"${couchConfig.password}"'` +
          ` && curl -X POST ${couchConfig.withPath('_users')} ` +
          ' -H "Content-Type: application/json" ' +
          ` -d '{"_id": "org.couchdb.user:${couchConfig.username}", "name": "${couchConfig.username}", "password":"${couchConfig.password}", "type":"user", "roles":[]}' ` +
          ` && curl -X PUT --data '"true"' ${couchConfig.withPath('_node/' + COUCH_NODE_NAME + '/_config/chttpd/require_valid_user')}` +
          ` && curl -X PUT --data '"4294967296"' ${couchConfig.withPath('_node/' + COUCH_NODE_NAME + '/_config/httpd/max_http_request_size')}`,
      },
      'reset-test-databases': {
        stderr: false,
        cmd: ['medic-test', 'medic-test-audit']
          .map(
            name => `curl -X DELETE ${couchConfig.withPath(name)}`
          )
          .join(' && '),
      },
      bundlesize: {
        cmd: 'node ./node_modules/bundlesize/index.js',
      },
      'setup-api-integration': {
        cmd: 'cd api && npm ci',
      },
      'npm-ci-shared-libs': {
        cmd: () => {
          const fs = require('fs');
          return fs
            .readdirSync('shared-libs')
            .filter(f => fs.lstatSync(`shared-libs/${f}`).isDirectory())
            .map(
              lib =>
                `echo Installing shared library: ${lib} &&
                  (cd shared-libs/${lib} &&
                  [ "$(jq .scripts.test package.json)" = "null" ] || npm ci)`
            )
            .join(' && ');
        }
      },
      'npm-ci-modules': {
        cmd: ['webapp', 'api', 'sentinel', 'admin']
          .map(dir => `echo "[${dir}]" && cd ${dir} && npm ci && cd ..`)
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
      'undo-patches': {
        cmd: function() {
          var modulesToPatch = [
            'bootstrap-daterangepicker',
            'enketo-core',
            'font-awesome',
            'moment',
          ];
          return modulesToPatch
            .map(function(module) {
              var backupPath = 'webapp/node_modules_backup/' + module;
              var modulePath = 'webapp/node_modules/' + module;
              return (
                '[ -d ' +
                backupPath +
                ' ]' +
                ' && rm -rf ' +
                modulePath +
                ' && mv ' +
                backupPath +
                ' ' +
                modulePath +
                ' && echo "Module restored: ' +
                module +
                '"' +
                ' || echo "No restore required for: ' +
                module +
                '"'
              );
            })
            .join(' && ');
        },
      },
      'shared-lib-unit': {
        cmd: () => {
          const fs = require('fs');
          return fs
            .readdirSync('shared-libs')
            .filter(f => fs.lstatSync(`shared-libs/${f}`).isDirectory())
            .map(
              lib =>
                `echo Testing shared library: ${lib} &&
                  (cd shared-libs/${lib} &&
                  [ "$(jq .scripts.test package.json)" = "null" ] || (npm ci && npm test))`
            )
            .join(' && ');
        },
      },
      // To monkey patch a library...
      // 1. copy the file you want to change
      // 2. make the changes
      // 3. run `diff -c original modified > webapp/patches/my-patch.patch`
      // 4. update grunt targets: "apply-patches", "undo-patches", and "libraries-to-patch"
      'apply-patches': {
        cmd: function() {
          var patches = [
            // patch the daterangepicker for responsiveness
            // https://github.com/dangrossman/bootstrap-daterangepicker/pull/437
            'patch webapp/node_modules/bootstrap-daterangepicker/daterangepicker.js < webapp/patches/bootstrap-daterangepicker.patch',

            // patch font-awesome to remove version attributes so appcache works
            // https://github.com/FortAwesome/Font-Awesome/issues/3286
            'patch webapp/node_modules/font-awesome/less/path.less < webapp/patches/font-awesome-remove-version-attribute.patch',

            // patch moment.js to use western arabic (european) numerals in Hindi
            'patch webapp/node_modules/moment/locale/hi.js < webapp/patches/moment-hindi-use-euro-numerals.patch',

            // patch enketo to always mark the /inputs group as relevant
            'patch webapp/node_modules/enketo-core/src/js/Form.js < webapp/patches/enketo-inputs-always-relevant.patch',
          ];
          return patches.join(' && ');
        },
      },
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
        files: ['admin/src/js/**/*'],
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
          'appcache',
          'couch-compile:primary',
          'deploy',
        ],
      },
      'webapp-js': {
        files: ['webapp/src/js/**/*', 'shared-libs/**'],
        tasks: [
          'browserify:webapp',
          'replace:update-app-constants',
          'appcache',
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
          'appcache',
          'couch-compile:primary',
          'deploy',
        ],
      },
      'inbox-html-template': {
        files: 'webapp/src/templates/inbox.html',
        tasks: [
          'copy:inbox-file-attachment',
          'appcache',
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
      'e2e-tests-and-services': {
        options: {
          configFile: 'tests/e2e.tests-and-services.conf.js',
        },
      },
      'e2e-tests-only': {
        options: {
          configFile: 'tests/e2e.tests-only.conf.js',
        },
      },
      'performance-tests-and-services': {
        options: {
          configFile: 'tests/performance.tests-and-services.conf.js',
        },
      },
      'performance-tests-only': {
        options: {
          configFile: 'tests/performance.tests-only.conf.js',
        },
      },
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
    appcache: {
      options: {
        basePath: 'build/ddocs/medic/_attachments',
      },
      inbox: {
        dest: 'build/ddocs/medic/_attachments/manifest.appcache',
        network: '*',
        cache: {
          patterns: [
            'build/ddocs/medic/_attachments/manifest.json',
            'build/ddocs/medic/_attachments/audio/**/*',
            'build/ddocs/medic/_attachments/css/**/*',
            'build/ddocs/medic/_attachments/fonts/**/*',
            'build/ddocs/medic/_attachments/img/**/*',
            'build/ddocs/medic/_attachments/js/**/*',
            'build/ddocs/medic/_attachments/xslt/**/*',
          ],
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
    'regex-check': {
      'only-in-tests': {
        files: [
          {
            src: [
              'api/tests/**/*.js',
              'webapp/tests/**/*.js',
              'sentinel/tests/**/*.js',
              'admin/tests/**/*.js',
              'config/*/test/**/*.spec.js',
            ],
          },
        ],
        options: {
          // in Mocha, .only() is used
          // in Jasmine, fdescribe() and fit() are used
          pattern: /(\.only\()|(fdescribe\()|(fit\()/g,
        },
      },
      'console-in-angular': {
        files: [
          {
            src: [
              'webapp/src/js/**/*.js',
              'admin/src/js/**/*.js',

              // ignored because they don't have access to angular
              '!webapp/src/js/app.js',
              '!webapp/src/js/bootstrapper/*.js',

              // ignored because its job is to log to console
              '!webapp/src/js/modules/feedback.js',
            ],
          },
        ],
        options: {
          pattern: /console\./g,
        },
      },
      'console-in-node': {
        files: [
          {
            src: [
              'api/**/*.js',
              'sentinel/**/*.js',

              // ignore because they are sent to the client side/frontend
              '!api/src/public/**/*.js',

              // ignore build dirs
              '!**/node_modules/**',
            ],
          },
        ],
        options: {
          pattern: /console\./g,
        },
      },
    },
    xmlmin: {
      'enketo-xslt': {
        files: {
          'build/ddocs/medic/_attachments/xslt/openrosa2html5form.xsl':
            'build/ddocs/medic/_attachments/xslt/openrosa2html5form.xsl',
          'build/ddocs/medic/_attachments/xslt/openrosa2xmlmodel.xsl':
            'build/ddocs/medic/_attachments/xslt/openrosa2xmlmodel.xsl',
        },
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
  });

  // Build tasks
  grunt.registerTask('install-dependencies', 'Update and patch dependencies', [
    'exec:undo-patches',
    'exec:npm-ci-shared-libs',
    'exec:npm-ci-modules',
    'copy:libraries-to-patch',
    'exec:apply-patches',
  ]);

  grunt.registerTask('mmjs', 'Build the JS resources', [
    'browserify:webapp',
    'replace:update-app-constants',
    'ngtemplates:inboxApp',
  ]);

  grunt.registerTask('mmcss', 'Build the CSS resources', [
    'sass',
    'less:webapp',
    'postcss',
  ]);

  grunt.registerTask('enketo-xslt', 'Process enketo XSL stylesheets', [
    'copy:enketo-xslt',
    'xmlmin:enketo-xslt',
  ]);

  grunt.registerTask('build', 'Build the static resources', [
    'exec:clean-build-dir',
    'copy:ddocs',
    'build-node-modules',
    'mmcss',
    'mmjs',
    'enketo-xslt',
    'minify',
    'build-common',
  ]);

  grunt.registerTask('build-dev', 'Build the static resources', [
    'exec:clean-build-dir',
    'copy:ddocs',
    'mmcss',
    'mmjs',
    'enketo-xslt',
    'build-common',
  ]);

  grunt.registerTask('build-common', 'Build the static resources', [
    'copy:webapp',
    'exec:set-ddoc-version',
    'exec:set-horticulturalist-metadata',
    'build-admin',
    'build-ddoc',
  ]);

  grunt.registerTask('build-ddoc', 'Build the main ddoc', [
    'couch-compile:secondary',
    'copy:ddoc-attachments',
    'appcache',
    'couch-compile:primary',
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

  grunt.registerTask(
    'build-node-modules',
    'Build and pack api and sentinel bundles',
    ['exec:bundle-dependencies', 'exec:pack-node-modules']
  );

  // Test tasks
  grunt.registerTask('e2e', 'Deploy app for testing and run e2e tests', [
    'exec:reset-test-databases',
    'build-admin',
    'build-node-modules',
    'build-ddoc',
    'couch-push:test',
    'protractor:e2e-tests-and-services',
  ]);

  grunt.registerTask('test-perf', 'Run performance-specific tests', [
    'exec:reset-test-databases',
    'build-node-modules',
    'build-ddoc',
    'couch-push:test',
    'protractor:performance-tests-and-services',
  ]);

  grunt.registerTask(
    'unit-continuous',
    'Lint, karma unit tests running on a loop',
    ['jshint', 'karma:unit-continuous']
  );

  grunt.registerTask(
    'test-api-integration',
    'Integration tests for medic-api',
    [
      'exec:check-env-vars',
      'exec:setup-api-integration',
      'mochaTest:api-integration',
    ]
  );

  grunt.registerTask('unit', 'Lint and unit tests', [
    'jshint',
    'karma:unit',
    'karma:admin',
    'exec:shared-lib-unit',
    'env:unit-test',
    'mochaTest:unit',
    'env:general',
  ]);

  grunt.registerTask(
    'test',
    'Lint, unit tests, api-integration tests and e2e tests',
    ['unit', 'test-api-integration', 'e2e']
  );

  // CI tasks
  grunt.registerTask('minify', 'Minify JS and CSS', [
    'uglify',
    'optimize-js',
    'cssmin',
    'exec:bundlesize',
  ]);

  grunt.registerTask('ci-build', 'build and minify for CI', [
    'install-dependencies',
    'build',
    'build-admin',
  ]);

  grunt.registerTask('ci-unit', 'Lint, deploy and test for CI', [
    'static-analysis',
    'install-dependencies',
    'karma:unit',
    'karma:admin',
    'exec:shared-lib-unit',
    'env:unit-test',
    'mochaTest:unit',
  ]);

  grunt.registerTask('ci-integration-e2e', 'Run further tests for CI', [
    'env:general',
    'exec:setup-admin',
    'deploy',
    'test-api-integration',
    'exec:start-webdriver',
    'e2e',
  ]);

  grunt.registerTask('ci-performance', 'Run performance tests on CI', [
    'env:general',
    'exec:setup-admin',
    'exec:start-webdriver',
    'deploy',
    'test-perf',
  ]);

  // Dev tasks
  grunt.registerTask('dev-webapp', 'Build and deploy the webapp for dev', [
    'install-dependencies',
    'dev-webapp-no-dependencies',
  ]);

  grunt.registerTask('static-analysis', 'Static analysis checks', [
    'regex-check',
    'exec:blank-link-check',
    'jshint',
  ]);

  grunt.registerTask(
    'dev-webapp-no-dependencies',
    'Build and deploy the webapp for dev, without reinstalling dependencies.',
    ['build-dev', 'deploy', 'watch']
  );

  grunt.registerTask('dev-api', 'Run api and watch for file changes', [
    'exec:api-dev',
  ]);

  grunt.registerTask('secure-couchdb', 'Basic developer setup for CouchDB', [
    'exec:setup-admin',
  ]);

  grunt.registerTask(
    'dev-sentinel',
    'Run sentinel and watch for file changes',
    ['exec:sentinel-dev']
  );

  grunt.registerTask('publish', 'Publish the ddoc to the staging server', [
    'replace:change-ddoc-id-for-publish',
    'couch-push:staging',
  ]);

  grunt.registerTask('default', 'Build and deploy the webapp for dev', [
    'dev-webapp',
  ]);
};
