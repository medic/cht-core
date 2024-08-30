const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const { getRemoteDataContext, Place, Qualifier } = require('@medic/cht-datasource');
const { expect } = require('chai');
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
    parent: {
      _id: place1._id,
      parent: {
        _id: place2._id
      }
    },
    type: placeType,
    contact: {}
  }));
  const clinic2 = utils.deepFreeze(placeFactory.place().build({
    parent: {
      _id: place1._id,
      parent: {
        _id: place2._id
      }
    },
    type: placeType,
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
  const expectedPlaces = [place0, clinic1, clinic2];

  before(async () => {
    await utils.saveDocs([contact0, contact1, contact2, place0, place1, place2, clinic1, clinic2]);
    await utils.createUsers([userNoPerms, offlineUser]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([userNoPerms, offlineUser]);
  });

  describe('GET /api/v1/place/:uuid', async () => {
    const getPlace = Place.v1.get(dataContext);
    const getPlaceWithLineage = Place.v1.getWithLineage(dataContext);

    it('returns the place matching the provided UUID', async () => {
      const place = await getPlace(Qualifier.byUuid(place0._id));
      expect(place).excluding(['_rev', 'reported_date']).to.deep.equal(place0);
    });

    it('returns the place with lineage when the withLineage query parameter is provided', async () => {
      const place = await getPlaceWithLineage(Qualifier.byUuid(place0._id));
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

    it('returns null when no place is found for the UUID', async () => {
      const place = await getPlace(Qualifier.byUuid('invalid-uuid'));
      expect(place).to.be.null;
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
    const getPage = Place.v1.getPage(dataContext);
    const limit = 2;
    const cursor = null;
    const invalidContactType = 'invalidPlace';

    it('returns a page of places for no limit and cursor passed', async () => {
      const responsePage = await getPage(Qualifier.byContactType(placeType));
      const responsePlaces = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePlaces).excludingEvery(['_rev', 'reported_date'])
        .to.deep.equalInAnyOrder([place0, clinic1,, clinic2]);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of places when limit and cursor is passed and cursor can be reused', async () => {
      const firstPage = await getPage(Qualifier.byContactType(placeType), cursor, limit);
      const secondPage = await getPage(Qualifier.byContactType(placeType), firstPage.cursor, limit);

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

      await expect(utils.request(opts))
        .to.be.rejectedWith(`400 - {"code":400,"error":"The limit must be a positive number: [${-1}]."}`);
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
          `400 - {"code":400,"error":"Invalid cursor token: [${-1}]."}`
        );
    });
  });

  describe('Place.v1.getAll', async () => {
    it('fetches all data by iterating through generator', async () => {
      const docs = [];

      const generator = Place.v1.getAll(dataContext)(Qualifier.byContactType(placeType));

      for await (const doc of generator) {
        docs.push(doc);
      }

      expect(docs).excluding(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedPlaces);
    });
  });
});
