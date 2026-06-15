const auth = require('../auth');
const { Contact, Qualifier } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const { pageHandler } = require('./libs/pagination');

const getContact = ctx.bind(Contact.v1.get);
const getContactWithLineage = ctx.bind(Contact.v1.getWithLineage);
const getContactIds = ctx.bind(Contact.v1.getUuidsPage);
const getContactDocs = ctx.bind(Contact.v1.getPage);

const PERMISSIONS = { isOnline: true, hasAll: ['can_view_contacts'] };

const buildContactQualifier = ({ freetext, type }) => {
  if (!freetext && !type) {
    throw { status: 400, message: 'Either query param freetext or type is required' };
  }
  const qualifier = {};
  if (freetext) {
    Object.assign(qualifier, Qualifier.byFreetext(freetext));
  }
  if (type) {
    Object.assign(qualifier, Qualifier.byContactType(type));
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
     *       At least one of `type` or `freetext` must be provided.
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
     *           The contact_type id for the type of contacts to fetch. Required if `freetext` is not provided
     *           and may be combined with `freetext`.
     *       - in: query
     *         name: freetext
     *         schema:
     *           type: string
     *           minLength: 3
     *         description: >
     *           A search term for filtering contacts. Must be at least 3 characters and not contain whitespace.
     *           Required if `type` is not provided and may be combined with `type`.
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
    getUuids: pageHandler({
      permissions: PERMISSIONS,
      getQualifier: buildContactQualifier,
      getPage: getContactIds,
    }),

    /**
     * @openapi
     * /api/v1/contact:
     *   get:
     *     summary: Get contacts
     *     operationId: v1ContactGet
     *     description: >
     *       Returns a paginated array of contact records (persons and places) matching the given filter criteria.
     *       At least one of `type` or `freetext` must be provided. Use the `cursor` returned in each response to
     *       retrieve subsequent pages. See also [Get contact UUIDs](#/Contact/v1ContactUuidGet) for retrieving only
     *       the matching identifiers.
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
     *           The contact_type id for the type of contacts to fetch. Required if `freetext` is not provided
     *           and may be combined with `freetext`.
     *       - in: query
     *         name: freetext
     *         schema:
     *           type: string
     *           minLength: 3
     *         description: >
     *           A search term for filtering contacts. Must be at least 3 characters and not contain whitespace.
     *           Required if `type` is not provided and may be combined with `type`.
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
    getAll: pageHandler({
      permissions: PERMISSIONS,
      getQualifier: buildContactQualifier,
      getPage: getContactDocs,
    }),
  },
};
