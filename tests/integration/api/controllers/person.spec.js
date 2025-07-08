const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const { expect } = require('chai');

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

  describe.only('POST /api/v1/person', async () => {
    const endpoint = `/api/v1/person`;
    it(`creates a person for valid personInput`, async () => {
      const personInput = {
        name: 'apoorva',
        type: 'person',
        parent: place0._id
      };
      const opts = {
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: personInput
      };
      const personDoc = await utils.request(opts);
      expect(personDoc).excluding(['_rev', 'reported_date', '_id'])
        .to.deep.equal({...personInput, type: 'contact', contact_type: 'person', 
          parent: {_id: place0._id, parent: place0.parent}});
    });

    it(`throws error for parent type not among allowed parents in settings.contact_types`, async () => {
      const personInput = {
        name: 'apoorva',
        type: 'person',
        reported_date: 12312312,
        parent: contact0._id
      };
      const opts = {
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: personInput
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `Invalid parent type for [${JSON.stringify({
          name: 'apoorva',
          type: 'contact',
          reported_date: 12312312,
          parent: contact0._id,
          contact_type: 'person',
        })}].`,
      })}`;
      
      await expect(utils.request(opts)).to.be.rejectedWith(expectedError);
    });

    it(`throws 400 error for invalid personInput, here with a missing 'parent'`, async () => {
      const personInput = {
        name: 'apoorva',
        type: 'person',
        reported_date: 1122334455
      };
      const opts = {
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: personInput
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `Missing or empty required field (parent) [${JSON.stringify(personInput)}].`
      })}`;
      
      await expect(utils.request(opts)).to.be.rejectedWith(expectedError);
    });
  });
});
