const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const { getRemoteDataContext, Person, Qualifier } = require('@medic/cht-datasource');
const chai = require('chai');
const { expect } = require('chai');
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
const userFactory = require('@factories/cht/users/users');
chai.use(deepEqualInAnyOrder);

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
  const dataContext = getRemoteDataContext(utils.getOrigin());
  const e2eTestUser = {
    '_id': 'e2e_contact_test_id',
    'type': 'person',
  };

  before(async () => {
    await utils.saveDocs(allDocItems);
    await utils.createUsers([userNoPerms, offlineUser]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([userNoPerms, offlineUser]);
  });

  describe('GET /api/v1/person/:uuid', async () => {
    const getPerson = Person.v1.get(dataContext);
    const getPersonWithLineage = Person.v1.getWithLineage(dataContext);

    it('returns the person matching the provided UUID', async () => {
      const person = await getPerson(Qualifier.byUuid(patient._id));
      expect(person).excluding(['_rev', 'reported_date']).to.deep.equal(patient);
    });

    it('returns the person with lineage when the withLineage query parameter is provided', async () => {
      const person = await getPersonWithLineage(Qualifier.byUuid(patient._id));
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

    it('returns null when no person is found for the UUID', async () => {
      const person = await getPerson(Qualifier.byUuid('invalid-uuid'));
      expect(person).to.be.null;
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
    const getPage = Person.v1.getPage(dataContext);
    const limit = 100;
    const skip = 0;
    const personType = 'person';
    const invalidContactType = 'invalidPerson';
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

    it('returns a page of people', async () => {
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
      const responsePage = await getPage(Qualifier.byContactType(personType), limit, skip);
      const responsePeople = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePeople).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedPeople);
      expect(responseCursor).to.be.equal('-1');
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
        'personType': invalidContactType
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `/api/v1/person?${queryString}`,
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(`400 - {"code":400,"error":"Invalid contact type [${invalidContactType}]"}`);
    });

    it('throws 400 error when limit is invalid', async () => {
      const queryParams = {
        personType,
        limit: -1
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `/api/v1/person?${queryString}`,
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(`400 - {"code":400,"error":"The limit must be a positive number: [${-1}]"}`);
    });

    it('throws 400 error when skip is invalid', async () => {
      const queryParams = {
        personType,
        skip: -1
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `/api/v1/person?${queryString}`,
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(`400 - {"code":400,"error":"The skip must be a non-negative number: [${-1}]"}`);
    });
  });
});
