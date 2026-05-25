const auth = require('../auth');
const { Contact, Qualifier } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');

const getContact = ctx.bind(Contact.v1.get);
const getContactWithLineage = ctx.bind(Contact.v1.getWithLineage);
const getContactIds = ctx.bind(Contact.v1.getUuidsPage);

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
     *       At least one qualifier param (`type`, `freetext`, or `phone`) must be provided. Qualifier
     *       params are mutually exclusive — the only combination allowed is `type` + `freetext`
     *       (backed by a dedicated view). Any other combination returns 400.
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
     *           The contact_type id for the type of contacts to fetch. May be combined with `freetext`.
     *       - in: query
     *         name: freetext
     *         schema:
     *           type: string
     *           minLength: 3
     *         description: >
     *           A search term for filtering contacts. Must be at least 3 characters and not contain whitespace.
     *           May be combined with `type`.
     *       - in: query
     *         name: phone
     *         schema:
     *           type: string
     *         description: >
     *           A phone number to match exactly against the contact's `phone` field. Passed as-is — no
     *           normalization is performed. Mutually exclusive with `type` / `freetext`.
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

      // Qualifier params are mutually exclusive by default. `type` and `freetext` are the only
      // pair that may be combined (backed by the contacts_by_type_freetext view). When a new
      // qualifier is added, extend QUALIFIER_PARAMS — exclusivity is automatic.
      const QUALIFIER_PARAMS = ['type', 'freetext', 'phone'];
      const COMBINABLE = ['type', 'freetext'];
      const present = QUALIFIER_PARAMS.filter(name => req.query[name]);

      if (!present.length) {
        return serverUtils.error(
          { status: 400, message: `At least one of query params ${QUALIFIER_PARAMS.join(', ')} is required` },
          req,
          res
        );
      }
      if (present.length > 1 && !present.every(name => COMBINABLE.includes(name))) {
        return serverUtils.error(
          {
            status: 400,
            message: `Query params ${present.join(', ')} are mutually exclusive `
              + `(only ${COMBINABLE.join(' and ')} may be combined)`,
          },
          req,
          res
        );
      }

      const qualifier = {};
      if (req.query.phone) {
        Object.assign(qualifier, Qualifier.byPhone(req.query.phone));
      }
      if (req.query.freetext) {
        Object.assign(qualifier, Qualifier.byFreetext(req.query.freetext));
      }
      if (req.query.type) {
        Object.assign(qualifier, Qualifier.byContactType(req.query.type));
      }
      const docs = await getContactIds(qualifier, req.query.cursor, req.query.limit);
      return res.json(docs);
    }),

    /**
     * @openapi
     * /api/v1/contact/uuid:
     *   post:
     *     summary: Get contact UUIDs (bulk variant)
     *     operationId: v1ContactUuidPost
     *     description: >
     *       Bulk variant of the GET endpoint. Accepts array-valued qualifiers in a JSON body — used
     *       when the array would not fit safely in a query string. The only multi-value qualifier
     *       currently accepted is `phones`. Returns the same paginated `{ data, cursor }` shape as
     *       the GET endpoint.
     *     tags: [Contact]
     *     x-since: 4.21.0
     *     x-permissions:
     *       hasAll: [can_view_contacts]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               phones:
     *                 type: array
     *                 items:
     *                   type: string
     *                 description: >
     *                   Phone numbers to match exactly against the contact's `phone` field. Passed
     *                   as-is — no normalization. One CouchDB round trip regardless of array size.
     *               cursor:
     *                 type: string
     *                 nullable: true
     *               limit:
     *                 type: integer
     *             required: [phones]
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
    postUuids: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAll: ['can_view_contacts'] });

      // POST body mirrors the GET query-param shape, with array values where the qualifier accepts
      // many. Mutual-exclusivity rules match the GET path: list the multi-value params here and
      // mirror COMBINABLE.
      const QUALIFIER_PARAMS = ['phones'];
      const COMBINABLE = [];
      const present = QUALIFIER_PARAMS.filter(name => req.body && req.body[name] !== undefined);

      if (!present.length) {
        return serverUtils.error(
          { status: 400, message: `At least one of body params ${QUALIFIER_PARAMS.join(', ')} is required` },
          req,
          res
        );
      }
      if (present.length > 1 && !present.every(name => COMBINABLE.includes(name))) {
        return serverUtils.error(
          {
            status: 400,
            message: `Body params ${present.join(', ')} are mutually exclusive`,
          },
          req,
          res
        );
      }

      const qualifier = {};
      if (req.body.phones) {
        Object.assign(qualifier, Qualifier.byPhones(req.body.phones));
      }
      const docs = await getContactIds(qualifier, req.body.cursor, req.body.limit);
      return res.json(docs);
    }),
  },
};
