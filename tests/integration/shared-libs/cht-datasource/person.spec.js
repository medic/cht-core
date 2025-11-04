const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const { getRemoteDataContext, Person, Qualifier } = require('@medic/cht-datasource');
const { expect } = require('chai');
const userFactory = require('@factories/cht/users/users');
const {setAuth, removeAuth} = require('./auth');

describe('cht-datasource Person', () => {
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
    setAuth();
    await utils.saveDocs(allDocItems);
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
        expect(person).excluding([ '_rev', 'reported_date' ]).to.deep.equal(patient);
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
        expect(person).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equal({
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

        expect(responsePeople).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedPeople);
        expect(responseCursor).to.be.equal(null);
      });

      it('returns a page of people for stringified limit and null cursor passed', async () => {
        const responsePage = await getPage(Qualifier.byContactType(personType), null, stringifiedLimit);
        const responsePeople = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responsePeople).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedPeople);
        expect(responseCursor).to.be.equal('7');
      });

      it('returns a page of people when limit and cursor is passed and cursor can be reused', async () => {
        const firstPage = await getPage(Qualifier.byContactType(personType), cursor, limit);
        const secondPage = await getPage(Qualifier.byContactType(personType), firstPage.cursor, limit);

        const allPeople = [ ...firstPage.data, ...secondPage.data ];

        expect(allPeople).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedPeople);
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
          '{"code":400,"error":"The cursor must be a string or null for first page: [\\"invalidCursor\\"]."}'
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

        expect(docs).excluding([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedPeople);
      });
    });

    describe('create', () => {
      const createPerson = Person.v1.create(dataContext);

      it('creates person with minimal data', async () => {
        const person = await createPerson({
          type: personType,
          name: 'Test Person Created',
          parent: { _id: place0._id }
        });

        expect(person).to.have.property('_id');
        expect(person).to.have.property('_rev');
        expect(person).to.have.property('reported_date');
        expect(person.type).to.equal(personType);
        expect(person.name).to.equal('Test Person Created');
      });

      it('creates person with reported_date', async () => {
        const timestamp = 1234567890;
        const person = await createPerson({
          type: personType,
          name: 'Person with Date',
          reported_date: timestamp,
          parent: { _id: place0._id }
        });

        expect(person).to.have.property('_id');
        expect(person.reported_date).to.equal(timestamp);
      });

      it('creates person with parent', async () => {
        const person = await createPerson({
          type: personType,
          name: 'Person with Parent',
          parent: { _id: place0._id }
        });

        expect(person).to.have.property('_id');
        expect(person.parent).to.have.property('_id', place0._id);
      });

      it('auto-generates _id when not provided', async () => {
        const person = await createPerson({
          type: personType,
          name: 'Auto ID Person',
          parent: { _id: place0._id }
        });

        expect(person).to.have.property('_id');
        expect(person._id).to.be.a('string');
        expect(person._id.length).to.be.greaterThan(0);
      });

      it('auto-generates reported_date when not provided', async () => {
        const beforeTimestamp = Date.now();
        const person = await createPerson({
          type: personType,
          name: 'Auto Date Person',
          parent: { _id: place0._id }
        });
        const afterTimestamp = Date.now();

        expect(person).to.have.property('reported_date');
        expect(person.reported_date).to.be.at.least(beforeTimestamp);
        expect(person.reported_date).to.be.at.most(afterTimestamp);
      });

      it('validates person type', async () => {
        await expect(createPerson({
          type: 'invalid-type',
          name: 'Invalid Type'
        })).to.be.rejectedWith('Invalid person type');
      });

      it('throws error when _rev is provided', async () => {
        await expect(createPerson({
          type: personType,
          name: 'Person with Rev',
          _rev: '1-abc',
          parent: { _id: place0._id }
        })).to.be.rejectedWith('_rev is not allowed for create operations');
      });

      it('throws error when parent document does not exist', async () => {
        await expect(createPerson({
          type: personType,
          name: 'Person with Invalid Parent',
          parent: { _id: 'non-existent-uuid' }
        })).to.be.rejected;
      });

      it('returns created person with full data', async () => {
        const person = await createPerson({
          type: personType,
          name: 'Full Data Person',
          phone: '1234567890',
          parent: { _id: place0._id }
        });

        expect(person).to.have.property('_id');
        expect(person).to.have.property('_rev');
        expect(person).to.have.property('reported_date');
        expect(person.type).to.equal(personType);
        expect(person.name).to.equal('Full Data Person');
        expect(person.phone).to.equal('1234567890');
      });
    });

    describe('update', () => {
      const createPerson = Person.v1.create(dataContext);
      const updatePerson = Person.v1.update(dataContext);
      let createdPerson;

      beforeEach(async () => {
        createdPerson = await createPerson({
          type: personType,
          name: 'Person to Update',
          phone: '1234567890',
          parent: { _id: place0._id }
        });
      });

      it('updates person successfully', async () => {
        const updated = await updatePerson({
          ...createdPerson,
          name: 'Updated Person Name',
          phone: '0987654321'
        });

        expect(updated._id).to.equal(createdPerson._id);
        expect(updated._rev).to.not.equal(createdPerson._rev);
        expect(updated.name).to.equal('Updated Person Name');
        expect(updated.phone).to.equal('0987654321');
      });

      it('maintains immutable fields', async () => {
        const updated = await updatePerson({
          ...createdPerson,
          name: 'Updated Name'
        });

        expect(updated.type).to.equal(createdPerson.type);
        expect(updated.reported_date).to.equal(createdPerson.reported_date);
      });

      it('throws error when _id is missing', async () => {
        const personWithoutId = { ...createdPerson };
        delete personWithoutId._id;

        await expect(updatePerson(personWithoutId))
          .to.be.rejectedWith('Resource not found: undefined');
      });

      it('throws error when _rev is missing', async () => {
        const personWithoutRev = { ...createdPerson };
        delete personWithoutRev._rev;

        await expect(updatePerson(personWithoutRev))
          .to.be.rejectedWith('_rev is required for update operations');
      });

      it('throws error when document does not exist', async () => {
        await expect(updatePerson({
          _id: 'non-existent-uuid',
          _rev: '1-abc',
          type: personType,
          name: 'Updated Name'
        })).to.be.rejected;
      });

      it('throws error when trying to change type', async () => {
        await expect(updatePerson({
          ...createdPerson,
          type: 'different-type'
        })).to.be.rejected;
      });

      it('throws error when trying to change reported_date', async () => {
        await expect(updatePerson({
          ...createdPerson,
          reported_date: createdPerson.reported_date + 1000
        })).to.be.rejected;
      });

      it('returns updated person with new _rev', async () => {
        const updated = await updatePerson({
          ...createdPerson,
          name: 'Updated Name'
        });

        expect(updated).to.have.property('_id', createdPerson._id);
        expect(updated).to.have.property('_rev');
        expect(updated._rev).to.not.equal(createdPerson._rev);
        expect(updated.name).to.equal('Updated Name');
      });
    });
  });
});
