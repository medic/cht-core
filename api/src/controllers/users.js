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
  } catch {
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

/**
 * @openapi
 * tags:
 *   - name: User
 *     description: Operations for user management
 * components:
 *   schemas:
 *     UserInput:
 *       type: object
 *       required: [username, roles]
 *       properties:
 *         username:
 *           type: string
 *           description: Identifier used for authentication.
 *         roles:
 *           type: array
 *           items:
 *             type: string
 *         place:
 *           description: >
 *             Place identifier or object representing the place the user resides in. Required if roles contain an
 *             offline role.
 *           oneOf:
 *             - type: string
 *             - type: object
 *               additionalProperties: true
 *         contact:
 *           description: >
 *             Person identifier or object representing the person contact for the user. Required if roles
 *             contain an offline role.
 *           oneOf:
 *             - type: string
 *             - type: object
 *               additionalProperties: true
 *         password:
 *           type: string
 *           description: >
 *             Password for authentication. Must be at least 8 characters long and difficult to guess. Required if
 *             `token_login` or `oidc_username` is not set.
 *         phone:
 *           type: string
 *           description: Valid phone number. Required if `token_login` is set.
 *         token_login:
 *           type: boolean
 *           description: >
 *             Sets [login by SMS](/building/reference/app-settings/token_login) for this user. Added in `3.10.0`.
 *         fullname:
 *           type: string
 *         email:
 *           type: string
 *         known:
 *           type: boolean
 *           description: Indicates if the user has logged in before.
 *         password_change_required:
 *           type: boolean
 *           description: >
 *             Set `false` to skip [password reset prompt](/building/login/#password-reset-on-first-login) on next
 *             login. Added in `4.17.0`.
 *         oidc_username:
 *           type: string
 *           description: >
 *             Unique username for [authenticating via OIDC](/building/reference/api/#login-by-oidc). This
 *             value must match the `email` claim returned for the user by the OIDC provider. Added in `4.20.0`.
 *     UserCreateResult:
 *       type: object
 *       properties:
 *         contact:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             rev:
 *               type: string
 *         user-settings:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             rev:
 *               type: string
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             rev:
 *               type: string
 *     InvalidUserInputError:
 *       type: object
 *       additionalProperties: true
 *       properties:
 *         error:
 *           oneOf:
 *             - type: string
 *             - type: object
 *               additionalProperties: true
 *       examples:
 *         - error:
 *             message: 'Username "mary" already taken.'
 *             translationKey: username.taken
 *             translationParams:
 *               username: mary
 *         - error: 'Missing required fields: username, password, type or roles'
 *           details:
 *             failingIndexes:
 *               - fields: [username, password, 'type or roles']
 *                 index: 0
 *               - fields: [password, 'type or roles']
 *                 index: 1
 */
module.exports = {
  /**
   * @openapi
   * /api/v1/users:
   *   get:
   *     summary: List users
   *     operationId: v1UsersGet
   *     deprecated: true
   *     description: >
   *       Use [GET /api/v2/users](#/User/v2UsersGet) instead.
   *       Returns a list of users and their profile data.
   *     tags: [User]
   *     x-permissions:
   *       hasAll: [can_view_users]
   *     responses:
   *       '200':
   *         description: A list of users
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 additionalProperties: true
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  list: (req, res) => {
    return getUserList(req)
      .then(list => convertUserListToV1(list))
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  },

  /**
   * @openapi
   * /api/v1/users:
   *   post:
   *     summary: Create users
   *     operationId: v1UsersPost
   *     deprecated: true
   *     description: |
   *       Use [POST /api/v3/users](#/User/v3UsersPost) to create a single user or
   *       [POST /api/v2/users](#/User/v2UsersPost) to create multiple users.
   *       Create new users with a place and a contact. Accepts a single user object or an array of user objects
   *       (since CHT `3.15.0`). Users are created in parallel and the creation is not aborted even if one of the
   *       users fails to be created.
   *
   *       Passing a single user in the request’s body will return a single object whereas passing an array of users
   *       will return an array of objects.
   *     tags: [User]
   *     x-permissions:
   *       hasAll: [can_edit, can_create_users]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             oneOf:
   *               - $ref: '#/components/schemas/UserInput'
   *               - type: array
   *                 items:
   *                   $ref: '#/components/schemas/UserInput'
   *     responses:
   *       '200':
   *         description: User creation results
   *         content:
   *           application/json:
   *             schema:
   *               oneOf:
   *                 - $ref: '#/components/schemas/UserCreateResult'
   *                 - type: array
   *                   items:
   *                     oneOf:
   *                       - $ref: '#/components/schemas/UserCreateResult'
   *                       - $ref: '#/components/schemas/InvalidUserInputError'
   *       '400':
   *         description: Invalid user data
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/InvalidUserInputError'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  create: (req, res) => {
    return auth
      .check(req, ['can_edit', 'can_create_users'])
      .then(() => users.createUsers(req.body))
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  },

  /**
   * @openapi
   * /api/v1/users/{username}:
   *   post:
   *     summary: Update a user
   *     operationId: v1UsersUsernamePost
   *     deprecated: true
   *     description: >
   *       Use [POST /api/v3/users/{username}](#/User/v3UsersUsernamePost) instead.
   *       Update property values on a user account. Users with `can_edit` and `can_update_users`
   *       permissions can update any user. Users can update themselves without these permissions,
   *       but cannot modify `type`, `roles`, `contact`, or `place`. Password changes require
   *       Basic Auth (either the header or in the URL). This is to ensure the password is known at
   *       time of request, and no one is hijacking a cookie.
   *     tags: [User]
   *     x-permissions:
   *       hasAll: [can_edit, can_update_users]
   *     parameters:
   *       - in: path
   *         name: username
   *         required: true
   *         schema:
   *           type: string
   *         description: The username of the user to update.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             additionalProperties: true
   *             description: User properties to update.
   *     responses:
   *       '200':
   *         description: User updated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     rev:
   *                       type: string
   *                 user-settings:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     rev:
   *                       type: string
   *       '400':
   *         description: Invalid user data
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/InvalidUserInputError'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  update: async (req, res) => {
    if (_.isEmpty(req.body)) {
      return serverUtils.emptyJSONBodyError(req, res);
    }

    try {
      const { fullPermission } = await verifyUpdateRequest(req);
      const requesterContext = await auth.getUserCtx(req);

      const username = req.params.username;
      const result = await users.updateUser(username, req.body, !!fullPermission);

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

  /**
   * @openapi
   * /api/v1/users/{username}:
   *   delete:
   *     summary: Delete a user
   *     operationId: v1UsersUsernameDelete
   *     description: Delete a user. Does not affect the person or place associated with the user.
   *     tags: [User]
   *     x-permissions:
   *       hasAll: [can_edit, can_delete_users]
   *     parameters:
   *       - in: path
   *         name: username
   *         required: true
   *         schema:
   *           type: string
   *         description: The username of the user to delete.
   *     responses:
   *       '200':
   *         description: User deleted
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               additionalProperties: true
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  delete: (req, res) => {
    auth
      .check(req, ['can_edit', 'can_delete_users'])
      .then(() => users.deleteUser(req.params.username))
      .then(result => res.json(result))
      .catch(err => serverUtils.error(err, req, res));
  },

  /**
   * @openapi
   * /api/v1/users-info:
   *   get:
   *     summary: Get user replication info
   *     operationId: v1UsersInfoGet
   *     description: |
   *       Returns the total number of documents an offline user would replicate (`total_docs`), the number of
   *       docs excluding tasks the user would replicate (`warn_docs`), and a warning flag (`warn`) if the count
   *       exceeds the recommended limit (`10,000`).
   *
   *       Offline users can get their own doc count. Online users with `can_update_users` permission
   *       can query for any user by providing `role` and `facility_id` query parameters. (When requested as an
   *       online user, the number of tasks are never counted and never returned, so `warn_docs` is always equal to
   *       `total_docs`.)
   *     tags: [User]
   *     parameters:
   *       - in: query
   *         name: facility_id
   *         schema:
   *           type: string
   *         description: Identifier of the user's facility. Required for online users.
   *       - in: query
   *         name: role
   *         schema:
   *           type: string
   *         description: >
   *           User role (must be an offline role). Accepts a string or JSON array. Required for online users.
   *       - in: query
   *         name: contact_id
   *         schema:
   *           type: string
   *         description: Identifier of the user's associated contact. Optional for online users.
   *     responses:
   *       '200':
   *         description: User replication info
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 total_docs:
   *                   type: number
   *                   description: Total number of documents the user would replicate.
   *                 warn_docs:
   *                   type: number
   *                   description: Number of docs excluding tasks the user would replicate.
   *                 warn:
   *                   type: boolean
   *                   description: Whether the doc count exceeds the recommended limit.
   *                 limit:
   *                   type: number
   *                   description: The recommended document limit.
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
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
    /**
     * @openapi
     * /api/v2/users/{username}:
     *   get:
     *     summary: Get a user by username.
     *     operationId: v2UsersUsernameGet
     *     description: >
     *       Returns a user's profile data. Users with `can_view_users` permission can view any
     *       user. Users can also view their own profile.
     *     tags: [User]
     *     x-since: 4.7.0
     *     x-permissions:
     *       hasAll: [can_view_users]
     *     parameters:
     *       - in: path
     *         name: username
     *         required: true
     *         schema:
     *           type: string
     *         description: The username to retrieve.
     *     responses:
     *       '200':
     *         description: The user profile
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               additionalProperties: true
     *             example:
     *               id: org.couchdb.user:demo
     *               rev: 14-8758c8493edcc6dac50366173fc3e24a
     *               type: district-manager
     *               fullname: Example User
     *               username: demo
     *               oidc_username: demo@email.com
     *               place:
     *                 _id: eeb17d6d-5dde-c2c0-62c4a1a0ca17d38b
     *                 type: district_hospital
     *                 name: Sample District
     *                 contact:
     *                   _id: eeb17d6d-5dde-c2c0-62c4a1a0ca17fd17
     *                   type: person
     *                   name: Paul
     *                   phone: '+2868917046'
     *               contact:
     *                 _id: eeb17d6d-5dde-c2c0-62c4a1a0ca17fd17
     *                 type: person
     *                 name: Paul
     *                 phone: '+2868917046'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     *       '404':
     *         $ref: '#/components/responses/NotFound'
     */
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

    /**
     * @openapi
     * /api/v2/users:
     *   get:
     *     summary: List users
     *     operationId: v2UsersGet
     *     description: Returns a list of users and their profile data including roles.
     *     tags: [User]
     *     x-since: 4.1.0
     *     x-permissions:
     *       hasAll: [can_view_users]
     *     parameters:
     *       - in: query
     *         name: facility_id
     *         schema:
     *           type: string
     *         description: Filter by facility identifier. Added in `4.7.0`.
     *       - in: query
     *         name: contact_id
     *         schema:
     *           type: string
     *         description: Filter by associated contact identifier. Added in `4.7.0`.
     *     responses:
     *       '200':
     *         description: A list of users
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 additionalProperties: true
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     */
    list: async (req, res) => {
      try {
        const body = await getUserList(req);
        res.json(body);
      } catch (err) {
        serverUtils.error(err, req, res);
      }
    },

    /**
     * @openapi
     * /api/v2/users:
     *   post:
     *     summary: Create users - bulk import (JSON or CSV)
     *     operationId: v2UsersPost
     *     description: |
     *       Create new users with a place and a contact. Accepts either a JSON array of user objects or a CSV file
     *       where each row represents a user. Columns with an `:excluded` suffix will be ignored. A log entry is
     *       created for each bulk import in the `medic-logs` database.
     *
     *       ### Example
     *
     *       A spreadsheet compatible with the default configuration of the CHT is available.
     *       [Click here](https://docs.google.com/spreadsheets/d/1yUenFP-5deQ0I9c-OYDTpbKYrkl3juv9djXoLLPoQ7Y/copy) to
     *       make a copy of the spreadsheet in Google Sheets. [A guide](/building/training/users-bulk-load) on how to
     *       import users with this spreadsheet from within the Admin Console (without manually calling this endpoint)
     *       is available.
     *
     *       ### Logging
     *
     *       A log entry is created with each bulk import that contains the import status for each user and the import
     *       progress status that gets updated throughout the import and finalized upon completion. These entries are
     *       saved in the [`medic-logs`](/technical-overview/data#medic-logs) database and you can access them by
     *       querying documents with a key that starts with `bulk-user-upload-`.
     *     tags: [User]
     *     x-since: 3.16.0
     *     x-permissions:
     *       hasAll: [can_edit, can_create_users]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             oneOf:
     *               - $ref: '#/components/schemas/UserInput'
     *               - type: array
     *                 items:
     *                   $ref: '#/components/schemas/UserInput'
     *         text/csv:
     *           schema:
     *             type: string
     *             description: >
     *               CSV with headers matching user properties. Columns with `:excluded` suffix
     *               are ignored.
     *     responses:
     *       '200':
     *         description: User creation results
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 oneOf:
     *                   - $ref: '#/components/schemas/UserCreateResult'
     *                   - $ref: '#/components/schemas/InvalidUserInputError'
     *       '400':
     *         $ref: '#/components/responses/BadRequest'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     */
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

    /**
     * @openapi
     * /api/v3/users:
     *   post:
     *     summary: Create a user
     *     operationId: v3UsersPost
     *     description: Creates a user that can be associated with multiple facilities.
     *     tags: [User]
     *     x-permissions:
     *       hasAll: [can_edit, can_create_users]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             allOf:
     *               - $ref: '#/components/schemas/UserInput'
     *               - type: object
     *                 properties:
     *                   place:
     *                     description: >
     *                       Place identifier(s). Required if roles contain an offline role. Can be a single place id
     *                       or an array of place ids for multi-facility users. Setting multiple places requires the
     *                       `can_have_multiple_places` permission.
     *                     oneOf:
     *                       - type: string
     *                       - type: array
     *                         items:
     *                           type: string
     *     responses:
     *       '200':
     *         description: User creation result
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/UserCreateResult'
     *       '400':
     *         description: Invalid user data
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/InvalidUserInputError'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     */
    create: async (req, res) => {
      try {
        await auth.check(req, ['can_edit', 'can_create_users']);

        const response = await users.createMultiFacilityUser(req.body);
        res.json(response);
      } catch (error) {
        serverUtils.error(error, req, res);
      }
    },
    /**
     * @openapi
     * /api/v3/users/{username}:
     *   post:
     *     summary: Update a user
     *     operationId: v3UsersUsernamePost
     *     description: >
     *       Update property values on a user account. Users with `can_edit` and `can_update_users`
     *       permissions can update any user. Users can update themselves without these permissions,
     *       but cannot modify `type`, `roles`, `contact`, or `place`. Password changes require
     *       Basic Auth (either the header or in the URL). This is to ensure the password is known at
     *       time of request, and no one is hijacking a cookie.
     *     tags: [User]
     *     x-permissions:
     *       hasAll: [can_edit, can_update_users]
     *     parameters:
     *       - in: path
     *         name: username
     *         required: true
     *         schema:
     *           type: string
     *         description: The username of the user to update.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             additionalProperties: true
     *             description: User properties to update.
     *     responses:
     *       '200':
     *         description: User updated
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 user:
     *                   type: object
     *                   properties:
     *                     id:
     *                       type: string
     *                     rev:
     *                       type: string
     *                 user-settings:
     *                   type: object
     *                   properties:
     *                     id:
     *                       type: string
     *                     rev:
     *                       type: string
     *       '400':
     *         description: Invalid user data
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/InvalidUserInputError'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     */
    update: (req, res) => {
      return module.exports.update(req, res);
    },
  }
};
