const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const reportFactory = require('@factories/cht/reports/generic-report');
const { v7: uuid } = require('uuid');
const { USER_ROLES, CONTACT_TYPES, PREFIXES } = require('@medic/constants');
const { expect } = require('chai');

describe('Person API', () => {
  const contact0 = utils.deepFreeze(personFactory.build({ name: 'contact0', role: 'chw' }));
  const contact1 = utils.deepFreeze(personFactory.build({ name: 'contact1', role: 'chw_supervisor' }));
  const contact2 = utils.deepFreeze(personFactory.build({ name: 'contact2', role: 'program_officer' }));
  const placeMap = utils.deepFreeze(placeFactory.generateHierarchy());
  const place0 = utils.deepFreeze({ ...placeMap.get(CONTACT_TYPES.CLINIC), contact: { _id: contact0._id } });
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
    await utils.saveDocs(allDocItems);
    await utils.createUsers([userNoPerms, offlineUser]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([userNoPerms, offlineUser]);
  });

  describe('GET /api/v1/person/:uuid', async () => {
    const endpoint = '/api/v1/person';

    it('returns the person matching the provided UUID', async () => {
      const opts = {
        path: `${endpoint}/${patient._id}`,
      };
      const person = await utils.request(opts);
      expect(person).excluding(['_rev', 'reported_date']).to.deep.equal(patient);
    });

    it('returns the person with lineage when the withLineage query parameter is provided', async () => {
      const opts = {
        path: `${endpoint}/${patient._id}`,
        qs: {
          with_lineage: true
        }
      };
      const person = await utils.request(opts);
      expect(person).excludingEvery(['_rev', 'reported_date']).to.deep.equal({
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

    it('throws 404 error when no person is found for the UUID', async () => {
      const opts = {
        path: `${endpoint}/invalid-uuid`,
      };
      await expect(utils.request(opts)).to.be.rejectedWith('404 - {"code":404,"error":"Person not found"}');
    });

    [
      ['does not have can_view_contacts permission', userNoPerms],
      ['is not an online user', offlineUser]
    ].forEach(([description, user]) => {
      it(`throws error when user ${description}`, async () => {
        const opts = {
          path: `/api/v1/person/${patient._id}`,
          auth: { username: user.username, password: user.password },
        };
        await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
      });
    });
  });

  describe('GET /api/v1/person', async () => {
    const limit = 4;
    const invalidContactType = 'invalidPerson';
    const endpoint = '/api/v1/person';

    it('returns a page of people for no limit and cursor passed', async () => {
      const opts = {
        path: `${endpoint}`,
        qs: {
          type: personType
        }
      };
      const responsePage = await utils.request(opts);
      const responsePeople = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePeople).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedPeople);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of people when limit and cursor is passed and cursor can be reused', async () => {
      const firstPage = await utils.request({ path: endpoint, qs: { type: personType, limit } });
      const secondPage = await utils.request({
        path: endpoint,
        qs: { type: personType, cursor: firstPage.cursor, limit }
      });

      const allPeople = [...firstPage.data, ...secondPage.data];

      expect(allPeople).excludingEvery(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedPeople);
      expect(firstPage.data.length).to.be.equal(4);
      expect(secondPage.data.length).to.be.equal(3);
      expect(firstPage.cursor).to.be.equal('4');
      expect(secondPage.cursor).to.be.equal(null);
    });

    it(`throws error when user does not have can_view_contacts permission`, async () => {
      const opts = {
        path: `/api/v1/person`,
        auth: { username: userNoPerms.username, password: userNoPerms.password },
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it(`throws error when user is not an online user`, async () => {
      const opts = {
        path: `/api/v1/person`,
        auth: { username: offlineUser.username, password: offlineUser.password },
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it('throws 400 error when personType is invalid', async () => {
      const queryParams = {
        type: invalidContactType
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `/api/v1/person?${queryString}`,
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
        path: `/api/v1/person?${queryString}`,
      };

      await expect(utils.request(opts)).to.be.rejectedWith(
        `400 - {"code":400,"error":"The limit must be a positive integer: [\\"-1\\"]."}`
      );
    });

    it('throws 400 error when cursor is invalid', async () => {
      const queryParams = {
        type: personType,
        cursor: '-1'
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `/api/v1/person?${queryString}`,
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(
          `400 - {"code":400,"error":"The cursor must be a string or null for first page: [\\"-1\\"]."}`
        );
    });
  });

  describe('POST /api/v1/person', async () => {
    const postOptions = {
      path: `/api/v1/person`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

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

      const personDoc = await utils.request({ ...postOptions, body: personInput });

      expect(personDoc).excluding([ '_rev', '_id' ]).to.deep.equal({
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

      const personDoc = await utils.request({ ...postOptions, body: personInput });

      expect(personDoc).excluding([ '_rev', 'reported_date', '_id' ]).to.deep.equal({
        ...personInput,
        type: 'contact',
        contact_type: 'person',
        parent: { _id: place2._id }
      });
      expect(personDoc.reported_date).to.be.a('number');
    });

    it(`throws error for non-person type`, async () => {
      const personInput = {
        name: 'apoorva',
        type: CONTACT_TYPES.CLINIC,
        parent: contact0._id
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `[${personInput.type}] is not a valid person type.`,
      })}`;

      await expect(utils.request({ ...postOptions, body: personInput })).to.be.rejectedWith(expectedError);
    });

    it(`throws error for non-existent parent`, async () => {
      const personInput = {
        name: 'apoorva',
        type: 'person',
        parent: 'invalid-id'
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `Parent contact [${personInput.parent}] not found.`,
      })}`;

      await expect(utils.request({ ...postOptions, body: personInput })).to.be.rejectedWith(expectedError);
    });

    it(`throws error for parent type not among allowed parents in settings.contact_types`, async () => {
      const personInput = {
        name: 'apoorva',
        type: 'person',
        parent: contact0._id
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `Parent contact of type [person] is not allowed for type [${personInput.type}].`,
      })}`;

      await expect(utils.request({ ...postOptions, body: personInput })).to.be.rejectedWith(expectedError);
    });

    [
      ['does not have can_create_people or can_edit permissions', userNoPerms],
      ['is not an online user', offlineUser]
    ].forEach(([test, user]) => {
      it(`throws error when user ${test}`, async () => {
        const personInput = {
          name: 'apoorva',
          type: 'person',
          parent: place2._id
        };
        const opts = {
          ...postOptions,
          body: personInput,
          auth: { username: user.username, password: user.password },
        };
        await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
      });
    });
  });

  describe('PUT /api/v1/person/:uuid', async () => {
    const endpoint = `/api/v1/person`;
    const putOptions = {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    };
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
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalPerson._id}`,
        body: updatePersonInput
      };

      const updatePersonDoc = await utils.request(opts);

      expect(updatePersonDoc).excluding([ '_rev' ]).to.deep.equal(updatePersonInput);
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
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalPerson._id}`,
        body: updatePersonInput
      };

      const updatePerson = await utils.request(opts);

      // Given lineage data is returned
      expect(updatePerson).excludingEvery(['_rev', 'reported_date']).to.deep.equal(updatePersonInput);
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
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalPerson._id}`,
        body: updatePersonInput
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `Parent lineage does not match.`
      })}`;

      await expect(utils.request(opts)).to.be.rejectedWith(expectedError);
    });

    [
      ['any document', 'does-not-exist'],
      ['a person', place0._id],
    ].forEach(([test, id]) => {
      it(`throws error when id does not match ${test}`, async () => {
        const opts = {
          ...putOptions,
          path: `${endpoint}/${id}`,
          body: originalPerson
        };
        const expectedError = `404 - ${JSON.stringify({
          code: 404,
          error: `Person record [${id}] not found.`
        })}`;

        await expect(utils.request(opts)).to.be.rejectedWith(expectedError);
      });
    });

    [
      ['does not have can_update_reports or can_edit permissions', userNoPerms],
      ['is not an online user', offlineUser]
    ].forEach(([test, user]) => {
      it(`throws error when user ${test}`, async () => {
        const opts = {
          ...putOptions,
          path: `${endpoint}/${originalPerson._id}`,
          body: originalPerson,
          auth: { username: user.username, password: user.password },
        };

        await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
      });
    });
  });

  describe('POST /api/v1/person/:uuid/move', () => {
    const endpoint = '/api/v1/person';

    const districtId = uuid();
    const clinicAId = uuid();
    const clinicBId = uuid();
    const patientId = uuid();

    const district = utils.deepFreeze(placeFactory.place().build({
      _id: districtId,
      name: 'person-move-district',
      type: CONTACT_TYPES.DISTRICT_HOSPITAL,
      // The moving patient is this district's primary contact, so the move has to refresh the copy
      // of their lineage cached here, on a place that is not itself moving.
      contact: { _id: patientId, parent: { _id: clinicAId, parent: { _id: districtId } } },
    }));
    const clinicA = utils.deepFreeze(placeFactory.place().build({
      _id: clinicAId,
      name: 'person-move-clinic-a',
      type: CONTACT_TYPES.CLINIC,
      contact: {},
      parent: district,
    }));
    const clinicB = utils.deepFreeze(placeFactory.place().build({
      _id: clinicBId,
      name: 'person-move-clinic-b',
      type: CONTACT_TYPES.CLINIC,
      contact: {},
      parent: district,
    }));
    // An explicit shortcode, for the same reason the delete fixture below sets one: personFactory
    // defaults every person to `test_woman_1`, and a report records its subject's shortcode.
    const patient = utils.deepFreeze(personFactory.build({
      _id: patientId,
      name: 'moving-patient',
      role: 'patient',
      patient_id: 'person-move-patient',
      parent: { _id: clinicAId, parent: { _id: districtId } },
    }));
    // Authored by the person being moved, so its cached author lineage must follow.
    const report = utils.deepFreeze(
      reportFactory.report().build({ form: 'person-move-report' }, { patient, submitter: patient })
    );
    // No reports and nothing pointing at them: the minimal case.
    const lonePatient = utils.deepFreeze(personFactory.build({
      name: 'lone-patient',
      role: 'patient',
      patient_id: 'person-move-lone',
      parent: { _id: clinicAId, parent: { _id: districtId } },
    }));

    before(async () => {
      await utils.saveDocs([district, clinicA, clinicB, patient, report, lonePatient]);
    });

    it('returns a dry-run summary and moves nothing when passing dry_run', async () => {
      const response = await utils.request({
        path: `${endpoint}/${patient._id}/move`,
        method: 'POST',
        qs: { dry_run: true },
        body: { parent_id: clinicBId },
      });

      expect(response).to.deep.equal({
        summary: { 'set-parent': 1, 'set-contact': { reports: 1, places: 1 } },
      });
      const unchanged = await utils.getDoc(patient._id);
      expect(unchanged.parent._id).to.equal(clinicAId);
    });

    it('throws 404 when the id is not a person', async () => {
      await expect(utils.request({
        path: `${endpoint}/${clinicAId}/move`,
        method: 'POST',
        body: { parent_id: clinicBId },
      })).to.be.rejectedWith('404 - {"code":404,"error":"Person not found"}');
    });

    it('throws 400 when the person already has that parent', async () => {
      await expect(utils.request({
        path: `${endpoint}/${patient._id}/move`,
        method: 'POST',
        body: { parent_id: clinicAId },
      })).to.be.rejectedWith(/already has that parent/);
    });

    [
      ['does not have can_move_contact_hierarchy permission', userNoPerms],
      ['is not an online user', offlineUser],
    ].forEach(([description, user]) => {
      it(`throws 403 when user ${description}`, async () => {
        await expect(utils.request({
          path: `${endpoint}/${patient._id}/move`,
          method: 'POST',
          body: { parent_id: clinicBId },
          auth: { username: user.username, password: user.password },
        })).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
      });
    });

    it('moves a person with minimal data', async () => {
      const { id, summary } = await utils.request({
        path: `${endpoint}/${lonePatient._id}/move`,
        method: 'POST',
        body: { parent_id: clinicBId },
      });
      await utils.waitForBulkOperation(id);

      expect(summary).to.deep.equal({ 'set-parent': 1, 'set-contact': { reports: 0, places: 0 } });

      const moved = await utils.getDoc(lonePatient._id);
      expect(moved.parent).to.deep.equal({ _id: clinicBId, parent: { _id: districtId } });
    });

    it('moves a person and the lineage cached on the reports they authored', async () => {
      const { id, summary } = await utils.request({
        path: `${endpoint}/${patient._id}/move`,
        method: 'POST',
        body: { parent_id: clinicBId },
      });
      await utils.waitForBulkOperation(id);

      expect(summary).to.deep.equal({ 'set-parent': 1, 'set-contact': { reports: 1, places: 1 } });

      const moved = await utils.getDoc(patient._id);
      expect(moved.parent).to.deep.equal({ _id: clinicBId, parent: { _id: districtId } });

      const movedReport = await utils.getDoc(report._id);
      expect(movedReport.contact._id).to.equal(patient._id);
      expect(movedReport.contact.parent).to.deep.equal({ _id: clinicBId, parent: { _id: districtId } });

      // the district keeps pointing at the patient, with the lineage it now has
      const updatedDistrict = await utils.getDoc(districtId);
      expect(updatedDistrict.contact._id).to.equal(patient._id);
      expect(updatedDistrict.contact.parent).to.deep.equal({ _id: clinicBId, parent: { _id: districtId } });
    });
  });

  describe('DELETE /api/v1/person/:uuid', () => {
    const endpoint = '/api/v1/person';

    const place3Id = uuid();
    const person0 = utils.deepFreeze(personFactory.build({
      name: 'person0',
      patient_id: 'person-with-data',
      role: 'chw',
      parent: { _id: place3Id, parent: place1 }
    }));
    const person1 = utils.deepFreeze(personFactory.build({ patient_id: 'person-without-data', role: 'patient' }));
    const place3 = utils.deepFreeze(placeFactory.place().build({
      _id: place3Id,
      type: CONTACT_TYPES.DISTRICT_HOSPITAL,
      parent: place1,
      contact: person0
    }));
    const userToDelete = utils.deepFreeze(userFactory.build({
      username: 'user-to-delete',
      place: place3._id,
      contact: person0._id,
      roles: [USER_ROLES.ONLINE]
    }));
    const deletedUserId = `${PREFIXES.COUCH_USER}${userToDelete.username}`;
    const reports = utils.deepFreeze([
      reportFactory.report().build({ form: 'test-report' }, { patient: person0, submitter: person0 }),
      reportFactory.report().build({ form: 'test-report' }, { patient: person0, submitter: person0 }),
    ]);

    // Soft deleted rather than purged: the copy lands in the delete database and medic keeps a
    // tombstone, which is what reaches offline devices and downstream stores such as cht-sync.
    const expectDeleted = async (doc) => {
      expect(await utils.deleteDb.get(doc._id)).excludingEvery(['_rev', 'reported_date', 'deleted_date'])
        .to.deep.equal(doc);
      await expect(utils.getDoc(doc._id)).to.be.rejectedWith('404 - {"error":"not_found","reason":"deleted"}');
    };

    before(async () => {
      await utils.saveDocs([person0, person1, place3, ...reports]);
      await utils.createUsers([userToDelete]);
    });

    after(() => utils.deleteUsers([userToDelete]));

    it('returns a dry-run summary and deletes nothing when passing dry_run', async () => {
      const response = await utils.request({
        path: `${endpoint}/${person0._id}`,
        method: 'DELETE',
        qs: { dry_run: true, delete_users: true },
      });

      expect(response).to.deep.equal({
        summary: { delete: { contacts: 1, reports: 2 }, 'set-contact': 1, 'delete-user': 1 },
      });
      await expect(utils.getDoc(person0._id)).to.be.fulfilled;
      await expect(utils.getDoc(reports[0]._id)).to.be.fulfilled;
      await expect(utils.getDoc(reports[1]._id)).to.be.fulfilled;
      const updatedPlace = await utils.getDoc(place3Id);
      expect(updatedPlace.contact._id).to.equal(person0._id);
      await expect(utils.usersDb.get(deletedUserId)).to.be.fulfilled;
    });

    it('throws 404 when the id is not a person', async () => {
      await expect(utils.request({ path: `${endpoint}/${place0._id}`, method: 'DELETE' }))
        .to.be.rejectedWith('404 - {"code":404,"error":"Person not found"}');
    });

    it('throws 400 when deleting a person with a user when delete_users is not passed', async () => {
      await expect(utils.request({ path: `${endpoint}/${person0._id}`, method: 'DELETE' }))
        .to.be.rejectedWith(
          '400 - {"code":400,"error":"1 user(s) are linked to contacts in this hierarchy. '
          + 'Set delete_users=true (requires can_delete_users) to remove them."}'
        );
    });

    [
      ['does not have can_delete_contact_hierarchy permission', userNoPerms],
      ['is not an online user', offlineUser]
    ].forEach(([description, user]) => {
      it(`throws 403 when user ${description}`, async () => {
        const opts = {
          path: `${endpoint}/${patient._id}`,
          method: 'DELETE',
          auth: { username: user.username, password: user.password },
        };
        await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
      });
    });

    it('deletes a person with minimal data', async () => {
      const { id, summary } = await utils.request({ path: `${endpoint}/${person1._id}`, method: 'DELETE' });
      await utils.waitForBulkOperation(id);

      expect(summary).to.deep.equal({ delete: { contacts: 1, reports: 0 }, 'set-contact': 0, 'delete-user': 0 });
      await expectDeleted(person1);
    });

    it('deletes a person with related entities', async () => {
      const { id, summary } = await utils.request({
        path: `${endpoint}/${person0._id}`,
        method: 'DELETE',
        qs: { delete_users: true },
      });
      await utils.waitForBulkOperation(id);

      expect(summary).to.deep.equal({ delete: { contacts: 1, reports: 2 }, 'set-contact': 1, 'delete-user': 1 });
      await expectDeleted(person0);
      await expectDeleted(reports[0]);
      await expectDeleted(reports[1]);
      const updatedPlace = await utils.getDoc(place3Id);
      expect(updatedPlace.contact).to.be.undefined;
      await expect(utils.usersDb.get(deletedUserId)).to.be.rejectedWith('deleted');
    });
  });
});
