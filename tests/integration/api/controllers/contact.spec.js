const utils = require('@utils');
const personFactory = require('@factories/cht/contacts/person');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const {expect} = require('chai');

describe('Contact API', () => {
  // just a random string to be added to every doc so that it can be used to retrieve all the docs
  const commonWord = 'freetext';
  const contact0 = utils.deepFreeze(personFactory.build({ name: 'contact0', role: 'chw', notes: commonWord }));
  const contact1 = utils.deepFreeze(personFactory.build({
    name: 'contact1',
    role: 'chw_supervisor',
    notes: commonWord
  }));
  const contact2 = utils.deepFreeze(personFactory.build({
    name: 'contact2',
    role: 'program_officer',
    notes: commonWord
  }));
  const placeMap = utils.deepFreeze(placeFactory.generateHierarchy());
  const place1 = utils.deepFreeze({
    ...placeMap.get('health_center'),
    contact: { _id: contact1._id },
    notes: commonWord
  });
  const place2 = utils.deepFreeze({
    ...placeMap.get('district_hospital'),
    contact: { _id: contact2._id },
    notes: commonWord
  });
  const place0 = utils.deepFreeze({
    ...placeMap.get('clinic'),
    notes: commonWord,
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
    const endpoint = '/api/v1/contact';

    it('returns the person contact matching the provided UUID', async () => {
      const opts = {
        path: `${endpoint}/${patient._id}`,
      };
      const person = await utils.request(opts);
      expect(person).excluding([ '_rev', 'reported_date' ]).to.deep.equal(patient);
    });

    it('returns the place contact matching the provided UUID', async () => {
      const opts = {
        path: `${endpoint}/${place0._id}`,
      };
      const place = await utils.request(opts);
      expect(place).excluding(['_rev', 'reported_date']).to.deep.equal(place0);
    });

    it('returns the person contact with lineage when the withLineage query parameter is provided', async () => {
      const opts = {
        path: `${endpoint}/${patient._id}?with_lineage=true`,
      };
      const person = await utils.request(opts);
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
      const opts = {
        path: `${endpoint}/${place0._id}?with_lineage=true`,
      };
      const place = await utils.request(opts);
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

    it('throws 404 error when no contact is found for the UUID', async () => {
      const opts = {
        path: `${endpoint}/invalid-uuid`,
      };
      await expect(utils.request(opts)).to.be.rejectedWith('404 - {"code":404,"error":"Contact not found"}');
    });

    [
      ['does not have can_view_contacts permission', userNoPerms],
      ['is not an online user', offlineUser]
    ].forEach(([description, user]) => {
      it(`throws error when user ${description}`, async () => {
        const opts = {
          path: `${endpoint}/${patient._id}`,
          auth: {username: user.username, password: user.password},
        };
        await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
      });
    });
  });

  describe('GET /api/v1/contact/uuid', async () => {
    const fourLimit = 4;
    const threeLimit = 3;
    const twoLimit = 2;
    const invalidContactType = 'invalidPerson';
    const freetext = 'freetext';
    const placeFreetext = 'clinic';
    const endpoint = '/api/v1/contact/uuid';

    it('returns a page of people type contact ids for no limit and cursor passed', async () => {
      const queryParams = {
        type: personType
      };
      const stringQueryParams = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `${endpoint}?${stringQueryParams}`,
      };
      const responsePage = await utils.request(opts);
      const responsePeople = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePeople).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedPeopleIds);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of place type contact for no limit and cursor passed', async () => {
      const queryParams = {
        type: placeType
      };
      const stringQueryParams = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `${endpoint}?${stringQueryParams}`,
      };
      const responsePage = await utils.request(opts);
      const responsePlaces = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePlaces).excludingEvery(['_rev', 'reported_date'])
        .to.deep.equalInAnyOrder(expectedPlacesIds);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of contact ids for freetext with no limit and cursor passed', async () => {
      const queryParams = {
        freetext
      };
      const stringQueryParams = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `${endpoint}?${stringQueryParams}`,
      };
      const expectedContactIds = [contact0._id, contact1._id, contact2._id, place0._id, place1._id, place2._id];

      const responsePage = await utils.request(opts);
      const responsePeople = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePeople).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedContactIds);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of people type contact ids and freetext for no limit and cursor passed', async () => {
      const queryParams = {
        type: personType,
        freetext
      };
      const stringQueryParams = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `${endpoint}?${stringQueryParams}`,
      };
      const expectedContactIds = [contact0._id, contact1._id, contact2._id];

      const responsePage = await utils.request(opts);
      const responsePeople = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePeople).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedContactIds);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of place type contact with freetext for no limit and cursor passed', async () => {
      const queryParams = {
        type: placeType,
        freetext: placeFreetext
      };
      const stringQueryParams = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `${endpoint}?${stringQueryParams}`,
      };
      const expectedContactIds = [place0._id, clinic1._id, clinic2._id];

      const responsePage = await utils.request(opts);
      const responsePlaces = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePlaces).excludingEvery(['_rev', 'reported_date'])
        .to.deep.equalInAnyOrder(expectedContactIds);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of people type contact ids when limit and cursor is passed and cursor can be reused',
      async () => {
        // first request
        const queryParams = {
          type: personType,
          limit: fourLimit
        };
        let stringQueryParams = new URLSearchParams(queryParams).toString();
        const opts = {
          path: `${endpoint}?${stringQueryParams}`,
        };
        const firstPage = await utils.request(opts);

        // second request
        queryParams.cursor = firstPage.cursor;
        stringQueryParams = new URLSearchParams(queryParams).toString();
        const opts2 = {
          path: `${endpoint}?${stringQueryParams}`,
        };
        const secondPage = await utils.request(opts2);

        const allData = [...firstPage.data, ...secondPage.data];

        expect(allData).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedPeopleIds);
        expect(firstPage.data.length).to.be.equal(4);
        expect(secondPage.data.length).to.be.equal(3);
        expect(firstPage.cursor).to.be.equal('4');
        expect(secondPage.cursor).to.be.equal(null);
      });

    it('returns a page of place type contact ids when limit and cursor is passed and cursor can be reused',
      async () => {
        // first request
        const queryParams = {
          type: placeType,
          limit: twoLimit
        };
        let stringQueryParams = new URLSearchParams(queryParams).toString();
        const opts = {
          path: `${endpoint}?${stringQueryParams}`,
        };
        const firstPage = await utils.request(opts);

        // second request
        queryParams.cursor = firstPage.cursor;
        stringQueryParams = new URLSearchParams(queryParams).toString();
        const opts2 = {
          path: `${endpoint}?${stringQueryParams}`,
        };
        const secondPage = await utils.request(opts2);

        const allData = [...firstPage.data, ...secondPage.data];

        expect(allData).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedPlacesIds);
        expect(firstPage.data.length).to.be.equal(2);
        expect(secondPage.data.length).to.be.equal(1);
        expect(firstPage.cursor).to.be.equal('2');
        expect(secondPage.cursor).to.be.equal(null);
      });

    it('returns a page of contact ids with freetext when limit and cursor is passed and cursor can be reused',
      async () => {
        // first request
        const expectedContactIds = [contact0._id, contact1._id, contact2._id, place0._id, place1._id, place2._id];
        const queryParams = {
          freetext,
          limit: threeLimit
        };
        let stringQueryParams = new URLSearchParams(queryParams).toString();
        const opts = {
          path: `${endpoint}?${stringQueryParams}`,
        };
        const firstPage = await utils.request(opts);

        // second request
        queryParams.cursor = firstPage.cursor;
        stringQueryParams = new URLSearchParams(queryParams).toString();
        const opts2 = {
          path: `${endpoint}?${stringQueryParams}`,
        };
        const secondPage = await utils.request(opts2);

        const allData = [...firstPage.data, ...secondPage.data];

        expect(allData).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedContactIds);
        expect(firstPage.data.length).to.be.equal(3);
        expect(secondPage.data.length).to.be.equal(3);
        expect(firstPage.cursor).to.be.equal('3');
        expect(secondPage.cursor).to.be.equal(null);
      });

    it('returns a page of people type contact ids with freetext when limit and cursor is passed' +
      'and cursor can be reused',
    async () => {
      // first request
      const expectedContactIds = [contact0._id, contact1._id, contact2._id];
      const queryParams = {
        freetext,
        type: personType,
        limit: twoLimit
      };
      let stringQueryParams = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `${endpoint}?${stringQueryParams}`,
      };
      const firstPage = await utils.request(opts);

      // second request
      queryParams.cursor = firstPage.cursor;
      stringQueryParams = new URLSearchParams(queryParams).toString();
      const opts2 = {
        path: `${endpoint}?${stringQueryParams}`,
      };
      const secondPage = await utils.request(opts2);

      const allData = [...firstPage.data, ...secondPage.data];

      expect(allData).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedContactIds);
      expect(firstPage.data.length).to.be.equal(2);
      expect(secondPage.data.length).to.be.equal(1);
      expect(firstPage.cursor).to.be.equal('2');
      expect(secondPage.cursor).to.be.equal(null);
    });

    it('returns a page of place type contact ids when limit and cursor is passed and cursor can be reused',
      async () => {
        // first request
        const expectedContactIds = [place0._id, clinic1._id, clinic2._id];
        const queryParams = {
          freetext: placeFreetext,
          type: placeType,
          limit: twoLimit
        };
        let stringQueryParams = new URLSearchParams(queryParams).toString();
        const opts = {
          path: `${endpoint}?${stringQueryParams}`,
        };
        const firstPage = await utils.request(opts);

        // second request
        queryParams.cursor = firstPage.cursor;
        stringQueryParams = new URLSearchParams(queryParams).toString();
        const opts2 = {
          path: `${endpoint}?${stringQueryParams}`,
        };
        const secondPage = await utils.request(opts2);

        const allData = [...firstPage.data, ...secondPage.data];

        expect(allData).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedContactIds);
        expect(firstPage.data.length).to.be.equal(2);
        expect(secondPage.data.length).to.be.equal(1);
        expect(firstPage.cursor).to.be.equal('2');
        expect(secondPage.cursor).to.be.equal(null);
      });

    it(`throws error when user does not have can_view_contacts permission`, async () => {
      const opts = {
        path: endpoint,
        auth: { username: userNoPerms.username, password: userNoPerms.password },
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it(`throws error when user is not an online user`, async () => {
      const opts = {
        path: endpoint,
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
        path: `${endpoint}?${queryString}`,
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(`400 - {"code":400,"error":"Invalid contact type [${invalidContactType}]."}`);
    });

    it('should 400 error when freetext is invalid', async () => {
      const queryParams = {
        freetext: ' '
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `${endpoint}?${queryString}`,
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(`400 - {"code":400,"error":"Invalid freetext [\\" \\"]."}`);
    });

    it('throws 400 error when limit is invalid', async () => {
      const queryParams = {
        type: personType,
        limit: -1
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `${endpoint}?${queryString}`,
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
        path: `${endpoint}?${queryString}`,
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(
          `400 - {"code":400,"error":"Invalid cursor token: [${-1}]."}`
        );
    });
  });
});
