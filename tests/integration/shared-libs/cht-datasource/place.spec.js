const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const {
  getRemoteDataContext,
  Place,
  Qualifier,
  InvalidArgumentError,
  ResourceNotFoundError
} = require('@medic/cht-datasource');
const { USER_ROLES, CONTACT_TYPES } = require('@medic/constants');
const userFactory = require('@factories/cht/users/users');
const { setAuth, removeAuth } = require('./auth');
const { expect } = require('chai');

describe('cht-datasource Place', () => {
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
  const dataContext = getRemoteDataContext(utils.getOrigin());
  const expectedPlaces = [place0, clinic1, clinic3];

  const excludedProperties = [ '_rev', 'reported_date', 'patient_id', 'place_id' ];

  before(async () => {
    setAuth();
    await utils.saveDocs([contact0, contact1, contact2, place0, place1, place2, clinic1, clinic3, healthCenter2]);
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
      const getPlace = Place.v1.get(dataContext);

      it('returns the place matching the provided UUID', async () => {
        const place = await getPlace(Qualifier.byUuid(place0._id));
        expect(place).excluding(excludedProperties).to.deep.equal(place0);
      });

      it('returns null when no place is found for the UUID', async () => {
        const place = await getPlace(Qualifier.byUuid('invalid-uuid'));
        expect(place).to.be.null;
      });
    });

    describe('getWithLineage', () => {
      const getPlaceWithLineage = Place.v1.getWithLineage(dataContext);

      it('returns the place with lineage', async () => {
        const place = await getPlaceWithLineage(Qualifier.byUuid(place0._id));
        expect(place).excludingEvery(excludedProperties).to.deep.equal({
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

      it(
        'returns the place when the place has no primary contact',
        async () => {
          const place = await getPlaceWithLineage(Qualifier.byUuid(clinic3._id));
          expect(place).excludingEvery(excludedProperties).to.deep.equal({
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
        }
      );

      it(
        'returns the place when the place has no primary contact and parents',
        async () => {
          const place = await getPlaceWithLineage(Qualifier.byUuid(healthCenter2._id));
          expect(place).excludingEvery(excludedProperties).to.deep.equal({
            ...healthCenter2,
          });
        }
      );
    });

    describe('getPage', async () => {
      const getPage = Place.v1.getPage(dataContext);
      const limit = 2;
      const stringifiedLimit = '3';
      const cursor = null;
      const invalidLimit = 'invalidLimit';
      const invalidCursor = 'invalidCursor';

      it('returns a page of places for no limit and cursor passed', async () => {
        const responsePage = await getPage(Qualifier.byContactType(placeType));
        const responsePlaces = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responsePlaces).excludingEvery(excludedProperties)
          .to.deep.equalInAnyOrder(expectedPlaces);
        expect(responseCursor).to.be.equal(null);
      });

      it('returns a page of places for stringified limit and null cursor passed', async () => {
        const responsePage = await getPage(Qualifier.byContactType(placeType), null, stringifiedLimit);
        const responsePlaces = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responsePlaces).excludingEvery(excludedProperties)
          .to.deep.equalInAnyOrder(expectedPlaces);
        expect(responseCursor).to.be.equal('3');
      });

      it('returns a page of places when limit and cursor is passed and cursor can be reused', async () => {
        const firstPage = await getPage(Qualifier.byContactType(placeType), cursor, limit);
        const secondPage = await getPage(Qualifier.byContactType(placeType), firstPage.cursor, limit);

        const allPeople = [ ...firstPage.data, ...secondPage.data ];

        expect(allPeople).excludingEvery(excludedProperties).to.deep.equalInAnyOrder(expectedPlaces);
        expect(firstPage.data.length).to.be.equal(2);
        expect(secondPage.data.length).to.be.equal(1);
        expect(firstPage.cursor).to.be.equal('2');
        expect(secondPage.cursor).to.be.equal(null);
      });

      it('throws error when limit is invalid', async () => {
        await expect(
          getPage(Qualifier.byContactType(placeType), cursor, invalidLimit)
        ).to.be.rejectedWith(
          `The limit must be a positive integer: [${JSON.stringify(invalidLimit)}].`
        );
      });

      it('throws error when cursor is invalid', async () => {
        await expect(
          getPage({
            ...Qualifier.byContactType(placeType),
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

        const generator = Place.v1.getAll(dataContext)(Qualifier.byContactType(placeType));

        for await (const doc of generator) {
          docs.push(doc);
        }

        expect(docs).excluding(excludedProperties).to.deep.equalInAnyOrder(expectedPlaces);
      });
    });

    describe('create', () => {
      const createPlace = Place.v1.create(dataContext);

      it('creates place for valid input', async () => {
        const input = {
          type: 'clinic',
          name: 'place-1',
          parent: place1._id,
          contact: contact0._id,
          reported_date: 1770397800,
          hello: 'world'
        };

        const placeDoc = await createPlace(input);

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

        const placeDoc = await createPlace(input);

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

        await expect(createPlace(body)).to.be.rejectedWith(
          InvalidArgumentError,
          `[${body.type}] is not a valid place type.`
        );
      });

      it(`throws error for non-existent parent`, async () => {
        const body = {
          type: 'clinic',
          name: 'place-1',
          parent: 'invalid-id'
        };

        await expect(createPlace(body)).to.be.rejectedWith(
          InvalidArgumentError,
          `Parent contact [${body.parent}] not found.`
        );
      });

      it(`throws error for non-existent contact`, async () => {
        const body = {
          type: CONTACT_TYPES.DISTRICT_HOSPITAL,
          name: 'place-1',
          contact: 'invalid-id'
        };

        await expect(createPlace(body)).to.be.rejectedWith(
          InvalidArgumentError,
          `Primary contact [${body.contact}] not found.`
        );
      });

      it(`throws error for parent type not among allowed parents in settings.contact_types`, async () => {
        const body = {
          type: 'health_center',
          name: 'place-1',
          parent: place1._id,
        };

        await expect(createPlace(body)).to.be.rejectedWith(
          InvalidArgumentError,
          `Parent contact of type [health_center] is not allowed for type [${body.type}].`
        );
      });
    });

    describe('update', () => {
      const updatePlace = Place.v1.update(dataContext);
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

        const updatedPlace = await updatePlace(body);

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

        const updatedPlace = await updatePlace(body);

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

        const updatedPlace = await updatePlace(body);

        expect(updatedPlace).excluding([ '_rev' ]).to.deep.equal(body);
      });

      it(`throws error when updating parent lineage`, async () => {
        const body = {
          ...originalPlace,
          parent: {
            _id: place1._id,
            parent: { _id: place0._id },
          },
        };

        await expect(updatePlace(body)).to.be.rejectedWith(
          InvalidArgumentError,
          `Parent lineage does not match.`
        );
      });

      [
        ['any document', 'does-not-exist'],
        ['a place', contact0._id],
      ].forEach(([test, id]) => {
        it(`throws error when id does not match ${test}`, async () => {
          const body = {
            ...originalPlace,
            _id: id
          };

          await expect(updatePlace(body)).to.be.rejectedWith(
            ResourceNotFoundError,
            `Place record [${id}] not found.`
          );
        });
      });

      it('throws error when updating with invalid contact lineage', async () => {
        const body = {
          ...originalPlace,
          contact: {
            _id: place0._id,
            parent: { _id: place2._id }
          },
        };

        await expect(updatePlace(body)).to.be.rejectedWith(
          InvalidArgumentError,
          `The given contact lineage does not match the current lineage for that contact.`
        );
      });

      it('throws error when updating with a non-existent contact', async () => {
        const body = {
          ...originalPlace,
          contact: 'invalid-id',
        };

        await expect(updatePlace(body)).to.be.rejectedWith(
          InvalidArgumentError,
          `No valid contact found for [invalid-id].`
        );
      });
    });
  });
});
