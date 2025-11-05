const moment = require('moment/moment');
const utils = require('@utils/index');
const { USERNAME } = require('@constants');

const TELEMETRY_PREFIX = 'telemetry';

const getTelemetryDbName = (username, date) => {
  const formattedDate = moment(date).format('YYYY-M-D');
  return `${TELEMETRY_PREFIX}-${formattedDate}-${username}`;
};

const destroyDbInBrowser = (dbName) => browser.execute(
  // eslint-disable-next-line no-undef
  (dbName) => window.PouchDB(dbName).destroy(),
  dbName
);

const getTelemetryFromBrowser = async (dbName, key) => browser.execute(
  async (dbName, key) => {
    // eslint-disable-next-line no-undef
    const docs = await window.PouchDB(dbName).allDocs({ include_docs: true });
    return docs.rows
      .filter(({ doc }) => doc.key === key)
      .map(({ doc }) => doc)
      .sort((a, b) => a.date_recorded - b.date_recorded);
  },
  dbName,
  key
);

const getTelemetryFromUserMetaDb = async (username, password) => {
  const options = { auth: { username, password }, userName: username };
  const metaDocs = await utils.requestOnTestMetaDb({ ...options, path: '/_all_docs?include_docs=true' });
  return metaDocs.rows
    .filter(({ id }) => id.startsWith(TELEMETRY_PREFIX))
    .map(({ doc }) => doc);
};

const getTelemetry = async (key, username = null) => {
  const dbName = getTelemetryDbName(username?? USERNAME, new Date());
  return await getTelemetryFromBrowser(dbName, key);
};

const destroyTelemetryDb = (username = null) => {
  const dbName = getTelemetryDbName(username?? USERNAME, new Date());
  return destroyDbInBrowser(dbName);
};

module.exports = {
  getTelemetryDbName,
  getTelemetryFromBrowser,
  getTelemetryFromUserMetaDb,
  destroyDbInBrowser,
  getTelemetry,
  destroyTelemetryDb,
};
