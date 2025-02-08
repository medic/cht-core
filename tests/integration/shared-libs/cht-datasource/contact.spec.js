const utils = require('@utils');
const personFactory = require('@factories/cht/contacts/person');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const {getRemoteDataContext, Qualifier, Contact} = require('@medic/cht-datasource');
const {expect} = require('chai');
const {setAuth, removeAuth} = require('./auth');

describe('cht-datasource Contact', () => {
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
    name: 'contact1', role: 'chw_supervisor', notes: searchWord, short_name: searchWord + '1'
  }));
  const contact2 = utils.deepFreeze(personFactory.build({
    name: 'contact2', role: 'program_officer', notes: searchWord, short_name: searchWord + '2'
  }));
  const placeMap = utils.deepFreeze(placeFactory.generateHierarchy());
  const place1 = utils.deepFreeze({
    ...placeMap.get('health_center'),
    contact: {_id: contact1._id},
    notes: commonWord
  });
  const place2 = utils.deepFreeze({
    ...placeMap.get('district_hospital'),
    contact: {_id: contact2._id},
    notes: commonWord
  });
  const place0 = utils.deepFreeze({
    ...placeMap.get('clinic'),
    notes: commonWord,
    contact: {_id: contact0._id},
    parent: {
      _id: place1._id, parent: {
        _id: place2._id
      }
    },
  });
  const patient = utils.deepFreeze(personFactory.build({
    parent: {
      _id: place0._id, parent: {
        _id: place1._id, parent: {
          _id: place2._id
        }
      },
    }, phone: '1234567890', role: 'patient', short_name: 'Mary'
  }));
  const placeType = 'clinic';
  const clinic1 = utils.deepFreeze(placeFactory.place().build({
    parent: {
      _id: place1._id, parent: {
        _id: place2._id
      }
    }, type: placeType, contact: {}, name: 'clinic1'
  }));
  const clinic2 = utils.deepFreeze(placeFactory.place().build({
    parent: {
      _id: place1._id, parent: {
        _id: place2._id
      }
    }, type: placeType, contact: {}, name: 'clinic2'
  }));

  const userNoPerms = utils.deepFreeze(userFactory.build({
    username: 'online-no-perms', place: place1._id, contact: {
      _id: 'fixture:user:online-no-perms', name: 'Online User',
    }, roles: [ 'mm-online' ]
  }));
  const offlineUser = utils.deepFreeze(userFactory.build({
    username: 'offline-has-perms', place: place0._id, contact: {
      _id: 'fixture:user:offline-has-perms', name: 'Offline User',
    }, roles: [ 'chw' ]
  }));
  const allDocItems = [ contact0, contact1, contact2, place0, place1, place2, clinic1, clinic2, patient ];
  const dataContext = getRemoteDataContext(utils.getOrigin());
  const personType = 'person';
  const e2eTestUser = {
    '_id': 'e2e_contact_test_id', 'type': personType,
  };
  const onlineUserPlaceHierarchy = {
    parent: {
      _id: place1._id, parent: {
        _id: place2._id,
      }
    }
  };
  const offlineUserPlaceHierarchy = {
    parent: {
      _id: place0._id, ...onlineUserPlaceHierarchy
    }
  };
  const expectedPeople = [ contact0, contact1, contact2, patient, e2eTestUser, {
    type: personType, ...userNoPerms.contact, ...onlineUserPlaceHierarchy
  }, {
    type: personType, ...offlineUser.contact, ...offlineUserPlaceHierarchy
  } ];
  const expectedPeopleIds = expectedPeople.map(person => person._id);
  const expectedPlaces = [ place0, clinic1, clinic2 ];
  const expectedPlacesIds = expectedPlaces.map(place => place._id);

  before(async () => {
    setAuth();
    await utils.saveDocs(allDocItems);
    await utils.createUsers([ userNoPerms, offlineUser ]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([ userNoPerms, offlineUser ]);
    removeAuth();
  });

  describe('v1',  () => {
    describe('get', async () => {
      const getContact = Contact.v1.get(dataContext);
      const getContactWithLineage = Contact.v1.getWithLineage(dataContext);

      it('returns the person contact matching the provided UUID', async () => {
        const person = await getContact(Qualifier.byUuid(patient._id));
        expect(person).excluding([ '_rev', 'reported_date' ]).to.deep.equal(patient);
      });

      it('returns the place contact matching the provided UUID', async () => {
        const place = await getContact(Qualifier.byUuid(place0._id));
        expect(place).excluding([ '_rev', 'reported_date' ]).to.deep.equal(place0);
      });

      it('returns the person contact with lineage when the withLineage query parameter is provided', async () => {
        const person = await getContactWithLineage(Qualifier.byUuid(patient._id));
        expect(person).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equal({
          ...patient, parent: {
            ...place0, contact: contact0, parent: {
              ...place1, contact: contact1, parent: {
                ...place2, contact: contact2
              }
            }
          }
        });
      });

      it('returns the place contact with lineage when the withLineage query parameter is provided', async () => {
        const place = await getContactWithLineage(Qualifier.byUuid(place0._id));
        expect(place).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equal({
          ...place0, contact: contact0, parent: {
            ...place1, contact: contact1, parent: {
              ...place2, contact: contact2
            }
          }
        });
      });

      it('returns null when no contact is found for the UUID', async () => {
        const contact = await getContact(Qualifier.byUuid('invalid-uuid'));
        expect(contact).to.be.null;
      });
    });

    describe('getUuidsPage', async () => {
      const getUuidsPage = Contact.v1.getUuidsPage(dataContext);
      const fourLimit = 4;
      const threeLimit = 3;
      const twoLimit = 2;
      const cursor = null;
      const freetext = 'contact';
      const placeFreetext = 'clinic';
      const invalidLimit = 'invalidLimit';
      const invalidCursor = 'invalidCursor';

      it('returns a page of people type contact ids for no limit and cursor passed', async () => {
        const responsePage = await getUuidsPage(Qualifier.byContactType(personType));
        const responsePeople = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responsePeople).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedPeopleIds);
        expect(responseCursor).to.be.equal(null);
      });

      it('returns a page of place type contact for no limit and cursor passed', async () => {
        const responsePage = await getUuidsPage(Qualifier.byContactType(placeType));
        const responsePlaces = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responsePlaces).excludingEvery([ '_rev', 'reported_date' ])
          .to.deep.equalInAnyOrder(expectedPlacesIds);
        expect(responseCursor).to.be.equal(null);
      });

      it('returns a page of contact ids for freetext with no limit and cursor passed', async () => {
        const expectedContactIds = [ contact0._id, contact1._id, contact2._id, place0._id, place1._id, place2._id ];
        const responsePage = await getUuidsPage(Qualifier.byFreetext(freetext));
        const responsePeople = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responsePeople).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedContactIds);
        expect(responseCursor).to.be.equal(null);
      });

      it('returns a page of people type contact ids and freetext for no limit and cursor passed', async () => {
        const responsePage = await getUuidsPage({
          ...Qualifier.byContactType(personType), ...Qualifier.byFreetext(freetext),
        });
        const expectedContactIds = [ contact0._id, contact1._id, contact2._id ];
        const responsePeople = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responsePeople).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedContactIds);
        expect(responseCursor).to.be.equal(null);
      });

      it('returns a page of place type contact with freetext for no limit and cursor passed', async () => {
        const freetext = 'clinic';
        const responsePage = await getUuidsPage({
          ...Qualifier.byContactType(placeType), ...Qualifier.byFreetext(freetext)
        });
        const responsePlaces = responsePage.data;
        const responseCursor = responsePage.cursor;
        const expectedContactIds = [ place0._id, clinic1._id, clinic2._id ];

        expect(responsePlaces).excludingEvery([ '_rev', 'reported_date' ])
          .to.deep.equalInAnyOrder(expectedContactIds);
        expect(responseCursor).to.be.equal(null);
      });

      it('returns a page of people type contact ids' +
        ' when limit and cursor is passed and cursor can be reused', async () => {
        const firstPage = await getUuidsPage(Qualifier.byContactType(personType), cursor, fourLimit);
        const secondPage = await getUuidsPage(Qualifier.byContactType(personType), firstPage.cursor, fourLimit);

        const allData = [ ...firstPage.data, ...secondPage.data ];

        expect(allData).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedPeopleIds);
        expect(firstPage.data.length).to.be.equal(4);
        expect(secondPage.data.length).to.be.equal(3);
        expect(firstPage.cursor).to.be.equal('4');
        expect(secondPage.cursor).to.be.equal(null);
      });

      it('returns a page of place type contact ids' +
        ' when limit and cursor is passed and cursor can be reused', async () => {
        const firstPage = await getUuidsPage(Qualifier.byContactType(placeType), cursor, twoLimit);
        const secondPage = await getUuidsPage(Qualifier.byContactType(placeType), firstPage.cursor, twoLimit);

        const allData = [ ...firstPage.data, ...secondPage.data ];

        expect(allData).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedPlacesIds);
        expect(firstPage.data.length).to.be.equal(2);
        expect(secondPage.data.length).to.be.equal(1);
        expect(firstPage.cursor).to.be.equal('2');
        expect(secondPage.cursor).to.be.equal(null);
      });

      it('returns a page of contact ids with freetext' +
        ' when limit and cursor is passed and cursor can be reused', async () => {
        const freetext = 'contact';
        const expectedContactIds = [ contact0._id, contact1._id, contact2._id, place0._id, place1._id, place2._id ];
        const firstPage = await getUuidsPage(Qualifier.byFreetext(freetext), cursor, threeLimit);
        const secondPage = await getUuidsPage(Qualifier.byFreetext(freetext), firstPage.cursor, threeLimit);

        const allData = [ ...firstPage.data, ...secondPage.data ];

        expect(allData).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedContactIds);
        expect(firstPage.data.length).to.be.equal(3);
        expect(secondPage.data.length).to.be.equal(3);
        expect(firstPage.cursor).to.be.equal('3');
        expect(secondPage.cursor).to.be.equal('6');
      });

      it('returns a page of people type contact ids with freetext' +
        ' when limit and cursor is passed and cursor can be reused', async () => {
        const freetext = 'contact';
        const firstPage = await getUuidsPage({
          ...Qualifier.byContactType(personType), ...Qualifier.byFreetext(freetext),
        }, cursor, twoLimit);
        const secondPage = await getUuidsPage({
          ...Qualifier.byContactType(personType), ...Qualifier.byFreetext(freetext),
        }, firstPage.cursor, twoLimit);
        const expectedContactIds = [ contact0._id, contact1._id, contact2._id ];

        const allData = [ ...firstPage.data, ...secondPage.data ];

        expect(allData).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedContactIds);
        expect(firstPage.data.length).to.be.equal(2);
        expect(secondPage.data.length).to.be.equal(1);
        expect(firstPage.cursor).to.be.equal('2');
        expect(secondPage.cursor).to.be.equal(null);
      });

      it('returns a page of place type contact ids' +
        ' when limit and cursor is passed and cursor can be reused', async () => {
        const firstPage = await getUuidsPage({
          ...Qualifier.byContactType(placeType), ...Qualifier.byFreetext(placeFreetext),
        }, cursor, twoLimit);
        const secondPage = await getUuidsPage({
          ...Qualifier.byContactType(placeType), ...Qualifier.byFreetext(placeFreetext),
        }, firstPage.cursor, twoLimit);
        const expectedContactIds = [ place0._id, clinic1._id, clinic2._id ];

        const allData = [ ...firstPage.data, ...secondPage.data ];

        expect(allData).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedContactIds);
        expect(firstPage.data.length).to.be.equal(2);
        expect(secondPage.data.length).to.be.equal(1);
        expect(firstPage.cursor).to.be.equal('2');
        expect(secondPage.cursor).to.be.equal(null);
      });

      it('returns a page of unique contact ids for when multiple fields match the same freetext', async () => {
        const expectedContactIds = [ contact0._id, contact1._id, contact2._id ];
        const responsePage = await getUuidsPage(Qualifier.byFreetext(searchWord));
        const responseIds = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responseIds).excludingEvery([ '_rev', 'reported_date' ])
          .to.deep.equalInAnyOrder(expectedContactIds);
        expect(responseCursor).to.be.equal(null);
      });

      it('returns a page of unique contact ids for when multiple fields match the same freetext with limit',
        async () => {
          const expectedContactIds = [ contact0._id, contact1._id, contact2._id ];
          // NOTE: adding a limit of 4 to deliberately fetch 4 contacts with the given search word
          // and enforce re-fetching logic
          const responsePage = await getUuidsPage(Qualifier.byFreetext(searchWord), null, 4);
          const responseIds = responsePage.data;
          const responseCursor = responsePage.cursor;

          expect(responseIds).excludingEvery([ '_rev', 'reported_date' ])
            .to.deep.equalInAnyOrder(expectedContactIds);
          expect(responseCursor).to.be.equal(null);
        });

      it('throws error when limit is invalid', async () => {
        await expect(
          getUuidsPage({
            ...Qualifier.byContactType(placeType),
            ...Qualifier.byFreetext(placeFreetext)
          }, cursor, invalidLimit)
        ).to.be.rejectedWith(
          `The limit must be a positive number: [${invalidLimit}].`
        );
      });

      it('throws error when cursor is invalid', async () => {
        await expect(
          getUuidsPage({
            ...Qualifier.byContactType(placeType),
            ...Qualifier.byFreetext(placeFreetext),
          }, invalidCursor, twoLimit)
        ).to.be.rejectedWith(
          `Invalid cursor token: [${invalidCursor}].`
        );
      });
    });

    describe('Contact.v1.getUuids', async () => {
      it('fetches all data by iterating through generator', async () => {
        const docs = [];

        const generator = Contact.v1.getUuids(dataContext)(Qualifier.byContactType(personType));

        for await (const doc of generator) {
          docs.push(doc);
        }

        expect(docs).excluding([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedPeopleIds);
      });
    });
  });
});
