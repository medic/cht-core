const baseConfig = require('../../wdio.conf.js');
const utils = require('@utils');
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

module.exports = {
  ...baseConfig,
  onPrepare: async () => {
    await baseConfig.onPrepare();

    await prepData();
  },
  suites: {
    all: ['**/*.wdio-spec.js'],
  }
};
