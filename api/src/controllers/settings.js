const auth = require('../auth');
const serverUtils = require('../server-utils');
const settingsService = require('../services/settings');
const objectPath = require('object-path');

const doGet = req => auth.getUserCtx(req).then(() => settingsService.get());

/**
 * @openapi
 * tags:
 *   - name: Config
 *     description: Operations for app configuration
 */
module.exports = {
  /**
   * @openapi
   * /api/v1/settings:
   *   get:
   *     summary: Get app settings
   *     operationId: v1SettingsGet
   *     description: Returns the app settings in JSON format.
   *     tags: [Config]
   *     responses:
   *       '200':
   *         description: The app settings
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               additionalProperties: true
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   */
  get: (req, res) => {
    return doGet(req, res)
      .then(settings => res.json(settings))
      .catch(err => {
        serverUtils.error(err, req, res, true);
      });
  },

  /**
   * @openapi
   * /api/v1/settings/deprecated-transitions:
   *   get:
   *     summary: Get deprecated transitions
   *     operationId: v1SettingsDeprecatedTransitionsGet
   *     description: Returns a list of deprecated transitions configured in the app settings.
   *     tags: [Config]
   *     responses:
   *       '200':
   *         description: Deprecated transitions
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               additionalProperties: true
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   */
  getDeprecatedTransitions: (req, res) => {
    return auth
      .getUserCtx(req)
      .then(() => settingsService.getDeprecatedTransitions())
      .then(transitions => res.json(transitions))
      .catch(err => {
        serverUtils.error(err, req, res, true);
      });
  },
  // deprecated - used by medic-conf, medic-reporter, etc
  getV0: (req, res) => {
    return doGet(req, res)
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

  /**
   * @openapi
   * /api/v1/settings:
   *   put:
   *     summary: Update app settings
   *     operationId: v1SettingsPut
   *     description: >
   *       Update the app settings. By default, the provided properties are merged with existing
   *       settings. Use query parameters to control replacement behavior.
   *     tags: [Config]
   *     x-permissions:
   *       hasAll: [can_edit, can_configure]
   *     parameters:
   *       - in: query
   *         name: replace
   *         schema:
   *           enum: ['true', 'false']
   *           default: 'false'
   *         description: Whether to replace existing settings for the given properties or to merge.
   *       - in: query
   *         name: overwrite
   *         schema:
   *           enum: ['true', 'false']
   *           default: 'false'
   *         description: >
   *           Whether to replace the entire settings document with the input document.
   *           If both `replace` and `overwrite` are set, `overwrite` takes precedence.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             additionalProperties: true
   *             description: The settings properties to update.
   *     responses:
   *       '200':
   *         description: Settings update result
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   const: true
   *                 updated:
   *                   type: boolean
   *                   description: Whether the settings document was updated.
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  put: (req, res) => {
    return auth
      .check(req, ['can_edit', 'can_configure'])
      .then(() => {
        const replace = req.query && req.query.replace;
        const overwrite = req.query && req.query.overwrite;
        return settingsService.update(req.body, replace, overwrite);
      })
      .then(result => {
        res.json({ success: true, updated: !!result });
      })
      .catch(err => {
        serverUtils.error(err, req, res, true);
      });
  }
};
