const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const { USER_ROLES } = require('@medic/constants');

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

  describe('POST /api/v1/person', async () => {
    const postOptions = {
      path: `/api/v1/person`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    it(`creates a person`, async () => {
      const personInput = {
        name: 'apoorva',
        type: 'person',
        parent: place0._id,
        date_of_birth: '1996-06-09',
        phone: '+1234567890',
        patient_id: 'patient-id-123',
        sex: 'female',
        hello: 'world',
        reported_date: 1770397800
      };

      const personDoc = await utils.request({ ...postOptions, body: personInput });

      expect(personDoc).excluding([ '_rev', 'reported_date', '_id' ]).to.deep.equal({
        ...personInput,
        type: 'contact',
        contact_type: 'person',
        parent: { _id: place0._id, parent: place0.parent }
      });
      expect(personDoc.reported_date).to.be.a('number');
    });

    it(`creates a person with minimum data`, async () => {
      const personInput = {
        name: 'apoorva',
        type: 'person',
        parent: place2._id
      };

      const personDoc = await utils.request({ ...postOptions, body: personInput });

      expect(personDoc).excluding([ '_rev', 'reported_date', '_id' ]).to.deep.equal({
        ...personInput,
        type: 'contact',
        contact_type: 'person',
        parent: { _id: place2._id }
      });
      expect(personDoc.reported_date).to.be.a('number');
    });

    it(`throws error for non-person type`, async () => {
      const personInput = {
        name: 'apoorva',
        type: 'clinic',
        parent: contact0._id
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `[${personInput.type}] is not a valid person type.`,
      })}`;

      await expect(utils.request({ ...postOptions, body: personInput })).to.be.rejectedWith(expectedError);
    });

    it(`throws error for parent type not among allowed parents in settings.contact_types`, async () => {
      const personInput = {
        name: 'apoorva',
        type: 'person',
        parent: contact0._id
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `Parent contact of type [person] is not allowed for type [${personInput.type}].`,
      })}`;

      await expect(utils.request({ ...postOptions, body: personInput })).to.be.rejectedWith(expectedError);
    });

    it(`throws error when user does not have can_create_people or can_edit permissions`, async () => {
      const personInput = {
        name: 'apoorva',
        type: 'person',
        parent: place2._id
      };
      const opts = {
        ...postOptions,
        body: personInput,
        auth: { username: userNoPerms.username, password: userNoPerms.password },
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it(`throws error when user is not an online user`, async () => {
      const personInput = {
        name: 'apoorva',
        type: 'person',
        parent: place2._id
      };
      const opts = {
        ...postOptions,
        body: personInput,
        auth: { username: offlineUser.username, password: offlineUser.password },
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });
  });

  describe('PUT /api/v1/person/:uuid', async () => {
    const endpoint = `/api/v1/person`;
    const putOptions = {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    };
    let originalPerson;

    beforeEach(() => {
      originalPerson = personFactory.build({
        name: 'apoorva',
        parent: {
          _id: place0._id,
          parent: {
            _id: place1._id,
            parent: { _id: place2._id }
          },
        },
        phone: '1234567890',
        date_of_birth: '2000-02-01',
        role: 'patient',
        reported_date: 1770397800
      });
    });

    it(`updates a person`, async () => {
      const { rev } = await utils.saveDoc(originalPerson);
      const updatePersonInput = {
        ...originalPerson,
        _rev: rev,
        name: 'apoorva 2',
        hello: 'world'
      };
      delete updatePersonInput.phone;
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalPerson._id}`,
        body: updatePersonInput
      };

      const updatePersonDoc = await utils.request(opts);

      expect(updatePersonDoc).excluding([ '_rev' ]).to.deep.equal(updatePersonInput);
    });

    it(`updates a person when lineage data is provided`, async () => {
      const { rev } = await utils.saveDoc(originalPerson);
      const updatePersonInput = {
        ...originalPerson,
        _rev: rev,
        name: 'apoorva 2',
        parent: {
          ...place0,
          parent: {
            ...place1,
            parent: { ...place2 }
          }
        }
      };
      delete updatePersonInput.parent.parent.parent.parent;
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalPerson._id}`,
        body: updatePersonInput
      };

      const updatePerson = await utils.request(opts);

      // Given lineage data is returned
      expect(updatePerson).excludingEvery(['_rev', 'reported_date']).to.deep.equal(updatePersonInput);
      const updatedDoc = await utils.getDoc(originalPerson._id);
      // Doc is written with minified lineage
      expect(updatedDoc).excluding('_rev').to.deep.equal({
        ...updatePersonInput,
        parent: originalPerson.parent
      });
    });

    it(`throws error when updating parent lineage`, async () => {
      const { rev } = await utils.saveDoc(originalPerson);
      const updatePersonInput = {
        ...originalPerson,
        parent: {
          _id: place0._id,
          parent: { _id: place2._id },
        },
        _rev: rev,
      };
      delete updatePersonInput.phone;
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalPerson._id}`,
        body: updatePersonInput
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `Parent lineage does not match.`
      })}`;

      await expect(utils.request(opts)).to.be.rejectedWith(expectedError);
    });

    [
      ['any document', 'does-not-exist'],
      ['a person', place0._id],
    ].forEach(([test, id]) => {
      it(`throws error when id does not match ${test}`, async () => {
        const { rev } = await utils.saveDoc(originalPerson);
        const opts = {
          ...putOptions,
          path: `${endpoint}/${id}`,
          body: {
            ...originalPerson,
            _rev: rev
          }
        };
        const expectedError = `404 - ${JSON.stringify({
          code: 404,
          error: `Person record [${id}] not found.`
        })}`;

        await expect(utils.request(opts)).to.be.rejectedWith(expectedError);
      });
    });

    it(`throws error when user does not have can_update_people or can_edit permissions`, async () => {
      const { rev } = await utils.saveDoc(originalPerson);
      const updatePersonInput = {
        ...originalPerson,
        _rev: rev,
      };
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalPerson._id}`,
        body: updatePersonInput,
        auth: { username: userNoPerms.username, password: userNoPerms.password },
      };

      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it(`throws error when user is not an online user`, async () => {
      const { rev } = await utils.saveDoc(originalPerson);
      const updatePersonInput = {
        ...originalPerson,
        _rev: rev,
      };
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalPerson._id}`,
        body: updatePersonInput,
        auth: { username: offlineUser.username, password: offlineUser.password },
      };

      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });
  });
});
