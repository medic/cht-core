const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');

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
    roles: ['mm-online']
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
    const endpoint = '/api/v1/place';

    it('creates place with minimal required fields', async () => {
      const placeData = {
        type: 'clinic',
        name: 'Test Clinic Created',
        parent: { _id: place1._id }
      };

      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: placeData
      });

      expect(response).to.have.property('_id');
      expect(response).to.have.property('_rev');
      expect(response).to.have.property('reported_date');
      expect(response.type).to.equal('clinic');
      expect(response.name).to.equal('Test Clinic Created');
    });

    it('creates place with all optional fields', async () => {
      const placeData = {
        type: 'clinic',
        name: 'Test Clinic with Fields',
        reported_date: 1234567890,
        contact: { _id: contact0._id },
        notes: 'Test notes',
        parent: { _id: place1._id }
      };

      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: placeData
      });

      expect(response).to.have.property('_id');
      expect(response).to.have.property('_rev');
      expect(response.type).to.equal('clinic');
      expect(response.name).to.equal('Test Clinic with Fields');
      expect(response.reported_date).to.equal(1234567890);
      expect(response.notes).to.equal('Test notes');
    });

    it('creates place with parent (child place type)', async () => {
      const placeData = {
        type: 'clinic',
        name: 'Child Clinic',
        parent: { _id: place1._id }
      };

      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: placeData
      });

      expect(response).to.have.property('_id');
      expect(response).to.have.property('_rev');
      expect(response.parent).to.have.property('_id', place1._id);
    });

    it('creates place with contact field', async () => {
      const placeData = {
        type: 'clinic',
        name: 'Clinic with Contact',
        contact: { _id: contact0._id },
        parent: { _id: place1._id }
      };

      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: placeData
      });

      expect(response).to.have.property('_id');
      expect(response).to.have.property('_rev');
      expect(response.contact).to.have.property('_id', contact0._id);
    });

    it('auto-generates _id when not provided', async () => {
      const placeData = {
        type: 'clinic',
        name: 'Auto ID Clinic',
        parent: { _id: place1._id }
      };

      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: placeData
      });

      expect(response).to.have.property('_id');
      expect(response._id).to.be.a('string');
      expect(response._id.length).to.be.greaterThan(0);
    });

    it('auto-generates reported_date when not provided', async () => {
      const placeData = {
        type: 'clinic',
        name: 'Auto Date Clinic',
        parent: { _id: place1._id }
      };

      const beforeTimestamp = Date.now();
      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: placeData
      });
      const afterTimestamp = Date.now();

      expect(response).to.have.property('reported_date');
      expect(response.reported_date).to.be.a('number');
      expect(response.reported_date).to.be.at.least(beforeTimestamp);
      expect(response.reported_date).to.be.at.most(afterTimestamp);
    });

    it('accepts ISO 8601 date string for reported_date', async () => {
      const isoDate = '2025-01-15T10:30:00.000Z';
      const placeData = {
        type: 'clinic',
        name: 'ISO Date Clinic',
        reported_date: isoDate,
        parent: { _id: place1._id }
      };

      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: placeData
      });

      expect(response.reported_date).to.equal(new Date(isoDate).getTime());
    });

    it('returns 400 when type is missing', async () => {
      const placeData = {
        name: 'No Type Clinic'
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: placeData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when name is missing', async () => {
      const placeData = {
        type: 'clinic'
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: placeData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when type is invalid', async () => {
      const placeData = {
        type: 'invalid-place-type',
        name: 'Invalid Type Clinic'
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: placeData
      })).to.be.rejectedWith('400 - {"code":400,"error":"Invalid place type [invalid-place-type]."}');
    });

    it('returns 400 when _rev is provided for create', async () => {
      const placeData = {
        type: 'clinic',
        name: 'Clinic with Rev',
        _rev: '1-abc',
        parent: { _id: place1._id }
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: placeData
      })).to.be.rejectedWith('400 - {"code":400,"error":"_rev is not allowed for create operations."}');
    });

    it('returns 400 when reported_date is invalid format', async () => {
      const placeData = {
        type: 'clinic',
        name: 'Invalid Date Clinic',
        reported_date: 'invalid-date'
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: placeData
      })).to.be.rejectedWith('400');
    });

    it('returns 403 when user does not have can_create_places permission', async () => {
      const placeData = {
        type: 'clinic',
        name: 'Test Clinic'
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: placeData,
        auth: { username: userNoPerms.username, password: userNoPerms.password }
      })).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it('returns 403 when user is not an online user', async () => {
      const placeData = {
        type: 'clinic',
        name: 'Test Clinic'
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: placeData,
        auth: { username: offlineUser.username, password: offlineUser.password }
      })).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });
  });

  describe('PUT /api/v1/place/:uuid', () => {
    let createdPlace;

    beforeEach(async () => {
      // Create a place to update
      createdPlace = await utils.request({
        path: '/api/v1/place',
        method: 'POST',
        body: {
          type: 'clinic',
          name: 'Place to Update',
          contact: { _id: contact0._id },
          parent: { _id: place1._id }
        }
      });
    });

    it('updates place successfully with mutable fields', async () => {
      const updatedData = {
        ...createdPlace,
        name: 'Updated Place Name',
        notes: 'Updated notes'
      };

      const response = await utils.request({
        path: `/api/v1/place/${createdPlace._id}`,
        method: 'PUT',
        body: updatedData
      });

      expect(response._id).to.equal(createdPlace._id);
      expect(response._rev).to.not.equal(createdPlace._rev);
      expect(response.name).to.equal('Updated Place Name');
      expect(response.notes).to.equal('Updated notes');
    });

    it('updates place maintaining immutable fields', async () => {
      const updatedData = {
        ...createdPlace,
        name: 'Updated Name',
        type: createdPlace.type,
        reported_date: createdPlace.reported_date,
        contact: createdPlace.contact
      };

      const response = await utils.request({
        path: `/api/v1/place/${createdPlace._id}`,
        method: 'PUT',
        body: updatedData
      });

      expect(response._id).to.equal(createdPlace._id);
      expect(response.type).to.equal(createdPlace.type);
      expect(response.reported_date).to.equal(createdPlace.reported_date);
    });

    it('returns 404 when UUID is missing in URL path', async () => {
      const updatedData = {
        _id: createdPlace._id,
        _rev: createdPlace._rev,
        type: 'clinic',
        name: 'Updated Name',
        parent: createdPlace.parent
      };

      await expect(utils.request({
        path: '/api/v1/place',
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('404');
    });

    it('returns 400 when _rev is missing in body', async () => {
      const updatedData = {
        _id: createdPlace._id,
        type: 'clinic',
        name: 'Updated Name',
        parent: createdPlace.parent
      };

      await expect(utils.request({
        path: `/api/v1/place/${createdPlace._id}`,
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('400 - {"code":400,"error":"_rev is required for update operations."}');
    });

    it('returns 404 when place does not exist', async () => {
      const updatedData = {
        _id: 'non-existent-uuid',
        _rev: '1-abc',
        type: 'clinic',
        name: 'Updated Name',
        parent: { _id: place1._id }
      };

      await expect(utils.request({
        path: '/api/v1/place/non-existent-uuid',
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('404');
    });

    it('returns 400 when type is invalid', async () => {
      const updatedData = {
        ...createdPlace,
        type: 'invalid-type',
        name: 'Updated Name'
      };

      await expect(utils.request({
        path: `/api/v1/place/${createdPlace._id}`,
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when trying to change type (immutable field)', async () => {
      const updatedData = {
        ...createdPlace,
        type: 'health_center',
        name: 'Updated Name'
      };

      await expect(utils.request({
        path: `/api/v1/place/${createdPlace._id}`,
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when trying to change reported_date (immutable field)', async () => {
      const updatedData = {
        ...createdPlace,
        reported_date: createdPlace.reported_date + 1000,
        name: 'Updated Name'
      };

      await expect(utils.request({
        path: `/api/v1/place/${createdPlace._id}`,
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when trying to change contact (immutable field)', async () => {
      const updatedData = {
        ...createdPlace,
        contact: { _id: contact1._id },
        name: 'Updated Name'
      };

      await expect(utils.request({
        path: `/api/v1/place/${createdPlace._id}`,
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('400');
    });

    it('returns 409 on _rev conflict', async () => {
      const updatedData = {
        ...createdPlace,
        _rev: '99-wrong-rev',
        name: 'Updated Name'
      };

      await expect(utils.request({
        path: `/api/v1/place/${createdPlace._id}`,
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('409');
    });

    it('returns 403 when user does not have can_edit_places permission', async () => {
      const updatedData = {
        ...createdPlace,
        name: 'Updated Name'
      };

      await expect(utils.request({
        path: `/api/v1/place/${createdPlace._id}`,
        method: 'PUT',
        body: updatedData,
        auth: { username: userNoPerms.username, password: userNoPerms.password }
      })).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it('returns 403 when user is not an online user', async () => {
      const updatedData = {
        ...createdPlace,
        name: 'Updated Name'
      };

      await expect(utils.request({
        path: `/api/v1/place/${createdPlace._id}`,
        method: 'PUT',
        body: updatedData,
        auth: { username: offlineUser.username, password: offlineUser.password }
      })).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });
  });
});
