const auth = require('../auth'),
      serverUtils = require('../server-utils'),
      settingsService = require('../services/settings'),
      objectPath = require('object-path'),
      Ajv = require('ajv'),
      _ = require('underscore');

const ajv = new Ajv({ allErrors: true });
const doGet = req => auth.getUserCtx(req).then(() => settingsService.get());

module.exports = {
  get: (req, res) => {
    doGet(req, res)
      .then(settings => res.json(settings))
      .catch(err => {
        serverUtils.error(err, req, res, true);
      });
  },
  // deprecated - used by medic-configurer, medic-reporter, etc
  getV0: (req, res) => {
    doGet(req, res)
      .then(settings => {
        if (req.params.path) {
          settings = objectPath.get(settings, req.params.path) || {};
        }
        res.json({
          settings: settings,
          meta: {},
          schema: {}
        });
      })
      .catch(err => {
        serverUtils.error(err, req, res, true);
      });
  },
  put: (req, res) => {
    auth.getUserCtx(req)
      .then( userCtx => {
        if (!auth.hasAllPermissions(userCtx, 'can_configure')) {
          throw {
            code: 403,
            message: 'Insufficient permissions'
          };
        }
      })
      .then(() => settingsService.getSchema())
      .then(schema => {
        if ('roles' in req.body){
          schema.references.roles.items.enum = _.union(Object.keys(req.body.roles), schema.references.roles.items.enum);
        }
        const valid = ajv.validate(schema, req.body);
        if (!valid){
          throw {
            code: 400,
            message: JSON.stringify(ajv.errors)
          };
        }
      })
      .then(() => {
        const replace = req.query && req.query.replace;
        const overwrite = req.query && req.query.overwrite;
        return settingsService.update(req.body, replace, overwrite);
      })
      .then(() => {
        res.json({ success: true });
      })
      .catch( err => {
        serverUtils.error(err, req, res, true);
      });
  }
};
