const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const { USER_ROLES, CONTACT_TYPES } = require('@medic/constants');
const { expect } = require('chai');

describe('Place API', () => {
  const contact0 = utils.deepFreeze(personFactory.build({ name: 'contact0', role: 'chw' }));
  const contact1 = utils.deepFreeze(personFactory.build({ name: 'contact0', role: 'chw_supervisor' }));
  const contact2 = utils.deepFreeze(personFactory.build({ name: 'contact0', role: 'program_officer' }));
  const placeMap = utils.deepFreeze(placeFactory.generateHierarchy());
  const place1 = utils.deepFreeze({ ...placeMap.get(CONTACT_TYPES.HEALTH_CENTER), contact: { _id: contact1._id } });
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
    type: CONTACT_TYPES.HEALTH_CENTER,
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
    roles: ['chw']
  }));
  const expectedPlaces = [place0, clinic1, clinic3];

  before(async () => {
    await utils.saveDocs([contact0, contact1, contact2, place0, place1, place2, clinic1, clinic3, healthCenter2]);
    await utils.createUsers([userNoPerms, offlineUser]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([userNoPerms, offlineUser]);
  });

  describe('GET /api/v1/place/:uuid', async () => {
    const endpoint = '/api/v1/place';

    it('returns the place matching the provided UUID', async () => {
      const opts = {
        path: `${endpoint}/${place0._id}`,
      };
      const place = await utils.request(opts);
      expect(place).excluding(['_rev', 'reported_date']).to.deep.equal(place0);
    });

    it('returns the place with lineage when the withLineage query parameter is provided', async () => {
      const opts = {
        path: `${endpoint}/${place0._id}`,
        qs: {
          with_lineage: true
        }
      };
      const place = await utils.request(opts);
      expect(place).excludingEvery(['_rev', 'reported_date']).to.deep.equal({
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
      expect(place).excludingEvery(['_rev', 'reported_date']).to.deep.equal({
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
      expect(place).excludingEvery(['_rev', 'reported_date']).to.deep.equal({
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
      ['does not have can_view_contacts permission', userNoPerms],
      ['is not an online user', offlineUser]
    ].forEach(([description, user]) => {
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

      expect(responsePlaces).excludingEvery(['_rev', 'reported_date'])
        .to.deep.equalInAnyOrder(expectedPlaces);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of places when limit and cursor is passed and cursor can be reused', async () => {
      const firstPage = await utils.request({ path: endpoint, qs: { type: placeType, limit } });
      const secondPage = await utils.request({
        path: endpoint,
        qs: { type: placeType, cursor: firstPage.cursor, limit }
      });

      const allPeople = [...firstPage.data, ...secondPage.data];

      expect(allPeople).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedPlaces);
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
    const postOptions = {
      path: `/api/v1/place`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    it('creates place for valid input', async () => {
      const input = {
        type: 'clinic',
        name: 'place-1',
        parent: place1._id,
        contact: contact0._id,
        reported_date: 1770397800,
        hello: 'world'
      };

      const placeDoc = await utils.request({ ...postOptions, body: input });

      expect(placeDoc).excluding(['_id', '_rev']).to.deep.equal({
        ...input,
        contact: {
          _id: contact0._id,
          parent: contact0.parent
        },
        parent: {
          _id: place1._id,
          parent: { _id: place1.parent._id }
        },
        type: 'contact',
        contact_type: 'clinic',
      });
    });

    it('creates place with minimum data', async () => {
      const input = {
        type: CONTACT_TYPES.DISTRICT_HOSPITAL,
        name: 'place-1',
      };

      const placeDoc = await utils.request({ ...postOptions, body: input });

      expect(placeDoc).excluding(['_id', '_rev', 'reported_date']).to.deep.equal({
        ...input,
        type: 'contact',
        contact_type: CONTACT_TYPES.DISTRICT_HOSPITAL,
      });
      expect(placeDoc.reported_date).to.be.a('number');
    });

    it(`throws error for non-place type`, async () => {
      const body = {
        type: 'person',
        name: 'place-1',
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `[${body.type}] is not a valid place type.`,
      })}`;

      await expect(utils.request({ ...postOptions, body })).to.be.rejectedWith(expectedError);
    });

    it(`throws error for non-existent parent`, async () => {
      const body = {
        type: 'clinic',
        name: 'place-1',
        parent: 'invalid-id'
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `Parent contact [${body.parent}] not found.`,
      })}`;

      await expect(utils.request({ ...postOptions, body })).to.be.rejectedWith(expectedError);
    });

    it(`throws error for non-existent contact`, async () => {
      const body = {
        type: CONTACT_TYPES.DISTRICT_HOSPITAL,
        name: 'place-1',
        contact: 'invalid-id'
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `Primary contact [${body.contact}] not found.`
      })}`;

      await expect(utils.request({ ...postOptions, body })).to.be.rejectedWith(expectedError);
    });

    it(`throws error for parent type not among allowed parents in settings.contact_types`, async () => {
      const body = {
        type: 'health_center',
        name: 'place-1',
        parent: place1._id,
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `Parent contact of type [health_center] is not allowed for type [${body.type}].`,
      })}`;

      await expect(utils.request({ ...postOptions, body })).to.be.rejectedWith(expectedError);
    });

    [
      ['does not have can_create_places or can_edit permissions', userNoPerms],
      ['is not an online user', offlineUser]
    ].forEach(([test, user]) => {
      it(`throws error when user ${test}`, async () => {
        const opts = {
          ...postOptions,
          body: {
            type: CONTACT_TYPES.DISTRICT_HOSPITAL,
            name: 'place-1',
          },
          auth: { username: user.username, password: user.password },
        };
        await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
      });
    });
  });

  describe('PUT /api/v1/place/:uuid', async () => {
    const endpoint = `/api/v1/place`;
    const putOptions = {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    };
    let originalPlace;

    beforeEach(async () => {
      const doc = placeFactory.place().build({
        name: 'clinic-to-update',
        parent: {
          _id: place1._id,
          parent: {
            _id: place2._id
          }
        },
        type: 'clinic',
        contact: { _id: contact0._id },
        reported_date: 1770397800,
        phone: '1234567890'
      });
      const { rev } = await utils.saveDoc(doc);
      originalPlace = {
        ...doc,
        _rev: rev
      };
    });

    it(`updates a place`, async () => {
      const body = {
        ...originalPlace,
        name: 'apoorva 2',
        hello: 'world',
        contact: contact1._id
      };
      delete body.phone;
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalPlace._id}`,
        body
      };

      const updatedPlace = await utils.request(opts);

      expect(updatedPlace).excluding([ '_rev' ]).to.deep.equal({
        ...body,
        contact: {
          _id: contact1._id,
          parent: contact1.parent
        }
      });
    });

    it(`updates a place when lineage data is provided`, async () => {
      const body = {
        ...originalPlace,
        name: 'apoorva 2',
        hello: 'world',
        contact: contact1,
        parent: {
          ...place1,
          parent: { _id: place2._id }
        },
      };
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalPlace._id}`,
        body
      };

      const updatedPlace = await utils.request(opts);

      // Given lineage data is returned
      expect(updatedPlace).excludingEvery(['_rev', 'reported_date']).to.deep.equal(body);
      const updatedDoc = await utils.getDoc(originalPlace._id);
      // Doc is written with minified lineage
      expect(updatedDoc).excluding('_rev').to.deep.equal({
        ...body,
        contact: {
          _id: contact1._id,
          parent: contact1.parent
        },
        parent: {
          _id: place1._id,
          parent: { _id: place1.parent._id },
        },
      });
    });

    it(`updates a place to remove contact`, async () => {
      const body = { ...originalPlace };
      delete body.contact;
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalPlace._id}`,
        body
      };

      const updatedPlace = await utils.request(opts);

      expect(updatedPlace).excluding([ '_rev' ]).to.deep.equal(body);
    });

    it(`throws error when updating parent lineage`, async () => {
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalPlace._id}`,
        body: {
          ...originalPlace,
          parent: {
            _id: place1._id,
            parent: { _id: place0._id },
          },
        }
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `Parent lineage does not match.`
      })}`;

      await expect(utils.request(opts)).to.be.rejectedWith(expectedError);
    });

    [
      ['any document', 'does-not-exist'],
      ['a place', contact0._id],
    ].forEach(([test, id]) => {
      it(`throws error when id does not match ${test}`, async () => {
        const opts = {
          ...putOptions,
          path: `${endpoint}/${id}`,
          body: originalPlace
        };
        const expectedError = `404 - ${JSON.stringify({
          code: 404,
          error: `Place record [${id}] not found.`
        })}`;

        await expect(utils.request(opts)).to.be.rejectedWith(expectedError);
      });
    });

    it('throws error when updating with invalid contact lineage', async () => {
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalPlace._id}`,
        body: {
          ...originalPlace,
          contact: {
            _id: place0._id,
            parent: { _id: place2._id }
          },
        }
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `The given contact lineage does not match the current lineage for that contact.`
      })}`;

      await expect(utils.request(opts)).to.be.rejectedWith(expectedError);
    });

    it('throws error when updating with a non-existent contact', async () => {
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalPlace._id}`,
        body: {
          ...originalPlace,
          contact: 'invalid-id',
        }
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `No valid contact found for [invalid-id].`
      })}`;

      await expect(utils.request(opts)).to.be.rejectedWith(expectedError);
    });

    [
      ['does not have can_update_places or can_edit permissions', userNoPerms],
      ['is not an online user', offlineUser]
    ].forEach(([test, user]) => {
      it(`throws error when user ${test}`, async () => {
        const opts = {
          ...putOptions,
          path: `${endpoint}/${originalPlace._id}`,
          body: originalPlace,
          auth: { username: user.username, password: user.password },
        };

        await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
      });
    });
  });
});
