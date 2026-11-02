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

// Accepts `?phone=a,b` and `?phone=a&phone=b`, like `ids` above.
const buildListQualifier = (value, name, buildQualifier) => {
  // `qs.parse` turns `?phone[a]=b` into an object, which has nothing to split.
  if (!Array.isArray(value) && typeof value !== 'string') {
    throw new InvalidArgumentError(`Invalid ${name} [${JSON.stringify(value)}].`);
  }
  const values = (Array.isArray(value) ? value : value.split(',')).filter(Boolean);
  if (!values.length) {
    throw new InvalidArgumentError(`Invalid ${name} [${JSON.stringify(values)}].`);
  }
  return buildQualifier(values);
};

// Returns the qualifier for the first of `phone`, `shortcode` and `external_ref` that is present, if any.
const buildContactKeysQualifier = (query) => {
  if (query.phone) {
    return buildListQualifier(query.phone, 'phones', Qualifier.byPhones);
  }
  if (query.shortcode) {
    return buildListQualifier(query.shortcode, 'shortcodes', Qualifier.byShortcodes);
  }
  if (query.external_ref) {
    return buildListQualifier(query.external_ref, 'external refs', Qualifier.byExternalRefs);
  }
};

const buildUuidsQualifier = (query) => {
  const contactKeysQualifier = buildContactKeysQualifier(query);
  if (contactKeysQualifier) {
    return contactKeysQualifier;
  }
  const qualifier = {};
  if (query.freetext) {
    Object.assign(qualifier, Qualifier.byFreetext(query.freetext));
  }
  if (query.type) {
    Object.assign(qualifier, Qualifier.byContactType(query.type));
  }
  return qualifier;
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
     *       At least one of `type`, `freetext`, `phone`, `shortcode`, or `external_ref` must be provided. When more
     *       than one is provided the precedence is `phone`, then `shortcode`, then `external_ref`, then `type`
     *       and/or `freetext`. Only the param with the highest precedence is used.
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
     *           The contact_type id for the type of contacts to fetch. Required if none of `freetext`, `phone`,
     *           `shortcode` or `external_ref` is provided and may be combined with `freetext`.
     *       - in: query
     *         name: freetext
     *         schema:
     *           type: string
     *           minLength: 3
     *         description: >
     *           A search term for filtering contacts. Must be at least 3 characters and not contain whitespace.
     *           Required if none of `type`, `phone`, `shortcode` or `external_ref` is provided and may be combined
     *           with `type`.
     *       - in: query
     *         name: phone
     *         x-since: 5.3.0
     *         schema:
     *           type: string
     *         description: >
     *           A comma-separated list of phone numbers, each matched verbatim against the contact's `phone`
     *           field. Takes precedence over `shortcode`, `external_ref`, `type` and `freetext`.
     *       - in: query
     *         name: shortcode
     *         x-since: 5.3.0
     *         schema:
     *           type: string
     *         description: >
     *           A comma-separated list of shortcodes, each matched verbatim against the contact's `patient_id`
     *           and `place_id` fields. Takes precedence over `external_ref`, `type` and `freetext`. Ignored if
     *           `phone` is provided.
     *       - in: query
     *         name: external_ref
     *         x-since: 5.3.0
     *         schema:
     *           type: string
     *         description: >
     *           A comma-separated list of external references, each matched case-insensitively against the
     *           contact's `rc_code` field. Takes precedence over `type` and `freetext`. Ignored if `phone` or
     *           `shortcode` is provided.
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
      const { freetext, type, phone, shortcode, external_ref } = req.query;
      if (!freetext && !type && !phone && !shortcode && !external_ref) {
        return serverUtils.error(
          {
            status: 400,
            message: 'Either query param freetext, type, phone, shortcode or external_ref is required'
          },
          req,
          res
        );
      }
      const qualifier = buildUuidsQualifier(req.query);
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
     *       At least one of `ids`, `type`, `phone`, `shortcode`, or `external_ref` must be provided. When more than
     *       one is provided the precedence is `ids`, then `phone`, then `shortcode`, then `external_ref`, then
     *       `type`. Only the param with the highest precedence is used. Use the `cursor` returned in each response
     *       to retrieve subsequent pages.
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
     *           A comma-separated list of contact ids to fetch. Takes precedence over `phone`, `shortcode`,
     *           `external_ref` and `type`.
     *       - in: query
     *         name: type
     *         schema:
     *           type: string
     *         description: >
     *           The contact_type id for the type of contacts to fetch. Required if none of `ids`, `phone`,
     *           `shortcode` or `external_ref` is provided. Ignored if any of them is provided.
     *       - in: query
     *         name: phone
     *         schema:
     *           type: string
     *         description: >
     *           A comma-separated list of phone numbers, each matched verbatim against the contact's `phone`
     *           field. Takes precedence over `shortcode`, `external_ref` and `type`. Ignored if `ids` is provided.
     *       - in: query
     *         name: shortcode
     *         schema:
     *           type: string
     *         description: >
     *           A comma-separated list of shortcodes, each matched verbatim against the contact's `patient_id`
     *           and `place_id` fields. Takes precedence over `external_ref` and `type`. Ignored if `ids` or `phone`
     *           is provided.
     *       - in: query
     *         name: external_ref
     *         schema:
     *           type: string
     *         description: >
     *           A comma-separated list of external references, each matched case-insensitively against the
     *           contact's `rc_code` field. Takes precedence over `type`. Ignored if `ids`, `phone` or `shortcode`
     *           is provided.
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
      const { ids, type, phone, shortcode, external_ref } = req.query;
      if (!ids && !type && !phone && !shortcode && !external_ref) {
        return serverUtils.error(
          { status: 400, message: 'Either query param ids, type, phone, shortcode or external_ref is required' },
          req,
          res
        );
      }
      const qualifier = ids
        ? buildIdsQualifier(ids)
        : buildContactKeysQualifier(req.query) || Qualifier.byContactType(type);
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
