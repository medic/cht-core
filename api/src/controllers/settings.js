const auth = require('../auth'),
      serverUtils = require('../server-utils'),
      settingsService = require('../services/settings'),
      objectPath = require('object-path'),
      Ajv = require('ajv'),
      util = require('util'),
      logger = require('../logger'),
      crypto = require('crypto');

const SCHEMA_FILE_PREFIX = 'schema-';
const SCHEMA_FILE_EXT = '.bak';

const ajv = new Ajv();
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
    let schema, build;
    Promise.all([
      settingsService.getSchema(),
      settingsService.getBuild(),
      auth.getUserCtx(req)
    ]).then( values => {
      schema = values[0];
      build = values[1];
      let userCtx = values[2];

      if (!auth.hasAllPermissions(userCtx, 'can_configure')) {
        throw {
          code: 403,
          message: 'Insufficient permissions'
        };
      }

      const valid = ajv.validate(JSON.parse(schema), req.body);
      if (!valid){
        throw {
          code: 400,
          message: 'app_settings.json does not conform to schema'
        };
      }

    })
    .then( () => {
      const replace = req.query && req.query.replace;
      return settingsService.update(req.body, replace);
    })
    .then(() => {
      let data = {};
      const hash = crypto.createHash('sha256');
      let instance = req.headers.host.concat(build.build_info.base_version);
      hash.update(instance);
      let digest = hash.digest('hex');

      if (SCHEMA_FILE_PREFIX.concat(digest, SCHEMA_FILE_EXT) !== req.query.schema){
        data['digest'] = digest;
        data['schema'] = schema;
      }

      res.json({ success: true, data: data });
    })
    .catch(err => {
      serverUtils.error(err, req, res, true);
    });

  }
};
