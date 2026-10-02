const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const personFactory = require('@factories/cht/contacts/person');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const { getRemoteDataContext, Qualifier, Contact } = require('@medic/cht-datasource');
const { USER_ROLES } = require('@medic/constants');
const { setAuth, removeAuth } = require('./auth');
const { CONTACT_TYPES } = require('@medic/constants');

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
  // NOTE: the phone numbers are numeric-only so they cannot collide with the freetext searches above.
  // contact0 keeps a national format while the others carry a leading "+", which must survive the query
  // string.
  // NOTE: the person factory gives every person the same `patient_id`, so the fixtures searched by shortcode
  // get unique ones. contact0 stores its `rc_code` in lower-case, which the view upper-cases.
  const contact0 = utils.deepFreeze(personFactory.build({
    name: 'contact0', role: 'chw', notes: searchWord, short_name: searchWord + '0', phone: '0700000000',
    patient_id: '10976-c0', rc_code: 'rc-10976-c0'
  }));
  const contact1 = utils.deepFreeze(personFactory.build({
    name: 'contact1', role: 'chw_supervisor', notes: searchWord, short_name: searchWord + '1',
    phone: '+254700000001', patient_id: '10976-c1', rc_code: 'RC-10976-C1'
  }));
  const contact2 = utils.deepFreeze(personFactory.build({
    name: 'contact2', role: 'program_officer', notes: searchWord, short_name: searchWord + '2',
    phone: '+254700000002', patient_id: '10976-c2'
  }));
  const placeMap = utils.deepFreeze(placeFactory.generateHierarchy());
  const place1 = utils.deepFreeze({
    ...placeMap.get(CONTACT_TYPES.HEALTH_CENTER),
    contact: {_id: contact1._id},
    notes: commonWord
  });
  const place2 = utils.deepFreeze({
    ...placeMap.get('district_hospital'),
    contact: {_id: contact2._id},
    notes: commonWord
  });
  const place0 = utils.deepFreeze({
    ...placeMap.get(CONTACT_TYPES.CLINIC),
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
    }, phone: '1234567890', role: 'patient', short_name: 'Mary',
    // Carries both shortcodes, so the view emits it under each of them.
    patient_id: '10976-patient', place_id: '10976-patient-place'
  }));
  const clinic1 = utils.deepFreeze(placeFactory.place().build({
    parent: {
      _id: place1._id, parent: {
        _id: place2._id
      }
    }, type: CONTACT_TYPES.CLINIC, contact: {}, name: 'clinic1'
  }));
  const clinic2 = utils.deepFreeze(placeFactory.place().build({
    parent: {
      _id: place1._id, parent: {
        _id: place2._id
      }
    }, type: CONTACT_TYPES.CLINIC, contact: {}, name: 'clinic2'
  }));

  const userNoPerms = utils.deepFreeze(userFactory.build({
    username: 'online-no-perms', place: place1._id, contact: {
      _id: 'fixture:user:online-no-perms', name: 'Online User',
    }, roles: [ USER_ROLES.ONLINE ]
  }));
  const offlineUser = utils.deepFreeze(userFactory.build({
    username: 'offline-has-perms', place: place0._id, contact: {
      _id: 'fixture:user:offline-has-perms', name: 'Offline User',
    }, roles: [ 'chw' ]
  }));
  const allDocItems = [ contact0, contact1, contact2, place0, place1, place2, clinic1, clinic2, patient ];
  const dataContext = getRemoteDataContext({ getAll: () => ({}) }, utils.getOrigin());
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

  const excludedProperties = [ '_rev', 'reported_date', 'patient_id', 'place_id' ];

  before(async () => {
    setAuth();
    await utils.saveDocs(allDocItems);
    await sentinelUtils.waitForSentinel();
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
        expect(person).excluding(excludedProperties).to.deep.equal(patient);
      });

      it('returns the place contact matching the provided UUID', async () => {
        const place = await getContact(Qualifier.byUuid(place0._id));
        expect(place).excluding(excludedProperties).to.deep.equal(place0);
      });

      it('returns the person contact with lineage when the withLineage query parameter is provided', async () => {
        const person = await getContactWithLineage(Qualifier.byUuid(patient._id));
        expect(person).excludingEvery(excludedProperties).to.deep.equal({
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
        expect(place).excludingEvery(excludedProperties).to.deep.equal({
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
      const emptyNouveauCursor = 'W10=';

      it('returns a page of people type contact ids for no limit and cursor passed', async () => {
        const responsePage = await getUuidsPage(Qualifier.byContactType(personType));
        const responsePeople = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responsePeople).to.deep.equalInAnyOrder(expectedPeopleIds);
        expect(responseCursor).to.be.equal(null);
      });

      it('returns a page of place type contact for no limit and cursor passed', async () => {
        const responsePage = await getUuidsPage(Qualifier.byContactType(CONTACT_TYPES.CLINIC));
        const responsePlaces = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responsePlaces).to.deep.equalInAnyOrder(expectedPlacesIds);
        expect(responseCursor).to.be.equal(null);
      });

      it('returns a page of contact ids for freetext with no limit and cursor passed', async () => {
        const expectedContactIds = [ contact0._id, contact1._id, contact2._id, place0._id, place1._id, place2._id ];
        const responsePage = await getUuidsPage(Qualifier.byFreetext(freetext));
        const responsePeople = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responsePeople).to.deep.equalInAnyOrder(expectedContactIds);
        expect(responseCursor).to.not.equal(emptyNouveauCursor);
      });

      it('returns a page of people type contact ids and freetext for no limit and cursor passed', async () => {
        const responsePage = await getUuidsPage({
          ...Qualifier.byContactType(personType), ...Qualifier.byFreetext(freetext),
        });
        const expectedContactIds = [ contact0._id, contact1._id, contact2._id ];
        const responsePeople = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responsePeople).to.deep.equalInAnyOrder(expectedContactIds);
        expect(responseCursor).to.not.equal(emptyNouveauCursor);
      });

      it('returns a page of place type contact with freetext for no limit and cursor passed', async () => {
        const freetext = CONTACT_TYPES.CLINIC;
        const responsePage = await getUuidsPage({
          ...Qualifier.byContactType(CONTACT_TYPES.CLINIC), ...Qualifier.byFreetext(freetext)
        });
        const responsePlaces = responsePage.data;
        const responseCursor = responsePage.cursor;
        const expectedContactIds = [ place0._id, clinic1._id, clinic2._id ];

        expect(responsePlaces).to.deep.equalInAnyOrder(expectedContactIds);
        expect(responseCursor).to.not.equal(emptyNouveauCursor);
      });

      it('returns a page of people type contact ids' +
        ' when limit and cursor is passed and cursor can be reused', async () => {
        const firstPage = await getUuidsPage(Qualifier.byContactType(personType), cursor, fourLimit);
        const secondPage = await getUuidsPage(Qualifier.byContactType(personType), firstPage.cursor, fourLimit);

        const allData = [ ...firstPage.data, ...secondPage.data ];

        expect(allData).to.deep.equalInAnyOrder(expectedPeopleIds);
        expect(firstPage.data.length).to.be.equal(4);
        expect(secondPage.data.length).to.be.equal(3);
        expect(firstPage.cursor).to.be.equal('4');
        expect(secondPage.cursor).to.be.equal(null);
      });

      it('returns a page of place type contact ids' +
        ' when limit and cursor is passed and cursor can be reused', async () => {
        const firstPage = await getUuidsPage(Qualifier.byContactType(CONTACT_TYPES.CLINIC), cursor, twoLimit);
        const secondPage = await getUuidsPage(
          Qualifier.byContactType(CONTACT_TYPES.CLINIC),
          firstPage.cursor, 
          twoLimit,
        );

        const allData = [ ...firstPage.data, ...secondPage.data ];

        expect(allData).excludingEvery(excludedProperties).to.deep.equalInAnyOrder(expectedPlacesIds);
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

        expect(allData).excludingEvery(excludedProperties).to.deep.equalInAnyOrder(expectedContactIds);
        expect(firstPage.data.length).to.be.equal(3);
        expect(secondPage.data.length).to.be.equal(3);
        expect(firstPage.cursor).to.not.equal(emptyNouveauCursor);
        expect(secondPage.cursor).to.not.equal(emptyNouveauCursor);
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

        expect(allData).excludingEvery(excludedProperties).to.deep.equalInAnyOrder(expectedContactIds);
        expect(firstPage.data.length).to.be.equal(2);
        expect(secondPage.data.length).to.be.equal(1);
        expect(firstPage.cursor).to.not.equal(emptyNouveauCursor);
        expect(secondPage.cursor).to.not.equal(emptyNouveauCursor);
      });

      it('returns a page of place type contact ids' +
        ' when limit and cursor is passed and cursor can be reused', async () => {
        const firstPage = await getUuidsPage({
          ...Qualifier.byContactType(CONTACT_TYPES.CLINIC), ...Qualifier.byFreetext(placeFreetext),
        }, cursor, twoLimit);
        const secondPage = await getUuidsPage({
          ...Qualifier.byContactType(CONTACT_TYPES.CLINIC), ...Qualifier.byFreetext(placeFreetext),
        }, firstPage.cursor, twoLimit);
        const expectedContactIds = [ place0._id, clinic1._id, clinic2._id ];

        const allData = [ ...firstPage.data, ...secondPage.data ];

        expect(allData).to.deep.equalInAnyOrder(expectedContactIds);
        expect(firstPage.data.length).to.be.equal(2);
        expect(secondPage.data.length).to.be.equal(1);
        expect(firstPage.cursor).to.not.equal(emptyNouveauCursor);
        expect(secondPage.cursor).to.not.equal(emptyNouveauCursor);
      });

      it('returns a page of unique contact ids for when multiple fields match the same freetext', async () => {
        const expectedContactIds = [ contact0._id, contact1._id, contact2._id ];
        const responsePage = await getUuidsPage(Qualifier.byFreetext(searchWord));
        const responseIds = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responseIds).to.deep.equalInAnyOrder(expectedContactIds);
        expect(responseCursor).to.not.equal(emptyNouveauCursor);
      });

      it('returns a page of unique contact ids for when multiple fields match the same freetext with limit',
        async () => {
          const expectedContactIds = [ contact0._id, contact1._id, contact2._id ];
          // NOTE: adding a limit of 4 to deliberately fetch 4 contacts with the given search word
          // and enforce re-fetching logic
          const responsePage = await getUuidsPage(Qualifier.byFreetext(searchWord), null, fourLimit);
          const responseIds = responsePage.data;
          const responseCursor = responsePage.cursor;

          expect(responseIds).to.deep.equalInAnyOrder(expectedContactIds);
          expect(responseCursor).to.not.equal(emptyNouveauCursor);
        });

      it('returns a page of unique contact ids for when multiple fields match the same freetext with lower limit',
        async () => {
          const expectedContactIds = [ contact0._id, contact1._id, contact2._id ];
          const responsePage = await getUuidsPage(Qualifier.byFreetext(searchWord), null, twoLimit);
          const responseIds = responsePage.data;
          const responseCursor = responsePage.cursor;

          expect(responseIds.length).to.be.equal(2);
          expect(responseCursor).to.not.equal(emptyNouveauCursor);
          expect(responseIds).to.satisfy(subsetArray => {
            return subsetArray.every(item => expectedContactIds.includes(item));
          });
        });

      it('throws error when limit is invalid', async () => {
        await expect(
          getUuidsPage({
            ...Qualifier.byContactType(CONTACT_TYPES.CLINIC),
            ...Qualifier.byFreetext(placeFreetext)
          }, cursor, invalidLimit)
        ).to.be.rejectedWith(
          `The limit must be a positive integer: [${JSON.stringify(invalidLimit)}].`
        );
      });

      it('throws error when cursor is invalid', async () => {
        await expect(
          getUuidsPage({
            ...Qualifier.byContactType(CONTACT_TYPES.CLINIC),
            ...Qualifier.byFreetext(placeFreetext),
          }, invalidCursor, twoLimit)
        ).to.be.rejectedWith(
          `Internal Server Error`
        );
        // Nouveau just throws 500 - Internal Server Error whenever there is an invalid param.
        // So there is no way to know which input was actually wrong.
      });
    });

    describe('getUuidsPage byPhones', () => {
      const getUuidsPage = Contact.v1.getUuidsPage(dataContext);
      // The view only emits docs with a truthy `phone`, so the places and user contacts are not in it.
      const allPhones = [ contact0.phone, contact1.phone, contact2.phone, patient.phone ];
      const allPhoneContactIds = [ contact0._id, contact1._id, contact2._id, patient._id ];
      const unknownPhone = '0799999999';
      const threeLimit = 3;
      const cursor = null;
      const invalidLimit = 'invalidLimit';
      const invalidCursor = 'invalidCursor';

      it('returns a page of contact ids for the given phone numbers', async () => {
        const responsePage = await getUuidsPage(Qualifier.byPhones(allPhones));

        expect(responsePage.data).to.deep.equalInAnyOrder(allPhoneContactIds);
        expect(responsePage.cursor).to.be.equal(null);
      });

      it('returns only the contacts matching a single phone number', async () => {
        const responsePage = await getUuidsPage(Qualifier.byPhones([ patient.phone ]));

        expect(responsePage.data).to.deep.equal([ patient._id ]);
        expect(responsePage.cursor).to.be.equal(null);
      });

      it('returns the contact matching a phone number with a leading "+"', async () => {
        const responsePage = await getUuidsPage(Qualifier.byPhones([ contact1.phone ]));

        expect(responsePage.data).to.deep.equal([ contact1._id ]);
        expect(responsePage.cursor).to.be.equal(null);
      });

      it('skips a phone number with no contact without disturbing the others', async () => {
        const responsePage = await getUuidsPage(Qualifier.byPhones([ unknownPhone, patient.phone ]));

        expect(responsePage.data).to.deep.equal([ patient._id ]);
        expect(responsePage.cursor).to.be.equal(null);
      });

      it('returns an empty page when no phone number matches', async () => {
        const responsePage = await getUuidsPage(Qualifier.byPhones([ unknownPhone ]));

        expect(responsePage.data).to.deep.equal([]);
        expect(responsePage.cursor).to.be.equal(null);
      });

      it('does not normalize the phone numbers', async () => {
        const responsePage = await getUuidsPage(Qualifier.byPhones([ '+254700000000' ]));

        expect(responsePage.data).to.deep.equal([]);
      });

      it('returns a page of contact ids when limit and cursor is passed and cursor can be reused', async () => {
        const firstPage = await getUuidsPage(Qualifier.byPhones(allPhones), cursor, threeLimit);
        const secondPage = await getUuidsPage(Qualifier.byPhones(allPhones), firstPage.cursor, threeLimit);

        const allData = [ ...firstPage.data, ...secondPage.data ];

        expect(allData).to.deep.equalInAnyOrder(allPhoneContactIds);
        expect(firstPage.data.length).to.be.equal(3);
        expect(secondPage.data.length).to.be.equal(1);
        expect(firstPage.cursor).to.be.equal('3');
        expect(secondPage.cursor).to.be.equal(null);
      });

      it('pages across a phone number boundary without dropping or repeating a contact', async () => {
        // Rows come back grouped in the order of the requested numbers, so the split is deterministic.
        const twoLimit = 2;
        const firstPage = await getUuidsPage(Qualifier.byPhones(allPhones), cursor, twoLimit);
        const secondPage = await getUuidsPage(Qualifier.byPhones(allPhones), firstPage.cursor, twoLimit);
        const thirdPage = await getUuidsPage(Qualifier.byPhones(allPhones), secondPage.cursor, twoLimit);

        expect(firstPage.data).to.deep.equal([ contact0._id, contact1._id ]);
        expect(firstPage.cursor).to.be.equal('2');
        expect(secondPage.data).to.deep.equal([ contact2._id, patient._id ]);
        expect(secondPage.cursor).to.be.equal('4');
        expect(thirdPage.data).to.deep.equal([]);
        expect(thirdPage.cursor).to.be.equal(null);
      });

      it('throws error when limit is invalid', async () => {
        await expect(
          getUuidsPage(Qualifier.byPhones(allPhones), cursor, invalidLimit)
        ).to.be.rejectedWith(
          `The limit must be a positive integer: [${JSON.stringify(invalidLimit)}].`
        );
      });

      it('throws error when cursor is invalid', async () => {
        // The cursor is only validated as a page token server-side, so this rejects with the API's body.
        await expect(
          getUuidsPage(Qualifier.byPhones(allPhones), invalidCursor, threeLimit)
        ).to.be.rejectedWith(
          `{"code":400,"error":"The cursor must be a string or null for first page: [\\"${invalidCursor}\\"]."}`
        );
      });
    });

    describe('getPage byPhones', () => {
      const getPage = Contact.v1.getPage(dataContext);

      it('returns a page of contacts for the given phone numbers', async () => {
        const responsePage = await getPage(Qualifier.byPhones([ contact1.phone, patient.phone ]));
        const responseIds = responsePage.data.map(doc => doc._id);

        expect(responseIds).to.deep.equalInAnyOrder([ contact1._id, patient._id ]);
        expect(responsePage.cursor).to.be.equal(null);
        responsePage.data.forEach(doc => expect(doc._rev).to.be.a('string'));
      });

      it('returns an empty page when no phone number matches', async () => {
        const responsePage = await getPage(Qualifier.byPhones([ '0799999999' ]));

        expect(responsePage.data).to.deep.equal([]);
        expect(responsePage.cursor).to.be.equal(null);
      });
    });

    describe('byPhones with an unconfigured contact type', () => {
      // The view emits any doc with a phone and a `type` in its hard-coded list, including `type: contact`
      // docs whose `contact_type` is not configured in settings. Both phones paths must drop those rows,
      // so a caller cannot get an id from the uuid path that `Contact.v1.get` then refuses to return.
      const unconfigured = utils.deepFreeze({
        _id: 'unconfigured-contact-type',
        type: 'contact',
        contact_type: 'not_a_configured_contact_type',
        name: 'Unconfigured',
        phone: '0788888888',
        reported_date: new Date().getTime()
      });

      before(async () => {
        await utils.saveDoc(unconfigured);
      });

      after(async () => {
        await utils.deleteDoc(unconfigured._id);
      });

      it('is emitted by the view but returned by neither phones path', async () => {
        const viewRows = await utils.requestOnTestDb({
          path: '/_design/medic-client/_view/contacts_by_phone',
          method: 'POST',
          body: { keys: [ unconfigured.phone ] }
        });
        const uuidsPage = await Contact.v1.getUuidsPage(dataContext)(Qualifier.byPhones([ unconfigured.phone ]));
        const docsPage = await Contact.v1.getPage(dataContext)(Qualifier.byPhones([ unconfigured.phone ]));

        expect(viewRows.rows.map(row => row.id)).to.deep.equal([ unconfigured._id ]);
        expect(uuidsPage.data).to.deep.equal([]);
        expect(docsPage.data).to.deep.equal([]);
      });
    });


    describe('getUuidsPage byShortcodes', () => {
      const getUuidsPage = Contact.v1.getUuidsPage(dataContext);
      const allShortcodes = [
        contact0.patient_id, contact1.patient_id, contact2.patient_id, patient.patient_id, place0.place_id
      ];
      const allShortcodeContactIds = [ contact0._id, contact1._id, contact2._id, patient._id, place0._id ];

      it('returns a page of contact ids for the given shortcodes, in the order of the shortcodes', async () => {
        const responsePage = await getUuidsPage(Qualifier.byShortcodes(allShortcodes));

        expect(responsePage.data).to.deep.equal(allShortcodeContactIds);
        expect(responsePage.cursor).to.be.equal(null);
      });

      it('skips a shortcode with no contact without disturbing the others', async () => {
        const responsePage = await getUuidsPage(Qualifier.byShortcodes([ '00000', patient.patient_id ]));

        expect(responsePage.data).to.deep.equal([ patient._id ]);
        expect(responsePage.cursor).to.be.equal(null);
      });

      it('does not case-fold the shortcodes', async () => {
        const responsePage = await getUuidsPage(Qualifier.byShortcodes([ patient.patient_id.toUpperCase() ]));

        expect(responsePage.data).to.deep.equal([]);
        expect(responsePage.cursor).to.be.equal(null);
      });

      it('returns a contact matching both its patient_id and place_id only once', async () => {
        const responsePage = await getUuidsPage(Qualifier.byShortcodes([ patient.patient_id, patient.place_id ]));

        expect(responsePage.data).to.deep.equal([ patient._id ]);
        expect(responsePage.cursor).to.be.equal(null);
      });

      it('pages through the shortcodes without dropping or repeating a contact', async () => {
        // Rows come back grouped in the order of the requested shortcodes, so the split is deterministic.
        const twoLimit = 2;
        const qualifier = Qualifier.byShortcodes(allShortcodes);
        const firstPage = await getUuidsPage(qualifier, null, twoLimit);
        const secondPage = await getUuidsPage(qualifier, firstPage.cursor, twoLimit);
        const thirdPage = await getUuidsPage(qualifier, secondPage.cursor, twoLimit);

        expect(firstPage.data).to.deep.equal([ contact0._id, contact1._id ]);
        expect(firstPage.cursor).to.be.equal('2');
        expect(secondPage.data).to.deep.equal([ contact2._id, patient._id ]);
        expect(secondPage.cursor).to.be.equal('4');
        expect(thirdPage.data).to.deep.equal([ place0._id ]);
        expect(thirdPage.cursor).to.be.equal(null);
      });
    });

    describe('getUuidsPage byExternalRefs', () => {
      const getUuidsPage = Contact.v1.getUuidsPage(dataContext);

      it('returns a page of contact ids for the given external refs, matching case-insensitively', async () => {
        const responsePage = await getUuidsPage(Qualifier.byExternalRefs([ 'RC-10976-c0', 'rc-10976-c1' ]));

        expect(responsePage.data).to.deep.equal([ contact0._id, contact1._id ]);
        expect(responsePage.cursor).to.be.equal(null);
      });

      it('returns an empty page when no external ref matches', async () => {
        const responsePage = await getUuidsPage(Qualifier.byExternalRefs([ 'RC-UNKNOWN' ]));

        expect(responsePage.data).to.deep.equal([]);
        expect(responsePage.cursor).to.be.equal(null);
      });

      it('does not match a shortcode as an external ref', async () => {
        const responsePage = await getUuidsPage(Qualifier.byExternalRefs([ patient.patient_id ]));

        expect(responsePage.data).to.deep.equal([]);
      });
    });

    describe('getPage byShortcodes and byExternalRefs', () => {
      const getPage = Contact.v1.getPage(dataContext);

      it('returns a page of contacts for the given shortcodes', async () => {
        const responsePage = await getPage(Qualifier.byShortcodes([ patient.patient_id, place0.place_id ]));

        expect(responsePage.data.map(doc => doc._id)).to.deep.equal([ patient._id, place0._id ]);
        expect(responsePage.cursor).to.be.equal(null);
        responsePage.data.forEach(doc => expect(doc._rev).to.be.a('string'));
      });

      it('returns a contact matching both its patient_id and place_id only once', async () => {
        const responsePage = await getPage(Qualifier.byShortcodes([ patient.patient_id, patient.place_id ]));

        expect(responsePage.data.map(doc => doc._id)).to.deep.equal([ patient._id ]);
        expect(responsePage.cursor).to.be.equal(null);
      });

      it('pages through the shortcodes with the same cursors as the uuid path', async () => {
        const twoLimit = 2;
        const qualifier = Qualifier.byShortcodes([
          contact0.patient_id, contact1.patient_id, contact2.patient_id, patient.patient_id, place0.place_id
        ]);
        const firstPage = await getPage(qualifier, null, twoLimit);
        const secondPage = await getPage(qualifier, firstPage.cursor, twoLimit);
        const thirdPage = await getPage(qualifier, secondPage.cursor, twoLimit);

        expect(firstPage.data.map(doc => doc._id)).to.deep.equal([ contact0._id, contact1._id ]);
        expect(firstPage.cursor).to.be.equal('2');
        expect(secondPage.data.map(doc => doc._id)).to.deep.equal([ contact2._id, patient._id ]);
        expect(secondPage.cursor).to.be.equal('4');
        expect(thirdPage.data.map(doc => doc._id)).to.deep.equal([ place0._id ]);
        expect(thirdPage.cursor).to.be.equal(null);
      });

      it('returns a page of contacts for the given external refs', async () => {
        const responsePage = await getPage(Qualifier.byExternalRefs([ 'rc-10976-c0' ]));

        expect(responsePage.data.map(doc => doc._id)).to.deep.equal([ contact0._id ]);
        expect(responsePage.cursor).to.be.equal(null);
      });
    });

    describe('byShortcodes and byExternalRefs with docs that are not contacts', () => {
      // The view emits any doc with a `type` in its hard-coded list, including `national_office` docs and
      // `type: contact` docs whose `contact_type` is not configured in settings. Both paths must drop those
      // rows, so a caller cannot get an id from the uuid path that `Contact.v1.get` then refuses to return.
      const nationalOffice = utils.deepFreeze({
        _id: 'reference-national-office',
        type: 'national_office',
        name: 'National Office',
        place_id: '10976-national-office',
        rc_code: 'RC-10976-NATIONAL',
        reported_date: new Date().getTime()
      });
      const unconfigured = utils.deepFreeze({
        _id: 'reference-unconfigured-contact-type',
        type: 'contact',
        contact_type: 'not_a_configured_contact_type',
        name: 'Unconfigured',
        place_id: '10976-unconfigured',
        rc_code: 'RC-10976-UNCONFIGURED',
        reported_date: new Date().getTime()
      });
      const shortcodes = [ nationalOffice.place_id, unconfigured.place_id ];
      const externalRefs = [ nationalOffice.rc_code, unconfigured.rc_code ];

      before(async () => {
        await utils.saveDocs([ nationalOffice, unconfigured ]);
      });

      after(async () => {
        await utils.deleteDocs([ nationalOffice._id, unconfigured._id ]);
      });

      it('is emitted by the view but returned by neither shortcodes path', async () => {
        const viewRows = await utils.requestOnTestDb({
          path: '/_design/medic-client/_view/contacts_by_reference',
          method: 'POST',
          body: { keys: shortcodes.map(shortcode => [ 'shortcode', shortcode ]) }
        });
        const uuidsPage = await Contact.v1.getUuidsPage(dataContext)(Qualifier.byShortcodes(shortcodes));
        const docsPage = await Contact.v1.getPage(dataContext)(Qualifier.byShortcodes(shortcodes));

        expect(viewRows.rows.map(row => row.id)).to.deep.equal([ nationalOffice._id, unconfigured._id ]);
        expect(uuidsPage.data).to.deep.equal([]);
        expect(docsPage.data).to.deep.equal([]);
      });

      it('is emitted by the view but returned by neither external refs path', async () => {
        const viewRows = await utils.requestOnTestDb({
          path: '/_design/medic-client/_view/contacts_by_reference',
          method: 'POST',
          body: { keys: externalRefs.map(ref => [ 'external', ref ]) }
        });
        const uuidsPage = await Contact.v1.getUuidsPage(dataContext)(Qualifier.byExternalRefs(externalRefs));
        const docsPage = await Contact.v1.getPage(dataContext)(Qualifier.byExternalRefs(externalRefs));

        expect(viewRows.rows.map(row => row.id)).to.deep.equal([ nationalOffice._id, unconfigured._id ]);
        expect(uuidsPage.data).to.deep.equal([]);
        expect(docsPage.data).to.deep.equal([]);
      });
    });

    describe('Contact.v1.getUuids', async () => {
      it('fetches all data by iterating through generator', async () => {
        const docs = [];

        const generator = Contact.v1.getUuids(dataContext)(Qualifier.byContactType(personType));

        for await (const doc of generator) {
          docs.push(doc);
        }

        expect(docs).excluding(excludedProperties).to.deep.equalInAnyOrder(expectedPeopleIds);
      });

      it('fetches all contacts with the given phone numbers by iterating through generator', async () => {
        const phones = [ contact0.phone, contact1.phone, contact2.phone, patient.phone ];
        const expectedIds = [ contact0._id, contact1._id, contact2._id, patient._id ];
        const docs = [];

        const generator = Contact.v1.getUuids(dataContext)(Qualifier.byPhones(phones));

        for await (const doc of generator) {
          docs.push(doc);
        }

        expect(docs).to.deep.equalInAnyOrder(expectedIds);
      });

      it('fetches all contacts with the given shortcodes by iterating through generator', async () => {
        const docs = [];

        const generator = Contact.v1.getUuids(dataContext)(
          Qualifier.byShortcodes([ patient.patient_id, patient.place_id, place0.place_id ])
        );

        for await (const doc of generator) {
          docs.push(doc);
        }

        expect(docs).to.deep.equal([ patient._id, place0._id ]);
      });

      it('fetches all contacts with the given external refs by iterating through generator', async () => {
        const docs = [];

        const generator = Contact.v1.getUuids(dataContext)(
          Qualifier.byExternalRefs([ contact0.rc_code, contact1.rc_code ])
        );

        for await (const doc of generator) {
          docs.push(doc);
        }

        expect(docs).to.deep.equal([ contact0._id, contact1._id ]);
      });
    });

    describe('Contact.v1.getAll', () => {
      it('fetches all contacts with the given shortcodes by iterating through generator', async () => {
        const docs = [];

        const generator = Contact.v1.getAll(dataContext)(
          Qualifier.byShortcodes([ patient.patient_id, patient.place_id, place0.place_id ])
        );

        for await (const doc of generator) {
          docs.push(doc);
        }

        expect(docs.map(doc => doc._id)).to.deep.equal([ patient._id, place0._id ]);
      });

      it('fetches all contacts with the given external refs by iterating through generator', async () => {
        const docs = [];

        const generator = Contact.v1.getAll(dataContext)(Qualifier.byExternalRefs([ contact1.rc_code ]));

        for await (const doc of generator) {
          docs.push(doc);
        }

        expect(docs.map(doc => doc._id)).to.deep.equal([ contact1._id ]);
      });
    });
  });
});
