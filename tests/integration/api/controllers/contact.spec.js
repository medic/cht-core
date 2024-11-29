const utils = require('@utils');
const personFactory = require('@factories/cht/contacts/person');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const {getRemoteDataContext, Qualifier, Contact } = require('@medic/cht-datasource');
const {expect} = require('chai');

describe('Contact API', () => {
  const contact0 = utils.deepFreeze(personFactory.build({ name: 'contact0', role: 'chw' }));
  const contact1 = utils.deepFreeze(personFactory.build({ name: 'contact1', role: 'chw_supervisor' }));
  const contact2 = utils.deepFreeze(personFactory.build({ name: 'contact2', role: 'program_officer' }));
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
  const placeType = 'clinic';
  const clinic1 = utils.deepFreeze(placeFactory.place().build({
    parent: {
      _id: place1._id,
      parent: {
        _id: place2._id
      }
    },
    type: placeType,
    contact: {},
    name: 'clinic1'
  }));
  const clinic2 = utils.deepFreeze(placeFactory.place().build({
    parent: {
      _id: place1._id,
      parent: {
        _id: place2._id
      }
    },
    type: placeType,
    contact: {},
    name: 'clinic2'
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
  const allDocItems = [contact0, contact1, contact2, place0, place1, place2, clinic1, clinic2, patient];
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
  const expectedPeopleIds = expectedPeople.map(person => person._id);
  const expectedPlaces = [place0, clinic1, clinic2];
  const expectedPlacesIds = expectedPlaces.map(place => place._id);

  before(async () => {
    await utils.saveDocs(allDocItems);
    await utils.createUsers([userNoPerms, offlineUser]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([userNoPerms, offlineUser]);
  });

  describe('GET /api/v1/contact/:uuid', async () => {
    const getContact = Contact.v1.get(dataContext);
    const getContactWithLineage = Contact.v1.getWithLineage(dataContext);

    it('returns the person contact matching the provided UUID', async () => {
      const person = await getContact(Qualifier.byUuid(patient._id));
      expect(person).excluding([ '_rev', 'reported_date' ]).to.deep.equal(patient);
    });

    it('returns the place contact matching the provided UUID', async () => {
      const place = await getContact(Qualifier.byUuid(place0._id));
      expect(place).excluding(['_rev', 'reported_date']).to.deep.equal(place0);
    });

    it('returns the person contact with lineage when the withLineage query parameter is provided', async () => {
      const person = await getContactWithLineage(Qualifier.byUuid(patient._id));
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

    it('returns the place contact with lineage when the withLineage query parameter is provided', async () => {
      const place = await getContactWithLineage(Qualifier.byUuid(place0._id));
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

    it('returns null when no contact is found for the UUID', async () => {
      const contact = await getContact(Qualifier.byUuid('invalid-uuid'));
      expect(contact).to.be.null;
    });

    [
      ['does not have can_view_contacts permission', userNoPerms],
      ['is not an online user', offlineUser]
    ].forEach(([description, user]) => {
      it(`throws error when user ${description}`, async () => {
        const opts = {
          path: `/api/v1/contact/${patient._id}`,
          auth: {username: user.username, password: user.password},
        };
        await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
      });
    });
  });

  describe('GET /api/v1/contact/id', async () => {
    const getIdsPage = Contact.v1.getIdsPage(dataContext);
    const fourLimit = 4;
    const twoLimit = 2;
    const cursor = null;
    const invalidContactType = 'invalidPerson';
    const freetext = 'contact';
    const placeFreetext = 'clinic';

    it('returns a page of people type contact ids for no limit and cursor passed', async () => {
      const responsePage = await getIdsPage(Qualifier.byContactType(personType));
      const responsePeople = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePeople).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedPeopleIds);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of place type contact for no limit and cursor passed', async () => {
      const responsePage = await getIdsPage(Qualifier.byContactType(placeType));
      const responsePlaces = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePlaces).excludingEvery(['_rev', 'reported_date'])
        .to.deep.equalInAnyOrder(expectedPlacesIds);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of contact ids for freetext with no limit and cursor passed', async () => {
      const expectedContactIds = [contact0._id, contact1._id, contact2._id];
      const responsePage = await getIdsPage(Qualifier.byFreetext(freetext));
      const responsePeople = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePeople).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedContactIds);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of people type contact ids and freetext for no limit and cursor passed', async () => {
      const responsePage = await getIdsPage({
        ...Qualifier.byContactType(personType),
        ...Qualifier.byFreetext(freetext),
      });
      const expectedContactIds = [contact0._id, contact1._id, contact2._id];
      const responsePeople = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePeople).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedContactIds);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of place type contact with freetext for no limit and cursor passed', async () => {
      const freetext = 'clinic';
      const responsePage = await getIdsPage({
        ...Qualifier.byContactType(placeType),
        ...Qualifier.byFreetext(freetext)
      });
      const responsePlaces = responsePage.data;
      const responseCursor = responsePage.cursor;
      const expectedContactIds = [place0._id, clinic1._id, clinic2._id];

      expect(responsePlaces).excludingEvery(['_rev', 'reported_date'])
        .to.deep.equalInAnyOrder(expectedContactIds);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of people type contact ids when limit and cursor is passed and cursor can be reused', 
      async () => {
        const firstPage = await getIdsPage(Qualifier.byContactType(personType), cursor, fourLimit);
        const secondPage = await getIdsPage(Qualifier.byContactType(personType), firstPage.cursor, fourLimit);

        const allData = [...firstPage.data, ...secondPage.data];

        expect(allData).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedPeopleIds);
        expect(firstPage.data.length).to.be.equal(4);
        expect(secondPage.data.length).to.be.equal(3);
        expect(firstPage.cursor).to.be.equal('4');
        expect(secondPage.cursor).to.be.equal(null);
      });

    it('returns a page of place type contact ids when limit and cursor is passed and cursor can be reused', 
      async () => {
        const firstPage = await getIdsPage(Qualifier.byContactType(placeType), cursor, twoLimit);
        const secondPage = await getIdsPage(Qualifier.byContactType(placeType), firstPage.cursor, twoLimit);

        const allData = [...firstPage.data, ...secondPage.data];

        expect(allData).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedPlacesIds);
        expect(firstPage.data.length).to.be.equal(2);
        expect(secondPage.data.length).to.be.equal(1);
        expect(firstPage.cursor).to.be.equal('2');
        expect(secondPage.cursor).to.be.equal(null);
      });

    it('returns a page of contact ids with freetext when limit and cursor is passed and cursor can be reused',
      async () => {
        const expectedContactIds = [contact0._id, contact1._id, contact2._id];
        const firstPage = await getIdsPage(Qualifier.byFreetext(freetext), cursor, twoLimit);
        const secondPage = await getIdsPage(Qualifier.byFreetext(freetext), firstPage.cursor, twoLimit);

        const allData = [...firstPage.data, ...secondPage.data];

        expect(allData).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedContactIds);
        expect(firstPage.data.length).to.be.equal(2);
        expect(secondPage.data.length).to.be.equal(1);
        expect(firstPage.cursor).to.be.equal('2');
        expect(secondPage.cursor).to.be.equal(null);
      });

    it('returns a page of people type contact ids with freetext when limit and cursor is passed' +
      'and cursor can be reused',
    async () => {
      const firstPage = await getIdsPage({
        ...Qualifier.byContactType(personType),
        ...Qualifier.byFreetext(freetext),
      }, cursor, twoLimit);
      const secondPage = await getIdsPage({
        ...Qualifier.byContactType(personType),
        ...Qualifier.byFreetext(freetext),
      }, firstPage.cursor, twoLimit);
      const expectedContactIds = [contact0._id, contact1._id, contact2._id];

      const allData = [...firstPage.data, ...secondPage.data];

      expect(allData).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedContactIds);
      expect(firstPage.data.length).to.be.equal(2);
      expect(secondPage.data.length).to.be.equal(1);
      expect(firstPage.cursor).to.be.equal('2');
      expect(secondPage.cursor).to.be.equal(null);
    });

    it('returns a page of place type contact ids when limit and cursor is passed and cursor can be reused',
      async () => {
        const firstPage = await getIdsPage({
          ...Qualifier.byContactType(placeType),
          ...Qualifier.byFreetext(placeFreetext),
        }, cursor, twoLimit);
        const secondPage = await getIdsPage({
          ...Qualifier.byContactType(placeType),
          ...Qualifier.byFreetext(placeFreetext),
        }, firstPage.cursor, twoLimit);
        const expectedContactIds = [place0._id, clinic1._id, clinic2._id];

        const allData = [...firstPage.data, ...secondPage.data];

        expect(allData).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedContactIds);
        expect(firstPage.data.length).to.be.equal(2);
        expect(secondPage.data.length).to.be.equal(1);
        expect(firstPage.cursor).to.be.equal('2');
        expect(secondPage.cursor).to.be.equal(null);
      });

    it(`throws error when user does not have can_view_contacts permission`, async () => {
      const opts = {
        path: `/api/v1/contact/id`,
        auth: { username: userNoPerms.username, password: userNoPerms.password },
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it(`throws error when user is not an online user`, async () => {
      const opts = {
        path: `/api/v1/contact/id`,
        auth: { username: offlineUser.username, password: offlineUser.password },
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it('throws 400 error when contactType is invalid', async () => {
      const queryParams = {
        type: invalidContactType
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `/api/v1/contact/id?${queryString}`,
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
        path: `/api/v1/contact/id?${queryString}`,
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(`400 - {"code":400,"error":"The limit must be a positive number: [${-1}]."}`);
    });

    it('throws 400 error when cursor is invalid', async () => {
      const queryParams = {
        type: personType,
        cursor: '-1'
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `/api/v1/contact/id?${queryString}`,
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(
          `400 - {"code":400,"error":"Invalid cursor token: [${-1}]."}`
        );
    });
  });

  describe('Contact.v1.getIdsAll', async () => {
    it('fetches all data by iterating through generator', async () => {
      const docs = [];

      const generator = Contact.v1.getIdsAll(dataContext)(Qualifier.byContactType(personType));

      for await (const doc of generator) {
        docs.push(doc);
      }

      expect(docs).excluding(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedPeopleIds);
    });
  });
});
