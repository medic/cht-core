const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');

describe('Person API', () => {
  const contact0 = utils.deepFreeze(personFactory.build({ name: 'contact0', role: 'chw' }));
  const contact1 = utils.deepFreeze(personFactory.build({ name: 'contact1', role: 'chw_supervisor' }));
  const contact2 = utils.deepFreeze(personFactory.build({ name: 'contact2', role: 'program_officer' }));
  const placeMap = utils.deepFreeze(placeFactory.generateHierarchy());
  const place0 = utils.deepFreeze({ ...placeMap.get('clinic'), contact: { _id: contact0._id } });
  const place1 = utils.deepFreeze({ ...placeMap.get('health_center'), contact: { _id: contact1._id } });
  const place2 = utils.deepFreeze({ ...placeMap.get('district_hospital'), contact: { _id: contact2._id } });

  const patient = utils.deepFreeze(personFactory.build({
    parent: {
      _id: place0._id,
      parent: {
        _id: place1._id,
        parent: {
          _id: place2._id
        }
      },
    },
    phone: '1234567890',
    role: 'patient',
    short_name: 'Mary'
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
  const allDocItems = [contact0, contact1, contact2, place0, place1, place2, patient];
  const personType = 'person';
  const e2eTestUser = {
    '_id': 'e2e_contact_test_id',
    'type': personType,
  };
  const onlineUserPlaceHierarchy = {
    parent: {
      _id: place1._id,
      parent: {
        _id: place2._id,
      }
    }
  };
  const offlineUserPlaceHierarchy = {
    parent: {
      _id: place0._id,
      ...onlineUserPlaceHierarchy
    }
  };
  const expectedPeople = [
    contact0,
    contact1,
    contact2,
    patient,
    e2eTestUser,
    {
      type: personType,
      ...userNoPerms.contact,
      ...onlineUserPlaceHierarchy
    },
    {
      type: personType,
      ...offlineUser.contact,
      ...offlineUserPlaceHierarchy
    }
  ];

  before(async () => {
    await utils.saveDocs(allDocItems);
    await utils.createUsers([userNoPerms, offlineUser]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([userNoPerms, offlineUser]);
  });

  describe('GET /api/v1/person/:uuid', async () => {
    const endpoint = '/api/v1/person';

    it('returns the person matching the provided UUID', async () => {
      const opts = {
        path: `${endpoint}/${patient._id}`,
      };
      const person = await utils.request(opts);
      expect(person).excluding(['_rev', 'reported_date']).to.deep.equal(patient);
    });

    it('returns the person with lineage when the withLineage query parameter is provided', async () => {
      const opts = {
        path: `${endpoint}/${patient._id}`,
        qs: {
          with_lineage: true
        }
      };
      const person = await utils.request(opts);
      expect(person).excludingEvery(['_rev', 'reported_date']).to.deep.equal({
        ...patient,
        parent: {
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
        }
      });
    });

    it('throws 404 error when no person is found for the UUID', async () => {
      const opts = {
        path: `${endpoint}/invalid-uuid`,
      };
      await expect(utils.request(opts)).to.be.rejectedWith('404 - {"code":404,"error":"Person not found"}');
    });

    [
      ['does not have can_view_contacts permission', userNoPerms],
      ['is not an online user', offlineUser]
    ].forEach(([description, user]) => {
      it(`throws error when user ${description}`, async () => {
        const opts = {
          path: `/api/v1/person/${patient._id}`,
          auth: { username: user.username, password: user.password },
        };
        await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
      });
    });
  });

  describe('GET /api/v1/person', async () => {
    const limit = 4;
    const invalidContactType = 'invalidPerson';
    const endpoint = '/api/v1/person';

    it('returns a page of people for no limit and cursor passed', async () => {
      const opts = {
        path: `${endpoint}`,
        qs: {
          type: personType
        }
      };
      const responsePage = await utils.request(opts);
      const responsePeople = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePeople).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedPeople);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of people when limit and cursor is passed and cursor can be reused', async () => {
      const firstPage = await utils.request({ path: endpoint, qs: { type: personType, limit } });
      const secondPage = await utils.request({
        path: endpoint,
        qs: { type: personType, cursor: firstPage.cursor, limit }
      });

      const allPeople = [...firstPage.data, ...secondPage.data];

      expect(allPeople).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedPeople);
      expect(firstPage.data.length).to.be.equal(4);
      expect(secondPage.data.length).to.be.equal(3);
      expect(firstPage.cursor).to.be.equal('4');
      expect(secondPage.cursor).to.be.equal(null);
    });

    it(`throws error when user does not have can_view_contacts permission`, async () => {
      const opts = {
        path: `/api/v1/person`,
        auth: { username: userNoPerms.username, password: userNoPerms.password },
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it(`throws error when user is not an online user`, async () => {
      const opts = {
        path: `/api/v1/person`,
        auth: { username: offlineUser.username, password: offlineUser.password },
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it('throws 400 error when personType is invalid', async () => {
      const queryParams = {
        type: invalidContactType
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `/api/v1/person?${queryString}`,
      };
      await expect(utils.request(opts))
        .to.be.rejectedWith(`400 - {"code":400,"error":"Invalid contact type [${invalidContactType}]."}`);
    });

    it('throws 400 error when limit is invalid', async () => {
      const queryParams = {
        type: personType,
        limit: -1
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `/api/v1/person?${queryString}`,
      };

      await expect(utils.request(opts)).to.be.rejectedWith(
        `400 - {"code":400,"error":"The limit must be a positive integer: [\\"-1\\"]."}`
      );
    });

    it('throws 400 error when cursor is invalid', async () => {
      const queryParams = {
        type: personType,
        cursor: '-1'
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `/api/v1/person?${queryString}`,
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(
          `400 - {"code":400,"error":"The cursor must be a string or null for first page: [\\"-1\\"]."}`
        );
    });
  });

  describe('POST /api/v1/person', () => {
    const endpoint = '/api/v1/person';

    it('creates person with minimal required fields', async () => {
      const personData = {
        type: 'person',
        name: 'Test Person Created',
        parent: { _id: place0._id }
      };

      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: personData
      });

      expect(response).to.have.property('_id');
      expect(response).to.have.property('_rev');
      expect(response).to.have.property('reported_date');
      expect(response.type).to.equal('person');
      expect(response.name).to.equal('Test Person Created');
    });

    it('creates person with all optional fields', async () => {
      const personData = {
        type: 'person',
        name: 'Test Person with Fields',
        reported_date: 1234567890,
        phone: '+1234567890',
        notes: 'Test notes',
        parent: { _id: place0._id }
      };

      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: personData
      });

      expect(response).to.have.property('_id');
      expect(response).to.have.property('_rev');
      expect(response.type).to.equal('person');
      expect(response.name).to.equal('Test Person with Fields');
      expect(response.reported_date).to.equal(1234567890);
      expect(response.phone).to.equal('+1234567890');
      expect(response.notes).to.equal('Test notes');
    });

    it('creates person with parent (child person type)', async () => {
      const personData = {
        type: 'person',
        name: 'Child Person',
        parent: { _id: place0._id }
      };

      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: personData
      });

      expect(response).to.have.property('_id');
      expect(response).to.have.property('_rev');
      expect(response.parent).to.have.property('_id', place0._id);
    });

    it('auto-generates _id when not provided', async () => {
      const personData = {
        type: 'person',
        name: 'Auto ID Person',
        parent: { _id: place0._id }
      };

      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: personData
      });

      expect(response).to.have.property('_id');
      expect(response._id).to.be.a('string');
      expect(response._id.length).to.be.greaterThan(0);
    });

    it('auto-generates reported_date when not provided', async () => {
      const personData = {
        type: 'person',
        name: 'Auto Date Person',
        parent: { _id: place0._id }
      };

      const beforeTimestamp = Date.now();
      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: personData
      });
      const afterTimestamp = Date.now();

      expect(response).to.have.property('reported_date');
      expect(response.reported_date).to.be.a('number');
      expect(response.reported_date).to.be.at.least(beforeTimestamp);
      expect(response.reported_date).to.be.at.most(afterTimestamp);
    });

    it('accepts ISO 8601 date string for reported_date', async () => {
      const isoDate = '2025-01-15T10:30:00.000Z';
      const personData = {
        type: 'person',
        name: 'ISO Date Person',
        reported_date: isoDate,
        parent: { _id: place0._id }
      };

      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: personData
      });

      expect(response.reported_date).to.equal(new Date(isoDate).getTime());
    });

    it('accepts Unix timestamp for reported_date', async () => {
      const timestamp = 1609459200000;
      const personData = {
        type: 'person',
        name: 'Unix Timestamp Person',
        reported_date: timestamp,
        parent: { _id: place0._id }
      };

      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: personData
      });

      expect(response.reported_date).to.equal(timestamp);
    });

    it('returns 400 when type is missing', async () => {
      const personData = {
        name: 'No Type Person'
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: personData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when name is missing', async () => {
      const personData = {
        type: 'person'
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: personData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when type is invalid', async () => {
      const personData = {
        type: 'invalid-person-type',
        name: 'Invalid Type Person'
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: personData
      })).to.be.rejectedWith('400 - {"code":400,"error":"Invalid person type [invalid-person-type]."}');
    });

    it('returns 400 when _rev is provided for create', async () => {
      const personData = {
        type: 'person',
        name: 'Person with Rev',
        _rev: '1-abc',
        parent: { _id: place0._id }
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: personData
      })).to.be.rejectedWith('400 - {"code":400,"error":"_rev is not allowed for create operations."}');
    });

    it('returns 400 when reported_date is invalid format', async () => {
      const personData = {
        type: 'person',
        name: 'Invalid Date Person',
        reported_date: 'invalid-date'
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: personData
      })).to.be.rejectedWith('400');
    });

    it('returns 403 when user does not have can_create_people permission', async () => {
      const personData = {
        type: 'person',
        name: 'Test Person'
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: personData,
        auth: { username: userNoPerms.username, password: userNoPerms.password }
      })).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it('returns 403 when user is not an online user', async () => {
      const personData = {
        type: 'person',
        name: 'Test Person'
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: personData,
        auth: { username: offlineUser.username, password: offlineUser.password }
      })).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });
  });

  describe('PUT /api/v1/person/:uuid', () => {
    let createdPerson;

    beforeEach(async () => {
      // Create a person to update
      createdPerson = await utils.request({
        path: '/api/v1/person',
        method: 'POST',
        body: {
          type: 'person',
          name: 'Person to Update',
          phone: '1234567890',
          parent: { _id: place0._id }
        }
      });
    });

    it('updates person successfully with mutable fields', async () => {
      const updatedData = {
        ...createdPerson,
        name: 'Updated Person Name',
        phone: '0987654321',
        notes: 'Updated notes'
      };

      const response = await utils.request({
        path: `/api/v1/person/${createdPerson._id}`,
        method: 'PUT',
        body: updatedData
      });

      expect(response._id).to.equal(createdPerson._id);
      expect(response._rev).to.not.equal(createdPerson._rev);
      expect(response.name).to.equal('Updated Person Name');
      expect(response.phone).to.equal('0987654321');
      expect(response.notes).to.equal('Updated notes');
    });

    it('updates person with same immutable field values', async () => {
      const updatedData = {
        ...createdPerson,
        name: 'Updated Name',
        type: createdPerson.type,
        reported_date: createdPerson.reported_date
      };

      const response = await utils.request({
        path: `/api/v1/person/${createdPerson._id}`,
        method: 'PUT',
        body: updatedData
      });

      expect(response._id).to.equal(createdPerson._id);
      expect(response.type).to.equal(createdPerson.type);
      expect(response.reported_date).to.equal(createdPerson.reported_date);
    });

    it('returns 404 when UUID is missing in URL path', async () => {
      const updatedData = {
        _id: createdPerson._id,
        _rev: createdPerson._rev,
        type: 'person',
        name: 'Updated Name',
        parent: createdPerson.parent
      };

      await expect(utils.request({
        path: '/api/v1/person',
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('404');
    });

    it('returns 400 when _rev is missing in body', async () => {
      const updatedData = {
        _id: createdPerson._id,
        type: 'person',
        name: 'Updated Name',
        parent: createdPerson.parent
      };

      await expect(utils.request({
        path: `/api/v1/person/${createdPerson._id}`,
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('400 - {"code":400,"error":"_rev is required for update operations."}');
    });

    it('returns 404 when person does not exist', async () => {
      const updatedData = {
        _id: 'non-existent-uuid',
        _rev: '1-abc',
        type: 'person',
        name: 'Updated Name',
        parent: { _id: place0._id }
      };

      await expect(utils.request({
        path: '/api/v1/person/non-existent-uuid',
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('404');
    });

    it('returns 400 when type is invalid', async () => {
      const updatedData = {
        ...createdPerson,
        type: 'invalid-type',
        name: 'Updated Name'
      };

      await expect(utils.request({
        path: `/api/v1/person/${createdPerson._id}`,
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when trying to change type (immutable field)', async () => {
      const updatedData = {
        ...createdPerson,
        type: 'chw',
        name: 'Updated Name'
      };

      await expect(utils.request({
        path: `/api/v1/person/${createdPerson._id}`,
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when trying to change reported_date (immutable field)', async () => {
      const updatedData = {
        ...createdPerson,
        reported_date: createdPerson.reported_date + 1000,
        name: 'Updated Name'
      };

      await expect(utils.request({
        path: `/api/v1/person/${createdPerson._id}`,
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('400');
    });

    it('returns 409 on _rev conflict', async () => {
      const updatedData = {
        ...createdPerson,
        _rev: '99-wrong-rev',
        name: 'Updated Name'
      };

      await expect(utils.request({
        path: `/api/v1/person/${createdPerson._id}`,
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('409');
    });

    it('returns 403 when user does not have can_edit_people permission', async () => {
      const updatedData = {
        ...createdPerson,
        name: 'Updated Name'
      };

      await expect(utils.request({
        path: `/api/v1/person/${createdPerson._id}`,
        method: 'PUT',
        body: updatedData,
        auth: { username: userNoPerms.username, password: userNoPerms.password }
      })).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it('returns 403 when user is not an online user', async () => {
      const updatedData = {
        ...createdPerson,
        name: 'Updated Name'
      };

      await expect(utils.request({
        path: `/api/v1/person/${createdPerson._id}`,
        method: 'PUT',
        body: updatedData,
        auth: { username: offlineUser.username, password: offlineUser.password }
      })).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });
  });
});
