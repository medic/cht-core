const baseConfig = require('../../wdio.conf.js');
const utils = require('@utils');
const { PerformanceReporter } = require('@utils/performance');
const { generate: generateData } = require('./generate-dataset.js');

const prepData = async () => {
  await utils.toggleSentinelTransitions();

  const data = generateData();

  await utils.saveDocs(data.places);
  await utils.createUsers([data.user]);

  await utils.saveDocs(data.clinics);
  await utils.saveDocs(data.persons);
  await utils.saveDocs(data.reports);

  const result = await utils.request({
    path: '/api/v1/users-info',
    auth: {
      username: data.user.username,
      password: data.user.password,
    },
  });
  console.warn(result);
};

exports.config = {
  ...baseConfig.config,
  onPrepare: async () => {
    await baseConfig.config.onPrepare();

    await prepData();
  },

  after: () => {
  },
  specs: [
    `./specs/login.wdio-spec.js`,
    `./specs/tasks.wdio-spec.js`,
    `./specs/contacts.wdio-spec.js`,
  ],
  suites: {
    all: [
      `./specs/login.wdio-spec.js`,
      `./specs/tasks.wdio-spec.js`,
      `./specs/contacts.wdio-spec.js`,
      `./specs/reports.wdio-spec.js`,
    ],
  },
  exclude: [],
  reporters: ['spec', PerformanceReporter],
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000,
  },
};

