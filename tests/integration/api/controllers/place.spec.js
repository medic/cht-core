const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const { USER_ROLES } = require('@medic/constants');

describe('Place API', () => {
  const contact0 = utils.deepFreeze(personFactory.build({ name: 'contact0', role: 'chw' }));
  const contact1 = utils.deepFreeze(personFactory.build({ name: 'contact0', role: 'chw_supervisor' }));
  const contact2 = utils.deepFreeze(personFactory.build({ name: 'contact0', role: 'program_officer' }));
  const placeMap = utils.deepFreeze(placeFactory.generateHierarchy());
  const place1 = utils.deepFreeze({ ...placeMap.get('health_center'), contact: { _id: contact1._id } });
  const place2 = utils.deepFreeze({ ...placeMap.get('district_hospital'), contact: { _id: contact2._id } });
  const place0 = utils.deepFreeze({
    ...placeMap.get('clinic'),
    contact: { _id: contact0._id },
    parent: {
      _id: place1._id,
      parent: {
        _id: place2._id
      }
    },
  });
  const placeType = 'clinic';
  const clinic1 = utils.deepFreeze(placeFactory.place().build({
    name: 'clinic1',
    parent: {
      _id: place1._id,
      parent: {
        _id: place2._id
      }
    },
    type: placeType,
    contact: {}
  }));
  // this is named as clinic3 and not clinic2 because placeMap.get('clinic')
  // generates the name `clinic2` always and this is to not cause conflict and confusion
  const clinic3 = utils.deepFreeze(placeFactory.place().build({
    name: 'clinic3',
    parent: {
      _id: place1._id,
      parent: {
        _id: place2._id
      }
    },
    type: placeType,
    contact: {}
  }));
  const healthCenter2 = utils.deepFreeze(placeFactory.place().build({
    name: 'healthCenter2',
    type: 'health_center',
    contact: {}
  }));

  const userNoPerms = utils.deepFreeze(userFactory.build({
    username: 'online-no-perms',
    place: place1._id,
    contact: {
      _id: 'fixture:user:online-no-perms',
      name: 'Online User',
    },
    roles: [USER_ROLES.ONLINE]
  }));
  const offlineUser = utils.deepFreeze(userFactory.build({
    username: 'offline-has-perms',
    place: place0._id,
    contact: {
      _id: 'fixture:user:offline-has-perms',
      name: 'Offline User',
    },
    roles: [ 'chw' ]
  }));
  const expectedPlaces = [ place0, clinic1, clinic3 ];

  before(async () => {
    await utils.saveDocs([ contact0, contact1, contact2, place0, place1, place2, clinic1, clinic3, healthCenter2 ]);
    await utils.createUsers([ userNoPerms, offlineUser ]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([ userNoPerms, offlineUser ]);
  });

  describe('GET /api/v1/place/:uuid', async () => {
    const endpoint = '/api/v1/place';

    it('returns the place matching the provided UUID', async () => {
      const opts = {
        path: `${endpoint}/${place0._id}`,
      };
      const place = await utils.request(opts);
      expect(place).excluding([ '_rev', 'reported_date' ]).to.deep.equal(place0);
    });

    it('returns the place with lineage when the withLineage query parameter is provided', async () => {
      const opts = {
        path: `${endpoint}/${place0._id}`,
        qs: {
          with_lineage: true
        }
      };
      const place = await utils.request(opts);
      expect(place).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equal({
        ...place0,
        contact: contact0,
        parent: {
          ...place1,
          contact: contact1,
          parent: {
            ...place2,
            contact: contact2
          }
        }
      });
    });

    it('returns the place with lineage when the withLineage query parameter is provided ' +
      'and the place has no primary contact', async () => {
      const opts = {
        path: `${endpoint}/${clinic3._id}`,
        qs: {
          with_lineage: true
        }
      };
      const place = await utils.request(opts);
      expect(place).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equal({
        ...clinic3,
        contact: {},
        parent: {
          ...place1,
          contact: contact1,
          parent: {
            ...place2,
            contact: contact2
          }
        }
      });
    });

    it('returns the place with lineage when the withLineage query parameter is provided ' +
      'and the place has no primary contact and parents', async () => {
      const opts = {
        path: `${endpoint}/${healthCenter2._id}`,
        qs: {
          with_lineage: true
        }
      };
      const place = await utils.request(opts);
      expect(place).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equal({
        ...healthCenter2,
      });
    });

    it('throws 404 error when no place is found for the UUID', async () => {
      const opts = {
        path: `${endpoint}/invalid-uuid`,
      };
      await expect(utils.request(opts)).to.be.rejectedWith('404 - {"code":404,"error":"Place not found"}');
    });

    [
      [ 'does not have can_view_contacts permission', userNoPerms ],
      [ 'is not an online user', offlineUser ]
    ].forEach(([ description, user ]) => {
      it(`throws error when user ${description}`, async () => {
        const opts = {
          path: `/api/v1/place/${place0._id}`,
          auth: { username: user.username, password: user.password },
        };
        await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
      });
    });
  });

  describe('GET /api/v1/place', async () => {
    const limit = 2;
    const invalidContactType = 'invalidPlace';
    const endpoint = '/api/v1/place';

    it('returns a page of places for no limit and cursor passed', async () => {
      const opts = {
        path: `${endpoint}`,
        qs: {
          type: placeType
        }
      };
      const responsePage = await utils.request(opts);
      const responsePlaces = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePlaces).excludingEvery([ '_rev', 'reported_date' ])
        .to.deep.equalInAnyOrder(expectedPlaces);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of places when limit and cursor is passed and cursor can be reused', async () => {
      const firstPage = await utils.request({ path: endpoint, qs: { type: placeType, limit } });
      const secondPage = await utils.request({
        path: endpoint,
        qs: { type: placeType, cursor: firstPage.cursor, limit }
      });

      const allPeople = [ ...firstPage.data, ...secondPage.data ];

      expect(allPeople).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedPlaces);
      expect(firstPage.data.length).to.be.equal(2);
      expect(secondPage.data.length).to.be.equal(1);
      expect(firstPage.cursor).to.be.equal('2');
      expect(secondPage.cursor).to.be.equal(null);
    });

    it(`throws error when user does not have can_view_contacts permission`, async () => {
      const opts = {
        path: `/api/v1/place`,
        auth: { username: userNoPerms.username, password: userNoPerms.password },
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it(`throws error when user is not an online user`, async () => {
      const opts = {
        path: `/api/v1/place`,
        auth: { username: offlineUser.username, password: offlineUser.password },
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it('throws 400 error when placeType is invalid', async () => {
      const queryParams = {
        'type': invalidContactType
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `/api/v1/place?${queryString}`,
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(`400 - {"code":400,"error":"Invalid contact type [${invalidContactType}]."}`);
    });

    it('throws 400 error when limit is invalid', async () => {
      const queryParams = {
        type: placeType,
        limit: -1
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `/api/v1/place?${queryString}`,
      };

      await expect(utils.request(opts)).to.be.rejectedWith(
        `400 - {"code":400,"error":"The limit must be a positive integer: [\\"-1\\"]."}`
      );
    });

    it('throws 400 error when cursor is invalid', async () => {
      const queryParams = {
        type: placeType,
        cursor: '-1'
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `/api/v1/place?${queryString}`,
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(
          `400 - {"code":400,"error":"The cursor must be a string or null for first page: [\\"-1\\"]."}`
        );
    });
  });

  describe('POST /api/v1/place', () => {
    it('creates place for valid input', async () => {
      const input = {
        type: 'district_hospital',
        name: 'place-1',
        contact: contact0._id
      };

      const opts = {
        path: '/api/v1/place',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: input
      };
      const placeDoc = await utils.request(opts);
      const updatedInput = {
        ...input,
        contact: {
          _id: contact0._id, parent: contact0.parent
        },
        type: 'contact',
        contact_type: 'district_hospital'
      };
      expect(placeDoc).excluding([ 'reported_date', '_id', '_rev' ]).to.deep.equal(updatedInput);
    });

    it('throws error for missing fields', async () => {
      const input = {
        name: 'place-1',
        contact: 'c1'
      };

      const opts = {
        path: '/api/v1/place',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: input
      };
      await expect(utils.request(opts))
        .to.be.rejectedWith(
          `400 - ${JSON.stringify({
            code: 400,
            error: `The [type] field must be valued.`
          })}`
        );
    });
  });

  describe('PUT /api/v1/place/:uuid', async () => {
    it(`updates a place for valid placeInput`, async () => {
      const endpoint = '/api/v1/place';
      const createPlaceInput = {
        name: 'place-1',
        type: 'clinic',
        parent: place1._id
      };
      const createOpts = {
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: createPlaceInput
      };
      const createPlaceDoc = await utils.request(createOpts);

      const updatePlaceInput = {
        ...createPlaceDoc, name: 'myplace'
      };
      // Remove _id from body as it will come from URL
      delete updatePlaceInput._id;
      const updateOpts = {
        path: `${endpoint}/${createPlaceDoc._id}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: updatePlaceInput
      };
      const updatedPlaceDoc = await utils.request(updateOpts);
      expect(updatedPlaceDoc).excluding([ '_rev' ]).to.deep.equal({ ...updatePlaceInput, _id: createPlaceDoc._id });
    });

    it(`throws error on trying to update an immutable field`, async () => {
      const endpoint = '/api/v1/place';
      const createPlaceInput = {
        name: 'place-1',
        type: 'clinic',
        parent: place1._id
      };
      const createOpts = {
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: createPlaceInput
      };
      const createPlaceDoc = await utils.request(createOpts);

      const updatePlaceInput = {
        ...createPlaceDoc, reported_date: 222222
      };
      // Remove _id from body as it will come from URL
      delete updatePlaceInput._id;
      const updateOpts = {
        path: `${endpoint}/${createPlaceDoc._id}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: updatePlaceInput
      };
      expect(utils.request(updateOpts))
        .to.be.rejectedWith(
          `400 - ${JSON.stringify({
            code: 400,
            error: `Value ${JSON.stringify(
              updatePlaceInput.reported_date
            )} of immutable field 'reported_date' does not match with the original doc`
          })}`
        );
    });

    it(`throws error on missing _id field`, async () => {
      const endpoint = '/api/v1/place';
      const createPlaceInput = {
        name: 'place-1',
        type: 'clinic',
        parent: place1._id
      };
      const createOpts = {
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: createPlaceInput
      };
      const createPlaceDoc = await utils.request(createOpts);

      const updatePlaceInput = {
        ...createPlaceDoc, reported_date: 222222
      };
      delete updatePlaceInput._id;
      const updateOpts = {
        path: `${endpoint}/${createPlaceDoc._id}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: updatePlaceInput
      };
      expect(utils.request(updateOpts))
        .to.be.rejectedWith(
          `400 - ${JSON.stringify({
            code: 400,
            error: `Value ${JSON.stringify(
              updatePlaceInput.reported_date
            )} of immutable field 'reported_date' does not match with the original doc`
          })}`
        );
    });

    it(`throws error on missing _rev field`, async () => {
      const endpoint = '/api/v1/place';
      const createPlaceInput = {
        name: 'place-1',
        type: 'clinic',
        parent: place1._id
      };
      const createOpts = {
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: createPlaceInput
      };
      const createPlaceDoc = await utils.request(createOpts);

      const updatePlaceInput = {
        ...createPlaceDoc, reported_date: 222222
      };
      delete updatePlaceInput._rev;
      // Remove _id from body as it will come from URL
      delete updatePlaceInput._id;
      const updateOpts = {
        path: `${endpoint}/${createPlaceDoc._id}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: updatePlaceInput
      };
      expect(utils.request(updateOpts))
        .to.be.rejectedWith(
          `400 - ${JSON.stringify({
            code: 400,
            error: `Missing or empty required fields (_rev) for [${JSON
              .stringify({ ...updatePlaceInput, _id: createPlaceDoc._id })}].`
          })}`
        );
    });
  });
});
