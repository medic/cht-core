const auth = require('../auth');
const config = require('../config');
const serverUtils = require('../server-utils');
const records = require('../services/records');
const messaging = require('../services/messaging');

const runTransitions = doc => {
  return config.getTransitionsLib()
    .processDocs([doc])
    .then(results => results[0]);
};

const generate = (req, options) => {
  if (req.is('urlencoded')) {
    return records.createByForm(req.body, options);
  }
  if (req.is('json')) {
    return records.createRecordByJSON(req.body);
  }
  throw new Error('Content type not supported.');
};

const process = (req, res, options) => {
  return auth
    .check(req, 'can_create_records')
    .then(() => generate(req, options))
    .then(doc => runTransitions(doc))
    .then(result => {
      messaging.send(result.id);
      return res.json({ success: true, id: result.id });
    })
    .catch(err => serverUtils.error(err, req, res));
};

/**
 * @openapi
 * components:
 *   schemas:
 *     RecordSuccess:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         id:
 *           type: string
 *           description: The id of the created record.
 *       required: [success, id]
 *   requestBodies:
 *     RecordInput:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Message string in a supported format (e.g. Muvuku or Textforms).
 *               from:
 *                 type: string
 *                 description: Reporting phone number.
 *               sent_timestamp:
 *                 type: number
 *                 description: >
 *                   Timestamp in ms since Unix Epoch of when the message was received on the gateway.
 *                   Defaults to now.
 *             required: [message, from]
 *         application/json:
 *           schema:
 *             type: object
 *             description: >
 *               Form field values as properties. Special values reside in `_meta`. Only strings and
 *               numbers are supported as field values. All property names will be lowercased.
 *             properties:
 *               _meta:
 *                 type: object
 *                 properties:
 *                   form:
 *                     type: string
 *                     description: The form code.
 *                   from:
 *                     type: string
 *                     description: Reporting phone number. Optional.
 *                   reported_date:
 *                     type: number
 *                     description: >
 *                       Timestamp in ms since Unix Epoch of when the message was received on the
 *                       gateway. Defaults to now.
 *                   locale:
 *                     type: string
 *                     description: "Optional locale string (e.g. 'fr')."
 *                 required: [form]
 *             additionalProperties: true
 */
module.exports = {

  /**
   * @openapi
   * /api/v1/records:
   *   post:
   *     summary: Create a record
   *     operationId: v1RecordsPost
   *     deprecated: true
   *     description: >
   *       Use [POST /api/v2/records](#/SMS/v2RecordsPost) instead.
   *       Creates a new record based on a configured form. Accepts form-encoded or JSON data.
   *     tags: [SMS]
   *     x-permissions:
   *       hasAll: [can_create_records]
   *     parameters:
   *       - in: query
   *         name: locale
   *         schema:
   *           type: string
   *         description: Optional locale string (e.g. `fr`).
   *     requestBody:
   *       $ref: '#/components/requestBodies/RecordInput'
   *     responses:
   *       '200':
   *         description: Record created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/RecordSuccess'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  v1: (req, res) => {
    return process(req, res, { locale: req.query && req.query.locale });
  },

  /**
   * @openapi
   * /api/v2/records:
   *   post:
   *     summary: Create a record
   *     operationId: v2RecordsPost
   *     description: >
   *       Creates a new record based on a configured [JSON form](/building/reference/app-settings/forms/).
   *       Accepts either form-encoded or JSON data.
   *     tags: [SMS]
   *     x-permissions:
   *       hasAll: [can_create_records]
   *     requestBody:
   *       $ref: '#/components/requestBodies/RecordInput'
   *     responses:
   *       '200':
   *         description: Record created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/RecordSuccess'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  // dropped support for locale because it makes no sense
  v2: (req, res) => {
    return process(req, res);
  }

};
