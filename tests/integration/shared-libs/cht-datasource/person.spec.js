const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const { getRemoteDataContext, Person, Qualifier } = require('@medic/cht-datasource');
const { USER_ROLES } = require('@medic/constants');
const userFactory = require('@factories/cht/users/users');
const { setAuth, removeAuth } = require('./auth');
const { CONTACT_TYPES } = require('@medic/constants');

describe('cht-datasource Person', () => {
  const contact0 = utils.deepFreeze(personFactory.build({ name: 'contact0', role: 'chw' }));
  const contact1 = utils.deepFreeze(personFactory.build({ name: 'contact1', role: 'chw_supervisor' }));
  const contact2 = utils.deepFreeze(personFactory.build({ name: 'contact2', role: 'program_officer' }));
  const placeMap = utils.deepFreeze(placeFactory.generateHierarchy());
  const place0 = utils.deepFreeze({ ...placeMap.get('clinic'), contact: { _id: contact0._id } });
  const place1 = utils.deepFreeze({ ...placeMap.get(CONTACT_TYPES.HEALTH_CENTER), contact: { _id: contact1._id } });
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
  const dataContext = getRemoteDataContext(utils.getOrigin());
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

  const excludedProperties = [ '_rev', 'reported_date', 'patient_id', 'place_id' ];

  before(async () => {
    setAuth();
    await utils.saveDocs(allDocItems);
    await sentinelUtils.waitForSentinel();
    await utils.createUsers([userNoPerms, offlineUser]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([userNoPerms, offlineUser]);
    removeAuth();
  });

  describe('v1', () => {
    describe('get', async () => {
      const getPerson = Person.v1.get(dataContext);

      it('returns the person matching the provided UUID', async () => {
        const person = await getPerson(Qualifier.byUuid(patient._id));
        expect(person).excluding(excludedProperties).to.deep.equal(patient);
      });

      it('returns null when no person is found for the UUID', async () => {
        const person = await getPerson(Qualifier.byUuid('invalid-uuid'));
        expect(person).to.be.null;
      });
    });

    describe('getWithLineage', () => {
      const getPersonWithLineage = Person.v1.getWithLineage(dataContext);

      it('returns the person with lineage', async () => {
        const person = await getPersonWithLineage(Qualifier.byUuid(patient._id));
        expect(person).excludingEvery(excludedProperties).to.deep.equal({
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
    });

    describe('getPage', async () => {
      const getPage = Person.v1.getPage(dataContext);
      const limit = 4;
      const stringifiedLimit = '7';
      const cursor = null;
      const invalidLimit = 'invalidLimit';
      const invalidCursor = 'invalidCursor';

      it('returns a page of people for no limit and cursor passed', async () => {
        const responsePage = await getPage(Qualifier.byContactType(personType));
        const responsePeople = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responsePeople).excludingEvery(excludedProperties).to.deep.equalInAnyOrder(expectedPeople);
        expect(responseCursor).to.be.equal(null);
      });

      it('returns a page of people for stringified limit and null cursor passed', async () => {
        const responsePage = await getPage(Qualifier.byContactType(personType), null, stringifiedLimit);
        const responsePeople = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responsePeople).excludingEvery(excludedProperties).to.deep.equalInAnyOrder(expectedPeople);
        expect(responseCursor).to.be.equal('7');
      });

      it('returns a page of people when limit and cursor is passed and cursor can be reused', async () => {
        const firstPage = await getPage(Qualifier.byContactType(personType), cursor, limit);
        const secondPage = await getPage(Qualifier.byContactType(personType), firstPage.cursor, limit);

        const allPeople = [ ...firstPage.data, ...secondPage.data ];

        expect(allPeople).excludingEvery(excludedProperties).to.deep.equalInAnyOrder(expectedPeople);
        expect(firstPage.data.length).to.be.equal(4);
        expect(secondPage.data.length).to.be.equal(3);
        expect(firstPage.cursor).to.be.equal('4');
        expect(secondPage.cursor).to.be.equal(null);
      });

      it('throws error when limit is invalid', async () => {
        await expect(
          getPage({...Qualifier.byContactType(personType)}, cursor, invalidLimit)
        ).to.be.rejectedWith(
          `The limit must be a positive integer: [${JSON.stringify(invalidLimit)}].`
        );
      });

      it('throws error when cursor is invalid', async () => {
        await expect(
          getPage({
            ...Qualifier.byContactType(personType),
          }, invalidCursor, limit)
        ).to.be.rejectedWith(
          `The cursor must be a string or null for first page: [${JSON.stringify(invalidCursor)}].`
        );
      });
    });

    describe('getAll', async () => {
      it('fetches all data by iterating through generator', async () => {
        const docs = [];

        const generator = Person.v1.getAll(dataContext)(Qualifier.byContactType(personType));

        for await (const doc of generator) {
          docs.push(doc);
        }

        expect(docs).excluding(excludedProperties).to.deep.equalInAnyOrder(expectedPeople);
      });
    });
  });
});
