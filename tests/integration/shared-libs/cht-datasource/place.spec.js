const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const { getRemoteDataContext, Place, Qualifier } = require('@medic/cht-datasource');
const { expect } = require('chai');
const userFactory = require('@factories/cht/users/users');
const {setAuth, removeAuth} = require('./auth');

describe('cht-datasource Place', () => {
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
  const dataContext = getRemoteDataContext(utils.getOrigin());
  const expectedPlaces = [place0, clinic1, clinic3];

  before(async () => {
    setAuth();
    await utils.saveDocs([contact0, contact1, contact2, place0, place1, place2, clinic1, clinic3, healthCenter2]);
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
        expect(place).excluding([ '_rev', 'reported_date' ]).to.deep.equal(place0);
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
        expect(place).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equal({
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
          expect(place).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equal({
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
          expect(place).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equal({
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

        expect(responsePlaces).excludingEvery([ '_rev', 'reported_date' ])
          .to.deep.equalInAnyOrder(expectedPlaces);
        expect(responseCursor).to.be.equal(null);
      });

      it('returns a page of places for stringified limit and null cursor passed', async () => {
        const responsePage = await getPage(Qualifier.byContactType(placeType), null, stringifiedLimit);
        const responsePlaces = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responsePlaces).excludingEvery([ '_rev', 'reported_date' ])
          .to.deep.equalInAnyOrder(expectedPlaces);
        expect(responseCursor).to.be.equal('3');
      });

      it('returns a page of places when limit and cursor is passed and cursor can be reused', async () => {
        const firstPage = await getPage(Qualifier.byContactType(placeType), cursor, limit);
        const secondPage = await getPage(Qualifier.byContactType(placeType), firstPage.cursor, limit);

        const allPeople = [ ...firstPage.data, ...secondPage.data ];

        expect(allPeople).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedPlaces);
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
        ).to.be.rejectedWith(
          {code: 400, error: `The cursor must be a string or null for first page: [${JSON.stringify(invalidCursor)}].`}
        );
      });
    });

    describe('getAll', async () => {
      it('fetches all data by iterating through generator', async () => {
        const docs = [];

        const generator = Place.v1.getAll(dataContext)(Qualifier.byContactType(placeType));

        for await (const doc of generator) {
          docs.push(doc);
        }

        expect(docs).excluding([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedPlaces);
      });
    });

    describe('create', () => {
      it('creates a place for a valid input', async () => {
        const placeInput = {
          name: 'place-1',
          type: 'place',
          parent: contact0._id,
          contact: contact1._id
        };
        const updatedPlaceInput = {
          ...placeInput, parent: {_id: contact0._id, parent: contact0.parent}, 
          contact: {_id: contact1._id, parent: contact1.parent }
        };
        const placeDoc = await Place.v1.create(dataContext)(placeInput);
        expect(placeDoc).excluding([ '_rev', 'reported_date', '_id' ])
          .to.deep.equal(updatedPlaceInput);
      });
    });

    describe('update', () => {
      it('updates a place for a valid input', async () => {
        const placeInput = {
          name: 'place-1',
          type: 'clinic',
          parent: place1._id,
          contact: contact1._id,
          weather: 'humid'
        };
        const placeDoc = await Place.v1.create(dataContext)(placeInput);
        const updateInput = {
          ...placeDoc, extraField: 'value'
        };
        console.log(placeDoc);
        delete updateInput.weather;

        const updatedPlaceDoc = await Place.v1.update(dataContext)(updateInput);
        expect(updatedPlaceDoc).excluding(['_rev']).to.deep.equal(
          updateInput
        );
      });
    });
  });
});
