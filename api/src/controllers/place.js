const { Place, Qualifier } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const auth = require('../auth');

const getPlace = ctx.bind(Place.v1.get);
const getPlaceWithLineage = ctx.bind(Place.v1.getWithLineage);
const getPageByType = ctx.bind(Place.v1.getPage);
const create = ctx.bind(Place.v1.create);
const update = ctx.bind(Place.v1.update);

/**
 * @openapi
 * tags:
 *   - name: Place
 *     description: Operations for place contacts
 */
module.exports = {
  v1: {
    /**
     * @openapi
     * /api/v1/place/{id}:
     *   get:
     *     summary: Get a place by id
     *     operationId: v1PlaceIdGet
     *     description: Returns a place contact record. Optionally includes the full parent place lineage.
     *     tags: [Place]
     *     x-since: 4.10.0
     *     x-permissions:
     *       hasAll: [can_view_contacts]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: The id of the place to retrieve
     *       - $ref: '#/components/parameters/withLineage'
     *     responses:
     *       '200':
     *         description: The place record
     *         content:
     *           application/json:
     *             schema:
     *               oneOf:
     *                 - $ref: '#/components/schemas/v1.Place'
     *                 - $ref: '#/components/schemas/v1.PlaceWithLineage'
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
      const getPlaceRecord = with_lineage === 'true' ? getPlaceWithLineage : getPlace;
      const place = await getPlaceRecord(Qualifier.byUuid(uuid));
      if (!place) {
        return serverUtils.error({ status: 404, message: 'Place not found' }, req, res);
      }
      return res.json(place);
    }),

    /**
     * @openapi
     * /api/v1/place:
     *   get:
     *     summary: Get places
     *     operationId: v1PlaceGet
     *     description: >
     *       Returns a paginated array of places for the given contact type. Use the `cursor` returned in each response
     *       to retrieve subsequent pages. See also [Get Place by id](#/Place/v1PlaceIdGet) for retrieving a single
     *       place.
     *     tags: [Place]
     *     x-since: 4.12.0
     *     x-permissions:
     *       hasAll: [can_view_contacts]
     *     parameters:
     *       - in: query
     *         name: type
     *         required: true
     *         schema:
     *           type: string
     *         description: The contact_type id for the type of places to fetch
     *       - $ref: '#/components/parameters/cursor'
     *       - $ref: '#/components/parameters/limitEntity'
     *     responses:
     *       '200':
     *         description: A page of place records
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 data:
     *                   type: array
     *                   description: The results for this page
     *                   items:
     *                     $ref: '#/components/schemas/v1.Place'
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
      const placeType = Qualifier.byContactType(req.query.type);
      const docs = await getPageByType(placeType, req.query.cursor, req.query.limit);
      return res.json(docs);
    }),

    /**
     * @openapi
     * /api/v1/place:
     *   post:
     *     summary: Create a new place
     *     operationId: v1PlacePost
     *     description: Creates a new place record.
     *     tags: [Place]
     *     x-since: 5.2.0
     *     x-permissions:
     *       hasAny: [can_create_places, can_edit]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/v1.PlaceInput'
     *     responses:
     *       '200':
     *         description: The created place record
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/v1.Place'
     *       '400':
     *         $ref: '#/components/responses/BadRequest'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     */
    create: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAny: ['can_create_places', 'can_edit'] });
      const placeDoc = await create(req.body);
      return res.json(placeDoc);
    }),

    /**
     * @openapi
     * /api/v1/place/{id}:
     *   put:
     *     summary: Update a place
     *     operationId: v1PlaceIdPut
     *     description: >
     *       Updates an existing place contact record.  Fields omitted on the request will be removed from the record.
     *       Any included lineage data will be minified on the stored record.
     *     tags: [Place]
     *     x-since: 5.2.0
     *     x-permissions:
     *       hasAny: [can_update_places, can_edit]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: The id of the place to update
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             oneOf:
     *               - $ref: '#/components/schemas/v1.Place'
     *               - $ref: '#/components/schemas/v1.PlaceWithLineage'
     *             properties:
     *               contact:
     *                 oneOf:
     *                   - type: string
     *                     description: UUID of the contact
     *                   - $ref: '#/components/schemas/NormalizedParent'
     *     responses:
     *       '200':
     *         description: The updated place record
     *         content:
     *           application/json:
     *             schema:
     *               oneOf:
     *                 - $ref: '#/components/schemas/v1.Place'
     *                 - $ref: '#/components/schemas/v1.PlaceWithLineage'
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
      await auth.assertPermissions(req, { isOnline: true, hasAny: ['can_update_places', 'can_edit'] });
      const { params: { uuid }, body } = req;
      const updatePlaceInput = {
        ...body,
        _id: uuid,
      };
      const updatedPlaceDoc = await update(updatePlaceInput);
      return res.json(updatedPlaceDoc);
    })
  }
};
