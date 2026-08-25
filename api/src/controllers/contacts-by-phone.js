const db = require('../db');
const config = require('../config');
const ctx = require('../services/data-context');
const { Contact, Qualifier } = require('@medic/cht-datasource');
const lineage = require('@medic/lineage')(Promise, db.medic);
const phoneNumber = require('@medic/phone-number');
const serverUtils = require('../server-utils');

const getContactUuids = ctx.bind(Contact.v1.getUuids);

const invalidParameterError = (res) => {
  res.status(400);
  return res.json({ error: 'bad_request', reason: '`phone` parameter is required and must be a valid phone number' });
};

const getPhoneNumber = (req) => {
  return (req.query && req.query.phone) || (req.body && req.body.phone);
};

module.exports = {
  /**
   * @openapi
   * /api/v1/contacts-by-phone:
   *   get:
   *     summary: Find contacts by phone number
   *     operationId: v1ContactsByPhoneGet
   *     description: >
   *       Accepts a phone number and returns fully hydrated contacts that match. If multiple
   *       contacts are found, all are returned. Returns 404 when no matches are found.
   *     tags: [Contact]
   *     x-since: 3.10.0
   *     parameters:
   *       - in: query
   *         name: phone
   *         required: true
   *         schema:
   *           type: string
   *         description: A URL-encoded string representing a phone number.
   *     responses:
   *       '200':
   *         description: Matching contacts found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 ok:
   *                   type: boolean
   *                 docs:
   *                   type: array
   *                   description: Fully hydrated matching contacts.
   *                   items:
   *                     type: object
   *                     additionalProperties: true
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   *       '404':
   *         $ref: '#/components/responses/NotFound'
   *   post:
   *     summary: Find contacts by phone number (POST)
   *     operationId: v1ContactsByPhonePost
   *     description: >
   *       Accepts a phone number and returns fully hydrated contacts that match. If multiple
   *       contacts are found, all are returned. Returns 404 when no matches are found.
   *     tags: [Contact]
   *     x-since: 3.10.0
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [phone]
   *             properties:
   *               phone:
   *                 type: string
   *                 description: A string representing a phone number.
   *     responses:
   *       '200':
   *         description: Matching contacts found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 ok:
   *                   type: boolean
   *                 docs:
   *                   type: array
   *                   description: Fully hydrated matching contacts.
   *                   items:
   *                     type: object
   *                     additionalProperties: true
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   *       '404':
   *         $ref: '#/components/responses/NotFound'
   */
  request: async (req, res) => {
    const phone = getPhoneNumber(req);
    if (!phone) {
      return invalidParameterError(res);
    }

    const normalizedPhone = phoneNumber.normalize(config.get(), phone);
    if (!normalizedPhone) {
      return invalidParameterError(res);
    }

    try {
      // Page through every match: any number of contacts can share a phone number.
      const contactIds = [];
      for await (const contactId of getContactUuids(Qualifier.byPhones([normalizedPhone]))) {
        contactIds.push(contactId);
      }

      if (!contactIds.length) {
        res.status(404);
        return res.json({ error: 'not_found', reason: 'no matches found' });
      }

      const hydratedDocs = await lineage.fetchHydratedDocs(contactIds);
      return res.json({ ok: true, docs: hydratedDocs });
    } catch (err) {
      return serverUtils.serverError(err, req, res);
    }
  },
};
