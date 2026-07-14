const auth = require('../auth');
const { Contact, Qualifier, InvalidArgumentError } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');

const getContact = ctx.bind(Contact.v1.get);
const getContactWithLineage = ctx.bind(Contact.v1.getWithLineage);
const getContactIds = ctx.bind(Contact.v1.getUuidsPage);
const getContactDocs = ctx.bind(Contact.v1.getPage);
const getContactSummaries = ctx.bind(Contact.v1.getSummaries);

const buildIdsQualifier = (ids) => {
  const idsArray = (Array.isArray(ids) ? ids : ids.split(',')).filter(Boolean);
  if (!idsArray.length) {
    throw new InvalidArgumentError(`Invalid ids [${JSON.stringify(ids)}].`);
  }
  return Qualifier.byIds(idsArray);
};

/**
 * @openapi
 * tags:
 *   - name: Contact
 *     description: Operations for contacts (persons and places)
 */
module.exports = {
  v1: {
    /**
     * @openapi
     * /api/v1/contact/{id}:
     *   get:
     *     summary: Get a contact by id
     *     operationId: v1ContactIdGet
     *     description: >
     *       Returns a contact record (person or place). Optionally includes the full parent place lineage.
     *     tags: [Contact]
     *     x-since: 4.18.0
     *     x-permissions:
     *       hasAll: [can_view_contacts]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: The id of the contact to retrieve
     *       - $ref: '#/components/parameters/withLineage'
     *     responses:
     *       '200':
     *         description: The contact record
     *         content:
     *           application/json:
     *             schema:
     *               oneOf:
     *                 - $ref: '#/components/schemas/v1.Contact'
     *                 - $ref: '#/components/schemas/v1.ContactWithLineage'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     *       '404':
     *         $ref: '#/components/responses/NotFound'
     */
    get: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAll: ['can_view_contacts'] });
      const { params: { uuid }, query: { with_lineage } } = req;
      const getContactRecord = with_lineage === 'true' ? getContactWithLineage : getContact;
      const contact = await getContactRecord(Qualifier.byUuid(uuid));
      if (!contact) {
        return serverUtils.error({ status: 404, message: 'Contact not found' }, req, res);
      }

      return res.json(contact);
    }),

    /**
     * @openapi
     * /api/v1/contact/uuid:
     *   get:
     *     summary: Get contact UUIDs
     *     operationId: v1ContactUuidGet
     *     description: >
     *       Returns a paginated array of contact identifier strings matching the given filter criteria.
     *       At least one of `type`, `freetext`, or `phone` must be provided. When `phone` is provided it is used
     *       on its own (it cannot be combined with `type` or `freetext`) and takes precedence over them.
     *     tags: [Contact]
     *     x-since: 4.18.0
     *     x-permissions:
     *       hasAll: [can_view_contacts]
     *     parameters:
     *       - in: query
     *         name: type
     *         schema:
     *           type: string
     *         description: >
     *           The contact_type id for the type of contacts to fetch. Required if `freetext` and `phone` are not
     *           provided and may be combined with `freetext`.
     *       - in: query
     *         name: freetext
     *         schema:
     *           type: string
     *           minLength: 3
     *         description: >
     *           A search term for filtering contacts. Must be at least 3 characters and not contain whitespace.
     *           Required if `type` and `phone` are not provided and may be combined with `type`.
     *       - in: query
     *         name: phone
     *         schema:
     *           type: string
     *         description: >
     *           A phone number to fetch matching contacts by. Matched verbatim (no normalisation). Required if
     *           `type` and `freetext` are not provided. Takes precedence over `type` and `freetext`.
     *       - $ref: '#/components/parameters/cursor'
     *       - $ref: '#/components/parameters/limitId'
     *     responses:
     *       '200':
     *         description: A page of contact UUIDs
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 data:
     *                   type: array
     *                   description: The results for this page
     *                   items:
     *                     type: string
     *                 cursor:
     *                   $ref: '#/components/schemas/PageCursor'
     *               required: [data, cursor]
     *       '400':
     *         $ref: '#/components/responses/BadRequest'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     */
    getUuids: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAll: ['can_view_contacts'] });
      if (!req.query.freetext && !req.query.type && !req.query.phone) {
        return serverUtils.error(
          { status: 400, message: 'Either query param freetext, type or phone is required' }, req, res
        );
      }
      let qualifier;
      if (req.query.phone) {
        qualifier = Qualifier.byPhone(req.query.phone);
      } else {
        qualifier = {};
        if (req.query.freetext) {
          Object.assign(qualifier, Qualifier.byFreetext(req.query.freetext));
        }
        if (req.query.type) {
          Object.assign(qualifier, Qualifier.byContactType(req.query.type));
        }
      }
      const docs = await getContactIds(qualifier, req.query.cursor, req.query.limit);
      return res.json(docs);
    }),

    /**
     * @openapi
     * /api/v1/contact:
     *   get:
     *     summary: Get contacts
     *     operationId: v1ContactGet
     *     description: >
     *       Returns a paginated array of contact records (persons and places) matching the given filter criteria.
     *       At least one of `ids`, `type`, or `phone` must be provided. When more than one is provided the
     *       precedence is `ids`, then `phone`, then `type`. Use the `cursor` returned in each response to retrieve
     *       subsequent pages.
     *     tags: [Contact]
     *     x-since: 5.3.0
     *     x-permissions:
     *       hasAll: [can_view_contacts]
     *     parameters:
     *       - in: query
     *         name: ids
     *         schema:
     *           type: string
     *         description: >
     *           A comma-separated list of contact ids to fetch. Required if `type` and `phone` are not provided.
     *           Takes precedence over `phone` and `type` when more than one is provided.
     *       - in: query
     *         name: type
     *         schema:
     *           type: string
     *         description: >
     *           The contact_type id for the type of contacts to fetch. Required if `ids` and `phone` are not
     *           provided.
     *       - in: query
     *         name: phone
     *         schema:
     *           type: string
     *         description: >
     *           A phone number to fetch matching contacts by. Matched verbatim (no normalisation). Required if
     *           `ids` and `type` are not provided. Takes precedence over `type`.
     *       - $ref: '#/components/parameters/cursor'
     *       - $ref: '#/components/parameters/limitEntity'
     *     responses:
     *       '200':
     *         description: A page of contact records
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 data:
     *                   type: array
     *                   description: The results for this page
     *                   items:
     *                     $ref: '#/components/schemas/v1.Contact'
     *                 cursor:
     *                   $ref: '#/components/schemas/PageCursor'
     *               required: [data, cursor]
     *       '400':
     *         $ref: '#/components/responses/BadRequest'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     */
    getAll: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAll: ['can_view_contacts'] });
      if (!req.query.ids && !req.query.type && !req.query.phone) {
        return serverUtils.error(
          { status: 400, message: 'Either query param ids, type or phone is required' }, req, res
        );
      }
      let qualifier;
      if (req.query.ids) {
        qualifier = buildIdsQualifier(req.query.ids);
      } else if (req.query.phone) {
        qualifier = Qualifier.byPhone(req.query.phone);
      } else {
        qualifier = Qualifier.byContactType(req.query.type);
      }
      const docs = await getContactDocs(qualifier, req.query.cursor, req.query.limit);
      return res.json(docs);
    }),

    /**
     * @openapi
     * /api/v1/contact/summary:
     *   post:
     *     summary: Get contact summaries by id
     *     operationId: v1ContactSummaryPost
     *     description: >
     *       Returns compact summary records for the contacts identified by the provided ids. Ids that do not
     *       identify an existing contact are silently omitted from the result.
     *     tags: [Contact]
     *     x-since: 5.3.0
     *     x-permissions:
     *       hasAll: [can_view_contacts]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               ids:
     *                 type: array
     *                 items:
     *                   type: string
     *             required: [ids]
     *     responses:
     *       '200':
     *         description: An array of contact summaries
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/v1.ContactSummary'
     *       '400':
     *         $ref: '#/components/responses/BadRequest'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     */
    getSummaries: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAll: ['can_view_contacts'] });
      const summaries = [];
      for await (const summary of getContactSummaries(Qualifier.byIds(req.body?.ids))) {
        summaries.push(summary);
      }
      return res.json(summaries);
    }),
  },
};
