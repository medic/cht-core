const csvParse = require('csv-parse/lib/sync');
const userPrompt = require('../../src/lib/user-prompt');

const api = require('../lib/api');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const { info, warn, error } = require('../lib/log');

const nestPrefixedProperties = (obj, name) => {
  const nested = {};
  const prefix = `${name}.`;
  Object
    .keys(obj)
    .filter(key => key.startsWith(prefix))
    .forEach(key => {
      nested[key.substring(prefix.length)] = obj[key];
      delete obj[key];
    });
  return obj[name] || nested;
};

const parseUsersData = (csvData) => {
  const users = csvParse(csvData, { columns: true });
  users.forEach(user => {
    user.contact = nestPrefixedProperties(user, 'contact');
    user.place = nestPrefixedProperties(user, 'place');
    user.roles = user.roles && user.roles.split(':');
  });
  return users;
};

const getUserInfo = async (user) => {
  const getId = (obj) => typeof obj === 'string' ? obj : obj._id;
  const facilityId = getId(user.place);
  if (!facilityId) {
    // new place - nothing to check
    return;
  }

  const params = {
    facility_id: facilityId,
    role: JSON.stringify(user.roles),
    contact: getId(user.contact),
  };

  info(`Requesting user-info for "${user.username}"`);
  let result;
  try {
    result = await api().getUserInfo(params);
  } catch (err) {
    // we can safely ignore some errors
    // - 404: This endpoint was only added in 3.7
    // - 400: The endpoint throws an error if the requested roles are "online"
    // - 400: Missing facility or role, the corresponding user create request will fail
    if (err.statusCode !== 404 && err.statusCode !== 400) {
      throw err;
    }
  }
  return result;
};

const execute = async () => {
  const csvPath = `${environment.pathToProject}/users.csv`;
  if(!fs.exists(csvPath)) {
    throw new Error(`User csv file not found at ${csvPath}`);
  }

  const users = parseUsersData(fs.read(csvPath));
  const warnings = [];
  for (let user of users) {
    const userInfo = await getUserInfo(user);
    if (userInfo && userInfo.warn) {
      warnings.push(`The user "${user.username}" would replicate ${userInfo.total_docs}, which is above the recommended limit of ${userInfo.limit}.`);
    }
  }
  if (warnings.length) {
    warnings.forEach(warning => warn(warning));
    warn('Are you sure you want to continue?');
    if(!userPrompt.keyInYN()) {
      error('User failed to confirm action.');
      process.exit(1);
      // stop execution in tests
      return; // eslint-disable-line no-unreachable
    }
  }

  for (let user of users) {
    info(`Creating user ${user.username}`);
    await api().createUser(user);
  }
};

module.exports = {
  requiresInstance: true,
  execute
};