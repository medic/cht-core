const _ = require('lodash');
const auth = require('../auth');
const logger = require('../logger');
const serverUtils = require('../server-utils');
const usersService = require('../services/users');
const authorization = require('../services/authorization');
const purgedDocs = require('../services/purged-docs');
const bulkUploadLog = require('../services/bulk-upload-log');

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

const isUpdatingSelf = (req, credentials, username) => {
  return auth.getUserCtx(req).then(userCtx => {
    return (
      userCtx.name === username &&
      (!credentials || credentials.username === username)
    );
  });
};

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
  if (!auth.isOnlineOnly(req.userCtx)) {
    return req.userCtx;
  }

  if (!auth.hasAllPermissions(req.userCtx, 'can_update_users')) {
    throw { code: 403, reason: 'Insufficient privileges' };
  }
  const params = req.query;
  if (!params.role || !params.facility_id) {
    throw { code: 400, reason: 'Missing required query params: role and/or facility_id' };
  }

  const roles = getRoles(req);
  if (auth.hasOnlineRole(roles)) {
    throw { code: 400, reason: 'Provided role is not offline' };
  }

  return {
    roles: roles,
    facility_id: params.facility_id,
    contact_id: params.contact_id,
  };
};

const getAllowedDocsCounts = async (userCtx) => {
  const authCtx = await authorization.getAuthorizationContext(userCtx);
  const docsByReplicationKey = await authorization.getDocsByReplicationKey(authCtx);

  const excludeTombstones = { includeTombstones: false };
  const allAllowedIds = authorization.filterAllowedDocIds(authCtx, docsByReplicationKey, excludeTombstones);
  const allUnpurgedIds = await purgedDocs.getUnPurgedIds(userCtx.roles, allAllowedIds);

  const excludeTombstonesAndTasks = { includeTombstones: false, includeTasks: false };
  const allWarnIds = authorization.filterAllowedDocIds(authCtx, docsByReplicationKey, excludeTombstonesAndTasks);
  const unpurgedWarnIds = _.intersection(allUnpurgedIds, allWarnIds);

  return {
    total: allUnpurgedIds.length,
    warn: unpurgedWarnIds.length,
  };
};

// this might not be correct.
// In express4, req.host strips off the port number: https://expressjs.com/en/guide/migrating-5.html#req.host
const getAppUrl = (req) => `${req.protocol}://${req.hostname}`;

const getUserList = async (req) => {
  await auth.check(req, 'can_view_users');
  return await usersService.getList();
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

module.exports = {
  get: (req, res) => {
    return getUserList(req)
      .then(list => convertUserListToV1(list))
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  },
  create: (req, res) => {
    return auth
      .check(req, ['can_edit', 'can_create_users'])
      .then(() => usersService.createUsers(req.body, getAppUrl(req)))
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  },
  update: (req, res) => {
    if (_.isEmpty(req.body)) {
      return serverUtils.emptyJSONBodyError(req, res);
    }

    const username = req.params.username;
    const credentials = auth.basicAuthCredentials(req);

    return Promise.all([
      hasFullPermission(req),
      isUpdatingSelf(req, credentials, username),
      basicAuthValid(credentials, username),
      isChangingPassword(req),
      auth.getUserCtx(req),
    ])
      .then(
        ([
          fullPermission,
          updatingSelf,
          basic,
          changingPassword,
          requesterContext,
        ]) => {
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

          if (!fullPermission) {
            if (!updatingSelf) {
              return Promise.reject({
                message: 'You do not have permissions to modify this person',
                code: 403,
              });
            }

            if (_.isUndefined(basic) && changingPassword) {
              return Promise.reject({
                message:
                  'You must authenticate with Basic Auth to modify your password',
                code: 403,
              });
            }
          }

          return usersService
            .updateUser(username, req.body, !!fullPermission, getAppUrl(req))
            .then(result => {
              logger.info(
                `REQ ${
                  req.id
                } - Updated user '${username}'. Setting field(s) '${Object.keys(
                  req.body
                ).join(',')}'. Requested by '${requesterContext &&
                  requesterContext.name}'.`
              );
              return result;
            });
        }
      )
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  },
  delete: (req, res) => {
    auth
      .check(req, ['can_edit', 'can_delete_users'])
      .then(() => usersService.deleteUser(req.params.username))
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
      .then(({ total, warn }) => res.json({
        total_docs: total,
        warn_docs: warn,
        warn: warn >= usersService.DOC_IDS_WARN_LIMIT,
        limit: usersService.DOC_IDS_WARN_LIMIT,
      }))
      .catch(err => serverUtils.error(err, req, res));
  },

  v2: {
    get: async (req, res) => {
      try {
        const body = await getUserList(req, res);
        res.json(body);
      } catch(err) {
        serverUtils.error(err, req, res);
      }
    },
    create: async (req, res) => {
      try {
        await auth.check(req, ['can_edit', 'can_create_users']);
        const logId = await bulkUploadLog.createLog(req, 'user');
        let users;
        let ignoredUsers;

        if (typeof req.body === 'string') {
          const parsedCsv = await usersService.parseCsv(req.body, logId);
          users = parsedCsv.users;
          ignoredUsers = parsedCsv.ignoredUsers;
        } else {
          users = req.body;
        }

        const response = await usersService.createUsers(
          users,
          getAppUrl(req),
          ignoredUsers,
          logId
        );
        res.json(response);
      } catch (error) {
        serverUtils.error(error, req, res);
      }
    },
  }
};
