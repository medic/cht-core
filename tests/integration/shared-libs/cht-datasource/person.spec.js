const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const {
  getRemoteDataContext,
  Person,
  Qualifier,
  InvalidArgumentError,
  ResourceNotFoundError
} = require('@medic/cht-datasource');
const { USER_ROLES } = require('@medic/constants');
const userFactory = require('@factories/cht/users/users');
const { setAuth, removeAuth } = require('./auth');
const { CONTACT_TYPES } = require('@medic/constants');
const { expect } = require('chai');

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
          getPage({ ...Qualifier.byContactType(personType) }, cursor, invalidLimit)
        ).to.be.rejectedWith(
          { code: 400, error: `The limit must be a positive integer: [${JSON.stringify(invalidLimit)}].` }
        );
      });

      it('throws error when cursor is invalid', async () => {
        await expect(
          getPage({
            ...Qualifier.byContactType(personType),
          }, invalidCursor, limit)
        ).to.be.rejectedWith({
          code: 400,
          error: `The cursor must be a string or null for first page: [${JSON.stringify(invalidCursor)}].`
        });
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

    describe('create', async () => {
      const createPerson = Person.v1.create(dataContext);

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

        const person = await createPerson(personInput);

        expect(person).excluding([ '_rev', '_id' ]).to.deep.equal({
          ...personInput,
          type: 'contact',
          contact_type: 'person',
          parent: { _id: place0._id, parent: place0.parent }
        });
      });

      it(`creates a person with minimum data`, async () => {
        const personInput = {
          name: 'apoorva',
          type: 'person',
          parent: place2._id
        };

        const person = await createPerson(personInput);

        expect(person).excluding([ '_rev', 'reported_date', '_id' ]).to.deep.equal({
          ...personInput,
          type: 'contact',
          contact_type: 'person',
          parent: { _id: place2._id }
        });
        expect(person.reported_date).to.be.a('number');
      });

      it(`throws error for non-person type`, async () => {
        const personInput = {
          name: 'apoorva',
          type: 'clinic',
          parent: contact0._id
        };

        await expect(createPerson(personInput)).to.be.rejectedWith(
          InvalidArgumentError,
          `[${personInput.type}] is not a valid person type.`
        );
      });

      it(`throws error for non-existent parent`, async () => {
        const personInput = {
          name: 'apoorva',
          type: 'person',
          parent: 'invalid-id'
        };

        await expect(createPerson(personInput)).to.be.rejectedWith(
          InvalidArgumentError,
          `Parent contact [${personInput.parent}] not found.`
        );
      });

      it(`throws error for parent type not among allowed parents in settings.contact_types`, async () => {
        const personInput = {
          name: 'apoorva',
          type: 'person',
          parent: contact0._id
        };

        await expect(createPerson(personInput)).to.be.rejectedWith(
          InvalidArgumentError,
          `Parent contact of type [person] is not allowed for type [${personInput.type}].`,
        );
      });
    });

    describe('update', async () => {
      const updatePerson = Person.v1.update(dataContext);
      let originalPerson;

      beforeEach(async () => {
        const doc = personFactory.build({
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
        const { rev } = await utils.saveDoc(doc);
        originalPerson = {
          ...doc,
          _rev: rev
        };
      });

      it(`updates a person`, async () => {
        const updatePersonInput = {
          ...originalPerson,
          name: 'apoorva 2',
          hello: 'world'
        };
        delete updatePersonInput.phone;

        const updatedPerson = await updatePerson(updatePersonInput);

        expect(updatedPerson).excluding(['_rev']).to.deep.equal(updatePersonInput);
      });

      it(`updates a person when lineage data is provided`, async () => {
        const updatePersonInput = {
          ...originalPerson,
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

        const updatedPerson = await updatePerson(updatePersonInput);

        // Given lineage data is returned
        expect(updatedPerson).excludingEvery(['_rev', 'reported_date']).to.deep.equal(updatePersonInput);
        const updatedDoc = await utils.getDoc(originalPerson._id);
        // Doc is written with minified lineage
        expect(updatedDoc).excluding('_rev').to.deep.equal({
          ...updatePersonInput,
          parent: originalPerson.parent
        });
      });

      it(`throws error when updating parent lineage`, async () => {
        const updatePersonInput = {
          ...originalPerson,
          parent: {
            _id: place0._id,
            parent: { _id: place2._id },
          },
        };

        await expect(updatePerson(updatePersonInput)).to.be.rejectedWith(
          InvalidArgumentError,
          `Parent lineage does not match.`,
        );
      });

      [
        ['any document', 'does-not-exist'],
        ['a person', place0._id],
      ].forEach(([test, id]) => {
        it(`throws error when id does not match ${test}`, async () => {
          const updatePersonInput = {
            ...originalPerson,
            _id: id
          };

          await expect(updatePerson(updatePersonInput)).to.be.rejectedWith(
            ResourceNotFoundError,
            `Person record [${id}] not found.`
          );
        });
      });
    });
  });
});
