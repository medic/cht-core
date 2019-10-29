const _ = require('underscore');
const auth = require('../auth');
const logger = require('../logger');
const serverUtils = require('../server-utils');
const usersService = require('../services/users');
const authorization = require('../services/authorization');
const purgedDocs = require('../services/purged-docs');

const hasFullPermission = req => {
  return auth
    .check(req, 'can_update_users')
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
  if (!auth.isOffline(roles)) {
    throw { code: 400, reason: 'Provided role is not offline' };
  }

  return {
    roles: roles,
    facility_id: params.facility_id,
    contact_id: params.contact_id
  };
};

const getAllowedDocIds = userCtx => {
  return authorization
    .getAuthorizationContext(userCtx)
    .then(ctx => authorization.getAllowedDocIds(ctx, { includeTombstones: false }))
    .then(allowedDocIds => purgedDocs.getUnPurgedIds(userCtx.roles, allowedDocIds));
};

module.exports = {
  get: (req, res) => {
    auth
      .check(req, 'can_view_users')
      .then(() => usersService.getList())
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  },
  create: (req, res) => {
    auth
      .check(req, 'can_create_users')
      .then(() => usersService.createUser(req.body))
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  },
  update: (req, res) => {
    if (_.isEmpty(req.body)) {
      return serverUtils.emptyJSONBodyError(req, res);
    }

    const username = req.params.username;
    const credentials = auth.basicAuthCredentials(req);

    Promise.all([
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
            .updateUser(username, req.body, !!fullPermission)
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
      .check(req, 'can_delete_users')
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
    return getAllowedDocIds(userCtx)
      .then(docIds => res.json({
        total_docs: docIds.length,
        warn: docIds.length >= usersService.DOC_IDS_WARN_LIMIT,
        limit: usersService.DOC_IDS_WARN_LIMIT
      }))
      .catch(err => serverUtils.error(err, req, res));
  },
};
