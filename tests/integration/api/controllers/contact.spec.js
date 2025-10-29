const utils = require('@utils');
const personFactory = require('@factories/cht/contacts/person');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const { expect } = require('chai');

describe('Contact API', () => {
  // NOTE: this is a common word added to contacts to fetch them
  const commonWord = 'contact';
  // NOTE: this is a search word added to contacts for searching purposes
  // the value was chosen such that it is a sub-string of the short_name which
  // gives double output from the couchdb view
  const searchWord = 'freetext';
  // the fields `search` and `short_name` exist for the unique search by freetext based searching
  // whereas the `name` field is for just simple searching
  // combining them to have similar text is not done here because the order in which the docs
  // were being returned were not consistent, meaning the order could be [contact0, contact1, contact2]
  // in the first run whereas another in another giving a non-consistent expected value to match against
  const contact0 = utils.deepFreeze(personFactory.build({
    name: 'contact0', role: 'chw', notes: searchWord, short_name: searchWord + '0'
  }));
  const contact1 = utils.deepFreeze(personFactory.build({
    name: 'contact1',
    role: 'chw_supervisor',
    notes: searchWord,
    short_name: searchWord + '1'
  }));
  const contact2 = utils.deepFreeze(personFactory.build({
    name: 'contact2',
    role: 'program_officer',
    notes: searchWord,
    short_name: searchWord + '2'
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
    roles: [ 'mm-online' ]
  }));
  const offlineUser = utils.deepFreeze(userFactory.build({
    username: 'offline-has-perms',
    place: place0._id,
    contact: {
      _id: 'fixture:user:offline-has-perms',
      name: 'Offline User',
    },
    roles: [ 'chw' ]
  }));
  const allDocItems = [ contact0, contact1, contact2, place0, place1, place2, clinic1, clinic2, patient ];
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
  const expectedPlaces = [ place0, clinic1, clinic2 ];
  const expectedPlacesIds = expectedPlaces.map(place => place._id);

  before(async () => {
    await utils.saveDocs(allDocItems);
    await utils.createUsers([ userNoPerms, offlineUser ]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([ userNoPerms, offlineUser ]);
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
      expect(place).excluding([ '_rev', 'reported_date' ]).to.deep.equal(place0);
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

    it('throws 404 error when no contact is found for the UUID', async () => {
      const opts = {
        path: `${endpoint}/invalid-uuid`,
      };
      await expect(utils.request(opts)).to.be.rejectedWith('404 - {"code":404,"error":"Contact not found"}');
    });

    [
      [ 'does not have can_view_contacts permission', userNoPerms ],
      [ 'is not an online user', offlineUser ]
    ].forEach(([ description, user ]) => {
      it(`throws error when user ${description}`, async () => {
        const opts = {
          path: `${endpoint}/${patient._id}`,
          auth: { username: user.username, password: user.password },
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
    const freetext = 'contact';
    const placeFreetext = 'clinic';
    const endpoint = '/api/v1/contact/uuid';
    const emptyNouveauCursor = 'W10=';

    it('returns a page of people type contact ids for no limit and cursor passed', async () => {
      const opts = {
        path: `${endpoint}`,
        qs: {
          type: personType
        }
      };
      const responsePage = await utils.request(opts);
      const responsePeople = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePeople).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedPeopleIds);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of place type contact for no limit and cursor passed', async () => {
      const opts = {
        path: `${endpoint}`,
        qs: {
          type: placeType
        }
      };
      const responsePage = await utils.request(opts);
      const responsePlaces = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePlaces).excludingEvery([ '_rev', 'reported_date' ])
        .to.deep.equalInAnyOrder(expectedPlacesIds);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of contact ids for freetext with no limit and cursor passed', async () => {
      const opts = {
        path: `${endpoint}`,
        qs: {
          freetext
        }
      };
      const expectedContactIds = [ contact0._id, contact1._id, contact2._id, place0._id, place1._id, place2._id ];

      const responsePage = await utils.request(opts);
      const responsePeople = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePeople).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedContactIds);
      // W10= is the base64 encoded version of '[]' which means no results were found for the given query
      // that needs to be false given that we are expecting a list of contact ids above
      // the bookmark value is calculated on the basis of the returned values, but it also contains some extra
      // numbers which seem arbitrary at the moment. If those numbers are figured out then, update these tests
      expect(responseCursor).to.not.equal(emptyNouveauCursor);
    });

    it('returns a page of people type contact ids and freetext for no limit and cursor passed', async () => {
      const opts = {
        path: `${endpoint}`,
        qs: {
          type: personType,
          freetext
        }
      };
      const expectedContactIds = [ contact0._id, contact1._id, contact2._id ];

      const responsePage = await utils.request(opts);
      const responsePeople = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePeople).to.deep.equalInAnyOrder(expectedContactIds);
      expect(responseCursor).to.not.equal(emptyNouveauCursor);
    });

    it('returns a page of place type contact with freetext for no limit and cursor passed', async () => {
      const opts = {
        path: `${endpoint}`,
        qs: {
          type: placeType,
          freetext: placeFreetext
        }
      };
      const expectedContactIds = [ place0._id, clinic1._id, clinic2._id ];

      const responsePage = await utils.request(opts);
      const responsePlaces = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePlaces).to.deep.equalInAnyOrder(expectedContactIds);
      expect(responseCursor).to.not.equal(emptyNouveauCursor);
    });

    it(
      'returns a page of people type contact ids when limit and cursor is passed and cursor can be reused',
      async () => {
        const qs = {
          type: personType,
          limit: fourLimit
        };
        // first request
        const opts = {
          path: `${endpoint}`,
          qs
        };
        const firstPage = await utils.request(opts);

        // second request
        qs.cursor = firstPage.cursor;
        const opts2 = {
          path: `${endpoint}`,
          qs
        };
        const secondPage = await utils.request(opts2);

        const allData = [ ...firstPage.data, ...secondPage.data ];

        expect(allData).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedPeopleIds);
        expect(firstPage.data.length).to.be.equal(4);
        expect(secondPage.data.length).to.be.equal(3);
        expect(firstPage.cursor).to.be.equal('4');
        expect(secondPage.cursor).to.be.equal(null);
      }
    );

    it(
      'returns a page of place type contact ids when limit and cursor is passed and cursor can be reused',
      async () => {
        // first request
        const qs = {
          type: placeType,
          limit: twoLimit
        };
        const opts = {
          path: `${endpoint}`,
          qs
        };
        const firstPage = await utils.request(opts);

        // second request
        qs.cursor = firstPage.cursor;
        const opts2 = {
          path: `${endpoint}`,
          qs
        };
        const secondPage = await utils.request(opts2);

        const allData = [ ...firstPage.data, ...secondPage.data ];

        expect(allData).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedPlacesIds);
        expect(firstPage.data.length).to.be.equal(2);
        expect(secondPage.data.length).to.be.equal(1);
        expect(firstPage.cursor).to.be.equal('2');
        expect(secondPage.cursor).to.be.equal(null);
      }
    );

    it(
      'returns a page of contact ids with freetext when limit and cursor is passed and cursor can be reused',
      async () => {
        // first request
        const expectedContactIds = [ contact0._id, contact1._id, contact2._id, place0._id, place1._id, place2._id ];
        const qs = {
          freetext,
          limit: threeLimit
        };
        const opts = {
          path: `${endpoint}`,
          qs
        };
        const firstPage = await utils.request(opts);

        // second request
        qs.cursor = firstPage.cursor;
        const opts2 = {
          path: `${endpoint}`,
          qs
        };
        const secondPage = await utils.request(opts2);

        const allData = [ ...firstPage.data, ...secondPage.data ];

        expect(allData).to.deep.equalInAnyOrder(expectedContactIds);
        expect(firstPage.data.length).to.be.equal(3);
        expect(secondPage.data.length).to.be.equal(3);
        expect(firstPage.cursor).to.not.equal(emptyNouveauCursor);
        expect(secondPage.cursor).to.not.equal(emptyNouveauCursor);
      });

    it(
      'returns a page of people type contact ids with freetext when limit and cursor is passed ' +
      'and cursor can be reused',
      async () => {
        // first request
        const expectedContactIds = [ contact0._id, contact1._id, contact2._id ];
        const qs = {
          freetext,
          type: personType,
          limit: twoLimit
        };
        const opts = {
          path: `${endpoint}`,
          qs
        };
        const firstPage = await utils.request(opts);

        // second request
        qs.cursor = firstPage.cursor;
        const opts2 = {
          path: `${endpoint}`,
          qs
        };
        const secondPage = await utils.request(opts2);

        const allData = [ ...firstPage.data, ...secondPage.data ];

        expect(allData).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedContactIds);
        expect(firstPage.data.length).to.be.equal(2);
        expect(secondPage.data.length).to.be.equal(1);
        expect(firstPage.cursor).to.be.equal('2');
        expect(secondPage.cursor).to.be.equal(null);
      }
    );

    it(
      'returns a page of place type contact ids when limit and cursor is passed and cursor can be reused',
      async () => {
        // first request
        const expectedContactIds = [ place0._id, clinic1._id, clinic2._id ];
        const qs = {
          freetext: placeFreetext,
          type: placeType,
          limit: twoLimit
        };
        const opts = {
          path: `${endpoint}`,
          qs
        };
        const firstPage = await utils.request(opts);

        // second request
        qs.cursor = firstPage.cursor;
        const opts2 = {
          path: `${endpoint}`,
          qs
        };
        const secondPage = await utils.request(opts2);

        const allData = [ ...firstPage.data, ...secondPage.data ];

        expect(allData).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedContactIds);
        expect(firstPage.data.length).to.be.equal(2);
        expect(secondPage.data.length).to.be.equal(1);
        expect(firstPage.cursor).to.not.equal('W10=');
        expect(secondPage.cursor).to.not.equal('W10=');
      });

    it('returns a page of unique contact ids for when multiple fields match the same freetext', async () => {
      const expectedContactIds = [ contact0._id, contact1._id, contact2._id ];
      const qs = {
        freetext: searchWord,
      };
      const opts = {
        path: `${endpoint}`,
        qs
      };
      const responsePage = await utils.request(opts);
      const responseIds = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responseIds).to.deep.equalInAnyOrder(expectedContactIds);
      expect(responseCursor).to.not.equal('W10=');
    });

    it(
      'returns a page of unique contact ids for when multiple fields match the same freetext with limit',
      async () => {
        const expectedContactIds = [ contact0._id, contact1._id, contact2._id ];
        // NOTE: adding a limit of 4 to deliberately fetch 4 contacts with the given search word
        // and enforce re-fetching logic
        const qs = {
          freetext: searchWord,
          limit: fourLimit
        };
        const opts = {
          path: `${endpoint}`,
          qs
        };
        const responsePage = await utils.request(opts);
        const responseIds = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responseIds).to.deep.equalInAnyOrder(expectedContactIds);
        expect(responseCursor).to.not.equal('W10=');
      });

    it(
      'returns a page of unique contact ids for when multiple fields match the same freetext with lower limit',
      async () => {
        const qs = {
          freetext: searchWord,
          limit: twoLimit
        };
        const expectedContactIds = [ contact0._id, contact1._id, contact2._id ];
        const opts = {
          path: `${endpoint}`,
          qs
        };
        const responsePage = await utils.request(opts);
        const responseIds = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responseIds.length).to.be.equal(2);
        expect(responseCursor).to.not.equal(emptyNouveauCursor);
        expect(responseIds).to.satisfy(subsetArray => {
          return subsetArray.every(item => expectedContactIds.includes(item));
        });
      }
    );

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
      const qs = {
        type: invalidContactType
      };
      const opts = {
        path: `${endpoint}`,
        qs
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(`400 - {"code":400,"error":"Invalid contact type [${invalidContactType}]."}`);
    });

    it('should not throw 400 error when freetext contains space but also has : delimiter', async () => {
      const qs = {
        freetext: 'key:value with space'
      };
      const opts = {
        path: `${endpoint}`,
        qs
      };

      await expect(utils.request(opts))
        .to.not.be.rejectedWith(`400 - {"code":400,"error":"Invalid freetext [\\" \\"]."}`);
    });

    it('should 400 error when freetext is invalid', async () => {
      const qs = {
        freetext: ' '
      };
      const opts = {
        path: `${endpoint}`,
        qs
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(`400 - {"code":400,"error":"Invalid freetext [\\" \\"]."}`);
    });

    it('throws 400 error when limit is invalid', async () => {
      const qs = {
        type: personType,
        limit: -1
      };
      const opts = {
        path: `${endpoint}`,
        qs
      };

      await expect(utils.request(opts)).to.be.rejectedWith(
        `400 - {"code":400,"error":"The limit must be a positive integer: [\\"-1\\"]."}`
      );
    });

    it('throws 500 error when cursor is invalid', async () => {
      const qs = {
        type: personType,
        cursor: '-1',
        freetext,
      };
      const opts = {
        path: `${endpoint}`,
        qs
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(
          `500 - {"code":500,"error":"Server error"}`
        );
    });
  });
});
