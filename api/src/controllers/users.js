const _ = require('lodash');
const db = require('../db');
const config = require('../config');
const dataContext = require('../services/data-context');
const { bulkUploadLog, roles, users } = require('@medic/user-management')(config, db, dataContext);
const auth = require('../auth');
const logger = require('@medic/logger');
const serverUtils = require('../server-utils');
const replication = require('../services/replication');

const hasFullPermission = req => {
  return auth
    .check(req, ['can_edit', 'can_update_users'])
    .then(() => true)
    .catch(err => {
      if (err.code === 403) {
        return false;
      }
      throw err;
    });
};

const isReferencingSelf = (userCtx, credentials, username) => (
  userCtx.name === username &&
  (!credentials || credentials.username === username)
);

const isUpdatingSelf = (req, credentials, username) => auth
  .getUserCtx(req)
  .then(userCtx => isReferencingSelf(userCtx, credentials, username));

const basicAuthValid = (credentials, username) => {
  if (!credentials) {
    return;
  }
  return auth.validateBasicAuth(credentials)
    .then(() => true) // Correct basic auth
    .catch(err => {
      logger.error(
        `Invalid authorization attempt on /api/v1/users/${username}`
      );
      logger.error('%o', err);
      return false; // Incorrect basic auth
    });
};

const isChangingPassword = req => Object.keys(req.body).includes('password');

const getRoles = req => {
  const params = req.query;
  let roles;
  try {
    roles = JSON.parse(params.role);
  } catch (err) {
    // if json.parse fails, consider we just got one string role as param
    return [params.role];
  }

  if (typeof roles === 'string') {
    roles = [roles];
  }

  if (!Array.isArray(roles)) {
    throw { code: 400, reason: 'Role parameter must be either a string or a JSON encoded array' };
  }

  if (roles.some(role => typeof role !== 'string')) {
    throw { code: 400, reason: 'All roles should be strings' };
  }

  return roles;
};

const getInfoUserCtx = req => {
  if (!roles.isOnlineOnly(req.userCtx)) {
    return req.userCtx;
  }

  if (!auth.hasAllPermissions(req.userCtx, 'can_update_users')) {
    throw { code: 403, reason: 'Insufficient privileges' };
  }
  const params = req.query;
  if (!params.role || !params.facility_id) {
    throw { code: 400, reason: 'Missing required query params: role and/or facility_id' };
  }

  const userRoles = getRoles(req);
  if (roles.hasOnlineRole(userRoles)) {
    throw { code: 400, reason: 'Provided role is not offline' };
  }

  return {
    roles: userRoles,
    facility_id: Array.isArray(params.facility_id) ? params.facility_id : [params.facility_id],
    contact_id: params.contact_id,
  };
};

const getAllowedDocsCounts = async (userCtx) => {
  const { docIds, warnDocIds, warn, limit } = await replication.getContext(userCtx);

  return {
    total_docs: docIds.length,
    warn_docs: warnDocIds.length,
    warn,
    limit,
  };
};

// this might not be correct.
// In express4, req.host strips off the port number: https://expressjs.com/en/guide/migrating-5.html#req.host
const getAppUrl = (req) => `${req.protocol}://${req.hostname}`;

const getUserList = async (req) => {
  await auth.check(req, 'can_view_users');
  const filters = {
    facilityId: req.query?.facility_id,
    contactId: req.query?.contact_id,
  };
  return await users.getList(filters);
};

const getType = user => {
  if (user.roles && user.roles.length) {
    return user.roles[0];
  }
  return 'unknown';
};

const convertUserListToV1 = (users=[]) => {
  users.forEach(user => {
    user.type = getType(user);
    delete user.roles;
  });
  return users;
};

const verifyUpdateRequest = async (req) => {
  const username = req.params.username;
  const credentials = auth.basicAuthCredentials(req);

  const basic = await basicAuthValid(credentials, username);
  if (basic === false) {
    // If you're passing basic auth we're going to validate it, even if we
    // technicaly don't need to (because you already have a valid cookie and
    // full permission).
    // This is to maintain consistency in the personal change password UI:
    // we want to validate the password you pass regardless of your permissions
    return Promise.reject({
      message: 'Bad username / password',
      code: 401,
    });
  }

  const fullPermission = await hasFullPermission(req);
  if (fullPermission) {
    return { fullPermission };
  }

  const updatingSelf = await isUpdatingSelf(req, credentials, username);
  if (!updatingSelf) {
    return Promise.reject({
      message: 'You do not have permissions to modify this person',
      code: 403,
    });
  }

  const changingPassword = isChangingPassword(req);
  if (_.isUndefined(basic) && changingPassword) {
    return Promise.reject({
      message: 'You must authenticate with Basic Auth to modify your password',
      code: 403,
    });
  }

  return { fullPermission };
};

module.exports = {
  list: (req, res) => {
    return getUserList(req)
      .then(list => convertUserListToV1(list))
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  },
  create: (req, res) => {
    return auth
      .check(req, ['can_edit', 'can_create_users'])
      .then(() => users.createUsers(req.body, getAppUrl(req)))
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  },
  update: async (req, res) => {
    if (_.isEmpty(req.body)) {
      return serverUtils.emptyJSONBodyError(req, res);
    }

    try {
      const { fullPermission } = await verifyUpdateRequest(req);
      const requesterContext = await auth.getUserCtx(req);

      const username = req.params.username;
      const result = await users.updateUser(username, req.body, !!fullPermission, getAppUrl(req));

      const body = Object.keys(req.body).join(',');
      logger.info(
        `REQ ${req.id} - Updated user '${username}'. ` +
        `Setting field(s) '${body}'. ` +
        `Requested by '${requesterContext?.name}'.`
      );
      res.json(result);
    } catch (err) {
      serverUtils.error(err, req, res);
    }
  },
  delete: (req, res) => {
    auth
      .check(req, ['can_edit', 'can_delete_users'])
      .then(() => users.deleteUser(req.params.username))
      .then(result => res.json(result))
      .catch(err => serverUtils.error(err, req, res));
  },
  info: (req, res) => {
    let userCtx;
    try {
      userCtx = getInfoUserCtx(req);
    } catch (err) {
      return serverUtils.error(err, req, res);
    }
    return getAllowedDocsCounts(userCtx)
      .then((result) => res.json(result))
      .catch(err => serverUtils.error(err, req, res));
  },

  v2: {
    get: async (req, res) => {
      try {
        const userCtx = await auth.getUserCtx(req);
        const hasPermission = auth.hasAllPermissions(userCtx, 'can_view_users');
        if (!hasPermission && !isReferencingSelf(userCtx, auth.basicAuthCredentials(req), req.params.username)) {
          serverUtils.error({ message: 'Insufficient privileges', code: 403 }, req, res);
          return;
        }
        const user  = await users.getUser(req.params.username);
        return res.json(user);
      } catch (err) {
        serverUtils.error(err, req, res);
      }
    },
    list: async (req, res) => {
      try {
        const body = await getUserList(req);
        res.json(body);
      } catch (err) {
        serverUtils.error(err, req, res);
      }
    },
    create: async (req, res) => {
      try {
        await auth.check(req, ['can_edit', 'can_create_users']);
        const user = await auth.getUserCtx(req);
        const logId = await bulkUploadLog.createLog(user, 'user');
        let usersToCreate;
        let ignoredUsers;

        if (typeof req.body === 'string') {
          const parsedCsv = await users.parseCsv(req.body, logId);
          usersToCreate = parsedCsv.users;
          ignoredUsers = parsedCsv.ignoredUsers;
        } else {
          usersToCreate = req.body;
        }

        const response = await users.createUsers(
          usersToCreate,
          getAppUrl(req),
          ignoredUsers,
          logId
        );
        res.json(response);
      } catch (error) {
        serverUtils.error(error, req, res);
      }
    },
  },
  v3: {
    create: async (req, res) => {
      try {
        await auth.check(req, ['can_edit', 'can_create_users']);

        const response = await users.createMultiFacilityUser(req.body, getAppUrl(req));
        res.json(response);
      } catch (error) {
        serverUtils.error(error, req, res);
      }
    },
    update: (req, res) => {
      return module.exports.update(req, res);
    },
  }
};
