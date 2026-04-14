const reportFactory = require('@factories/cht/reports/generic-report');
const utils = require('@utils');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const { expect } = require('chai');
const { USER_ROLES } = require('@medic/constants');
const uuid = require('uuid').v4;
const { CONTACT_TYPES, DOC_TYPES } = require('@medic/constants');

describe('Report API', () => {
  const contact0Id = uuid();
  const contact1 = utils.deepFreeze(personFactory.build({ name: 'contact1', role: 'chw_supervisor' }));
  const contact2 = utils.deepFreeze(personFactory.build({ name: 'contact2', role: 'program_officer' }));
  const placeMap = utils.deepFreeze(placeFactory.generateHierarchy());
  const place1 = utils.deepFreeze({ ...placeMap.get(CONTACT_TYPES.HEALTH_CENTER), contact: { _id: contact1._id } });
  const place2 = utils.deepFreeze({ ...placeMap.get('district_hospital'), contact: { _id: contact2._id } });
  const place0 = utils.deepFreeze({
    ...placeMap.get('clinic'),
    contact: { _id: contact0Id },
    parent: {
      _id: place1._id,
      parent: {
        _id: place2._id
      }
    },
  });
  const contact0 = utils.deepFreeze(personFactory.build({
    _id: contact0Id,
    name: 'contact0',
    role: 'chw',
    parent: {
      _id: place0._id,
      parent: {
        _id: place1._id,
        parent: {
          _id: place2._id
        }
      },
    }
  }));
  const patient = utils.deepFreeze(personFactory.build({
    parent: {
      _id: place0._id, parent: {
        _id: place1._id, parent: {
          _id: place2._id
        }
      },
    },
    phone: '1234567890',
    role: 'patient',
    short_name: 'Mary',
    patient_id: uuid()
  }));
  const report0 = utils.deepFreeze(reportFactory.report().build({
    form: 'report0'
  }, {
    patient, submitter: contact0, place: place0
  }));
  const report1 = utils.deepFreeze(reportFactory.report().build({
    form: 'report1'
  }, {
    patient, submitter: contact0
  }));
  const report2 = utils.deepFreeze(reportFactory.report().build({
    form: 'report2'
  }, {
    patient, submitter: contact0
  }));
  const report3 = utils.deepFreeze(reportFactory.report().build({
    form: 'report3'
  }, {
    patient, submitter: contact0
  }));
  const report4 = utils.deepFreeze(reportFactory.report().build({
    form: 'report4'
  }, {
    patient, submitter: contact0
  }));
  const report5 = utils.deepFreeze(reportFactory.report().build({
    form: 'report5'
  }, {
    patient, submitter: contact0
  }));
  // NOTE: this is a common word added to contacts for searching purposes
  // the value was chosen such that it is a sub-string of the name which
  // gives double output from the couchdb view
  const searchWord = 'freetext';
  const report6 = utils.deepFreeze(reportFactory.report().build({
    form: 'freetext-report-6'
  }, {
    patient, submitter: contact0, fields: {
      note: searchWord
    }
  }));
  const report7 = utils.deepFreeze(reportFactory.report().build({
    form: 'freetext-report-7'
  }, {
    patient, submitter: contact0, fields: {
      note: searchWord
    }
  }));
  const report8 = utils.deepFreeze(reportFactory.report().build({
    form: 'freetext-report-8'
  }, {
    patient, submitter: contact0, fields: {
      note: searchWord
    }
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

  const allDocItems = [ contact0, contact1, contact2, place0, place1, place2, patient ];
  const allReports = [ report0, report1, report2, report3, report4, report5, report6, report7, report8 ];

  before(async () => {
    await utils.saveDocs(allDocItems);
    await utils.saveDocs(allReports);
    await utils.createUsers([ userNoPerms, offlineUser ]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([ userNoPerms, offlineUser ]);
  });

  describe('GET /api/v1/report/:uuid', async () => {
    const endpoint = '/api/v1/report';

    it('should return the report matching the provided UUID', async () => {
      const opts = {
        path: `${endpoint}/${report0._id}`,
      };
      const resReport = await utils.request(opts);
      expect(resReport).excluding([ '_rev', 'reported_date' ]).to.deep.equal(report0);
    });

    it('throws 404 error when no report is found for the UUID', async () => {
      const opts = {
        path: `${endpoint}/invalid-uuid`,
      };
      await expect(utils.request(opts)).to.be.rejectedWith('404 - {"code":404,"error":"Report not found"}');
    });

    [
      [ 'does not have can_view_reports permission', userNoPerms ],
      [ 'is not an online user', offlineUser ]
    ].forEach(([ description, user ]) => {
      it(`throws error when user ${description}`, async () => {
        const opts = {
          path: `/api/v1/report/${patient._id}`, auth: { username: user.username, password: user.password },
        };
        await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
      });
    });

    it('should return the report with lineage when with_lineage=true', async () => {
      const opts = {
        path: `${endpoint}/${report0._id}`,
        qs: { with_lineage: 'true' }
      };
      const resReport = await utils.request(opts);

      const expectedPlaceLineage = {
        ...place0,
        contact: contact0,
        parent: {
          ...place1,
          contact: contact1,
          parent: {
            ...place2,
            contact: contact2,
          }
        }
      };
      expect(resReport).excludingEvery(['_rev', 'reported_date']).to.deep.equal({
        ...report0,
        contact: {
          ...contact0,
          parent: expectedPlaceLineage
        },
        patient: {
          ...patient,
          parent: expectedPlaceLineage
        },
        place: expectedPlaceLineage,
      });
    });

    it('should return report without lineage when with_lineage is not true', async () => {
      const opts = {
        path: `${endpoint}/${report0._id}`,
        qs: { with_lineage: 'false' }
      };
      const resReport = await utils.request(opts);
      expect(resReport).excluding(['_rev', 'reported_date']).to.deep.equal(report0);
    });

    it('throws 404 error when no report is found for the UUID with lineage request', async () => {
      const opts = {
        path: `${endpoint}/invalid-uuid`,
        qs: { with_lineage: 'true' }
      };
      await expect(utils.request(opts)).to.be.rejectedWith('404 - {"code":404,"error":"Report not found"}');
    });

    [
      ['does not have can_view_reports permission', userNoPerms],
      ['is not an online user', offlineUser]
    ].forEach(([description, user]) => {
      it(`throws error when user ${description} for lineage request`, async () => {
        const opts = {
          path: `${endpoint}/${report0._id}`,
          qs: { with_lineage: 'true' },
          auth: { username: user.username, password: user.password }
        };
        await expect(utils.request(opts))
          .to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
      });
    });
  });

  describe('GET /api/v1/report/uuid', async () => {
    const freetext = 'report';
    const fourLimit = 4;
    const twoLimit = 2;
    const endpoint = '/api/v1/report/uuid';
    const emptyNouveauCursor = 'W10=';

    it('returns a page of report ids for no limit and cursor passed', async () => {
      const qs = {
        freetext
      };
      const opts = {
        path: `${endpoint}`,
        qs
      };
      const expectedReportIds = [ report0._id, report1._id, report2._id, report3._id, report4._id, report5._id ];
      const responsePage = await utils.request(opts);
      const responsePeople = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePeople).to.deep.equalInAnyOrder(expectedReportIds);
      expect(responseCursor).to.not.equal(emptyNouveauCursor);
    });

    it('returns a page of report ids when limit and cursor is passed and cursor can be reused', async () => {
      const expectedReportIds = [ report0._id, report1._id, report2._id, report3._id, report4._id, report5._id ];
      // first request
      const qs = {
        freetext,
        limit: fourLimit
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

      const allReports = [ ...firstPage.data, ...secondPage.data ];

      expect(allReports).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedReportIds);
      expect(firstPage.data.length).to.be.equal(4);
      expect(secondPage.data.length).to.be.equal(2);
      expect(firstPage.cursor).to.not.equal(emptyNouveauCursor);
      expect(secondPage.cursor).to.not.equal(emptyNouveauCursor);
    });

    it('returns a page of unique report ids for when multiple fields match the same freetext', async () => {
      const expectedContactIds = [ report6._id, report7._id, report8._id ];
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

      expect(responseIds).excludingEvery([ '_rev', 'reported_date' ])
        .to.deep.equalInAnyOrder(expectedContactIds);
      expect(responseCursor).to.not.equal(emptyNouveauCursor);
    });

    it('returns a page of unique report ids for when multiple fields match the same freetext with limit',
      async () => {
        const expectedContactIds = [ report6._id, report7._id, report8._id ];
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

        expect(responseIds).excludingEvery([ '_rev', 'reported_date' ])
          .to.deep.equalInAnyOrder(expectedContactIds);
        expect(responseCursor).to.not.equal(emptyNouveauCursor);
      });

    it('returns a page of unique report ids for when multiple fields match the same freetext with lower limit',
      async () => {
        const expectedContactIds = [ report6._id, report7._id, report8._id ];
        const qs = {
          freetext: searchWord,
          limit: twoLimit
        };
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
      });

    it(`throws error when user does not have can_view_reports permission`, async () => {
      const opts = {
        path: endpoint, auth: { username: userNoPerms.username, password: userNoPerms.password },
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it(`throws error when user is not an online user`, async () => {
      const opts = {
        path: endpoint, auth: { username: offlineUser.username, password: offlineUser.password },
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it('throws 400 error when freetext is invalid', async () => {
      const qs = {
        freetext: ''
      };
      const opts = {
        path: `${endpoint}`,
        qs
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(`400 - {"code":400,"error":"Invalid freetext [\\"\\"]."}`);
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

    it('throws 400 error when limit is invalid', async () => {
      const qs = {
        freetext, limit: -1
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
        freetext, cursor: '-1'
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

  describe('POST /api/v1/report/', () => {
    const postOptions = {
      path: `/api/v1/report`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    it('creates a report doc for valid input', async () => {
      const input = {
        form: 'pregnancy_danger_sign_follow_up',
        type: DOC_TYPES.DATA_RECORD,
        reported_date: 11221122,
        contact: contact0Id,
        fields: {
          hello: 'world'
        }
      };

      const reportDoc = await utils.request({ ...postOptions, body: input });

      expect(reportDoc).excluding(['_rev', '_id', 'reported_date']).to.deep.equal({
        ...input,
        contact: {
          _id: contact0Id,
          parent: contact0.parent
        }
      });
    });

    it('creates a report with minimum data', async () => {
      const input = {
        form: 'pregnancy_danger_sign_follow_up',
        contact: place2._id
      };

      const reportDoc = await utils.request({ ...postOptions, body: input });

      expect(reportDoc).excluding([ '_rev', '_id', 'reported_date' ]).to.deep.equal({
        ...input,
        type: DOC_TYPES.DATA_RECORD,
        contact: { _id: place2._id }
      });
      expect(reportDoc.reported_date).to.be.a('number');
    });

    it('throws error for non-existent contact', async () => {
      const input = {
        form: 'pregnancy_danger_sign_follow_up',
        contact: 'invalid-id'
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `Contact [${input.contact}] not found.`
      })}`;

      await expect(utils.request({ ...postOptions, body: input })).to.be.rejectedWith(expectedError);
    });

    it('throws error for invalid form', async () => {
      const input = {
        form: 'invalid-form',
        contact: place2._id
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `Invalid form value [${input.form}].`
      })}`;

      await expect(utils.request({ ...postOptions, body: input })).to.be.rejectedWith(expectedError);
    });

    [
      ['does not have can_create_records or can_edit permissions', userNoPerms],
      ['is not an online user', offlineUser]
    ].forEach(([test, user]) => {
      it(`throws error when user ${test}`, async () => {
        const opts = {
          ...postOptions,
          body: {
            form: 'pregnancy_danger_sign_follow_up',
            contact: place2._id
          },
          auth: { username: user.username, password: user.password },
        };
        await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
      });
    });
  });

  describe('PUT /api/v1/report/:uuid', () => {
    const endpoint = `/api/v1/report`;
    const putOptions = {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    };
    let originalReport;

    beforeEach(async () => {
      const doc = reportFactory.report().build({
        form: 'pregnancy_danger_sign_follow_up',
        fields: {
          hello: 'world',
          foo: 'bar'
        }
      }, {
        patient,
        submitter: contact0,
        place: place0
      });
      const { rev } = await utils.saveDoc(doc);
      originalReport = {
        ...doc,
        _rev: rev
      };
    });

    it('updates a report', async () => {
      const updateReportInput = {
        ...originalReport,
        contact: place2._id,
        fields: {
          ...originalReport.fields,
          hello: 'universe',
        }
      };
      delete updateReportInput.fields.foo;
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalReport._id}`,
        body: updateReportInput
      };

      const updatedReportDoc = await utils.request(opts);

      expect(updatedReportDoc).excluding([ '_rev' ]).to.deep.equal({
        ...updateReportInput,
        contact: { _id: place2._id }
      });
    });

    it('updates a report when lineage data is provided', async () => {
      const expectedPlaceLineage = {
        ...place0,
        contact: contact0,
        parent: {
          ...place1,
          contact: contact1,
          parent: {
            ...place2,
            contact: contact2,
          }
        }
      };
      delete expectedPlaceLineage.parent.parent.parent;
      const updateReportInput = {
        ...originalReport,
        contact: {
          ...contact0,
          parent: expectedPlaceLineage
        },
        fields: {
          ...originalReport.fields,
          hello: 'universe',
        },
        patient: {
          ...patient,
          parent: expectedPlaceLineage
        },
        place: expectedPlaceLineage,
      };
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalReport._id}`,
        body: updateReportInput
      };

      const updatedReportDoc = await utils.request(opts);

      // Given lineage data is returned
      expect(updatedReportDoc).excludingEvery(['_rev', 'reported_date']).to.deep.equal(updateReportInput);
      const updatedDoc = await utils.getDoc(originalReport._id);
      // Doc is written with minified lineage
      expect(updatedDoc).excluding('_rev').to.deep.equal({
        ...originalReport,
        fields: {
          ...originalReport.fields,
          hello: 'universe',
        },
      });
    });

    it('throws error when updating with invalid contact lineage', async () => {
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalReport._id}`,
        body: {
          ...originalReport,
          contact: {
            _id: place0._id,
            parent: { _id: place2._id }
          },
        }
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `The given contact lineage does not match the current lineage for that contact.`
      })}`;

      await expect(utils.request(opts)).to.be.rejectedWith(expectedError);
    });

    it('throws error when updating with a non-existent contact', async () => {
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalReport._id}`,
        body: {
          ...originalReport,
          contact: 'invalid-id',
        }
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `No valid contact found for [invalid-id].`
      })}`;

      await expect(utils.request(opts)).to.be.rejectedWith(expectedError);
    });

    it(`throws error when updating to invalid form`, async () => {
      const updateReportInput = {
        ...originalReport,
        form: 'invalid-form'
      };
      const opts = {
        ...putOptions,
        path: `${endpoint}/${originalReport._id}`,
        body: updateReportInput
      };
      const expectedError = `400 - ${JSON.stringify({
        code: 400,
        error: `Invalid form value [${updateReportInput.form}].`
      })}`;

      await expect(utils.request(opts)).to.be.rejectedWith(expectedError);
    });

    [
      ['any document', 'does-not-exist'],
      ['a report', place0._id],
    ].forEach(([test, id]) => {
      it(`throws error when id does not match ${test}`, async () => {
        const opts = {
          ...putOptions,
          path: `${endpoint}/${id}`,
          body: originalReport
        };
        const expectedError = `404 - ${JSON.stringify({
          code: 404,
          error: `Report record [${id}] not found.`
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
          path: `${endpoint}/${originalReport._id}`,
          body: originalReport,
          auth: { username: user.username, password: user.password },
        };

        await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
      });
    });
  });
});
