const baseConfig = require('../../wdio.conf.js');
const utils = require('@utils');
const { PerformanceReporter, export: exportPerformance } = require('@utils/performance');
const { generate: generateData } = require('./generate-dataset.js');

const prepData = async () => {
  await utils.toggleSentinelTransitions();

  const data = generateData();

  await utils.saveDocs([...data.places, ...data.clinics, ...data.persons, ...data.reports]);
  await utils.createUsers([data.user]);

  const result = await utils.request({
    path: '/api/v1/users-info',
    auth: {
      username: data.user.username,
      password: data.user.password,
    },
  });
  console.log(result);
};

// spec order is relevent, due to initial task calculation
const specs = [
  `./specs/login.wdio-spec.js`,
  `./specs/tasks.wdio-spec.js`,
  `./specs/contacts.wdio-spec.js`,
  `./specs/reports.wdio-spec.js`,
];

exports.config = {
  ...baseConfig.config,
  onPrepare: async () => {
    await baseConfig.config.onPrepare();

    await prepData();
  },

  after: () => {
    // global after hook will delete users and their data.
  },

  onComplete: async () => {
    await baseConfig.config.onComplete();
    await exportPerformance();
  },
  specs,
  suites: { all: specs },
  exclude: [],
  reporters: [PerformanceReporter],
  mochaOpts: {
    ui: 'bdd',
    timeout: 220000,
  },
};

