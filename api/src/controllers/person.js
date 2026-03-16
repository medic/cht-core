const { Person, Qualifier } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const auth = require('../auth');

const getPerson = ctx.bind(Person.v1.get);
const getPersonWithLineage = ctx.bind(Person.v1.getWithLineage);
const getPage = ctx.bind(Person.v1.getPage);
const createPerson = ctx.bind(Person.v1.create);
const updatePerson = ctx.bind(Person.v1.update);

/**
 * @openapi
 * tags:
 *   - name: Person
 *     description: Operations for person contacts
 */
module.exports = {
  v1: {
    /**
     * @openapi
     * /api/v1/person/{id}:
     *   get:
     *     summary: Get a person by id
     *     operationId: v1PersonIdGet
     *     description: Returns a person contact record. Optionally includes the full parent place lineage.
     *     tags:
     *       - Person
     *     x-since: 4.9.0
     *     x-permissions:
     *       hasAll: [can_view_contacts]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: The id of the person to retrieve
     *       - in: query
     *         name: with_lineage
     *         schema:
     *           type: string
     *           enum: ['true']
     *         description: When set to 'true', includes the full parent place lineage
     *     responses:
     *       '200':
     *         description: The person record
     *         content:
     *           application/json:
     *             schema:
     *               oneOf:
     *                 - $ref: '#/components/schemas/v1.Person'
     *                 - $ref: '#/components/schemas/v1.PersonWithLineage'
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
      const getPersonRecord = with_lineage === 'true' ? getPersonWithLineage : getPerson;
      const person = await getPersonRecord(Qualifier.byUuid(uuid));
      if (!person) {
        return serverUtils.error({ status: 404, message: 'Person not found' }, req, res);
      }

      return res.json(person);
    }),
    getAll: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAll: ['can_view_contacts'] });
      const personType = Qualifier.byContactType(req.query.type);
      const docs = await getPage(personType, req.query.cursor, req.query.limit);
      return res.json(docs);
    }),

    /**
     * @openapi
     * /api/v1/person:
     *   post:
     *     summary: Create a new person
     *     operationId: v1PersonPost
     *     description: Creates a new person record.
     *     tags:
     *       - Person
     *     x-since: 5.2.0
     *     x-permissions:
     *       hasAny: [can_create_people, can_edit]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/v1.PersonInput'
     *     responses:
     *       '200':
     *         description: The created person record
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/v1.Person'
     *       '400':
     *         $ref: '#/components/responses/BadRequest'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     */
    create: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAny: ['can_create_people', 'can_edit'] });
      const personDoc = await createPerson(req.body);
      return res.json(personDoc);
    }),

    /**
     * @openapi
     * /api/v1/person/{id}:
     *   put:
     *     summary: Update a person
     *     operationId: v1PersonIdPut
     *     description: Updates an existing person contact record.
     *     tags:
     *       - Person
     *     x-since: 5.2.0
     *     x-permissions:
     *       hasAny: [can_update_people, can_edit]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: The id of the person to update
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/v1.UpdatePersonInput'
     *     responses:
     *       '200':
     *         description: The updated person record
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/v1.Person'
     *       '400':
     *         $ref: '#/components/responses/BadRequest'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     *       '404':
     *         $ref: '#/components/responses/NotFound'
     */
    update: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAny: ['can_update_people', 'can_edit'] });
      const { params: { uuid }, body } = req;
      const updatePersonInput = {
        ...body,
        _id: uuid,
      };
      const updatedPersonDoc = await updatePerson(updatePersonInput);
      return res.json(updatedPersonDoc);
    }),
  },
};
