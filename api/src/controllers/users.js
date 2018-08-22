const _ = require('underscore'),
      auth = require('../auth'),
      serverUtils = require('../server-utils'),
      usersService = require('../services/users');

const hasFullPermission = req => {
  return auth.check(req, 'can_update_users')
    .then(() => true)
    .catch(err => {
      if (err.code === 403) {
        return false;
      }
      throw err;
    });
};

const isUpdatingSelf = (req, credentials, username) => {
  return auth.getUserCtx(req)
    .then(userCtx => {
      return userCtx.name === username &&
             (!credentials || credentials.username === username);
    });
};

const basicAuthValid = (credentials, username) => {
  if (!credentials) {
    return;
  }
  return new Promise(resolve => {
    auth.validateBasicAuth(credentials, err => {
      if (err) {
        console.error(`Invalid authorization attempt on /api/v1/users/${username}`);
        console.error(err);
        resolve(false); // Incorrect basic auth
      } else {
        resolve(true); // Correct basic auth
      }
    });
  });
};

const isChangingPassword = req => Object.keys(req.body).includes('password');

module.exports = {
  get: (req, res) => {
    auth.check(req, 'can_view_users')
      .then(() => usersService.getList())
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  },
  create: (req, res) => {
    auth.check(req, 'can_create_users')
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
      isChangingPassword(req)
    ])
      .then(([fullPermission, updatingSelf, basic, changingPassword]) => {

        if (basic === false) {
          // If you're passing basic auth we're going to validate it, even if we
          // technicaly don't need to (because you already have a valid cookie and
          // full permission).
          // This is to maintain consistency in the personal change password UI:
          // we want to validate the password you pass regardless of your permissions
          return Promise.reject({
            message: 'Bad username / password',
            code: 401
          });
        }

        if (fullPermission) {
          return usersService.updateUser(username, req.body, true);
        }

        if (!updatingSelf) {
          return Promise.reject({
            message: 'You do not have permissions to modify this person',
            code: 403
          });
        } else if(_.isNull(data.place)) {
          if(settings.roles && isOffline(settings.roles)) {
            return callback(error400('Place field is required for offline users'));
          }
          user.facility_id = null;
          settings.facility_id = null;
        }

        if (basic === null && changingPassword) {
          return Promise.reject({
            message: 'You must authenticate with Basic Auth to modify your password',
            code: 403
          });
        } else if (_.isNull(data.contact)) {
          if(settings.roles && isOffline(settings.roles)) {
            return callback(error400('Contact field is required for offline users'));
          }
          settings.contact_id = null;
        }

        return usersService.updateUser(username, req.body, false);
      })
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  },
  delete: (req, res) => {
    auth.check(req, 'can_delete_users')
      .then(() => usersService.deleteUser(req.params.username))
      .then(result => res.json(result))
      .catch(err => serverUtils.error(err, req, res));
  }
};
