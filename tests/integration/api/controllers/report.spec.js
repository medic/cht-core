const reportFactory = require('@factories/cht/reports/generic-report');
const utils = require('@utils');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const {expect} = require('chai');
const uuid = require('uuid').v4;

describe('Report API', () => {
  const contact0Id = uuid();
  const contact1 = utils.deepFreeze(personFactory.build({name: 'contact1', role: 'chw_supervisor'}));
  const contact2 = utils.deepFreeze(personFactory.build({name: 'contact2', role: 'program_officer'}));
  const placeMap = utils.deepFreeze(placeFactory.generateHierarchy());
  const place1 = utils.deepFreeze({...placeMap.get('health_center'), contact: {_id: contact1._id}});
  const place2 = utils.deepFreeze({...placeMap.get('district_hospital'), contact: {_id: contact2._id}});
  const place0 = utils.deepFreeze({
    ...placeMap.get('clinic'),
    contact: {_id: contact0Id},
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
    }, phone: '1234567890', role: 'patient', short_name: 'Mary', patient_id: uuid()
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
    }, roles: [ 'mm-online' ]
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
          path: `/api/v1/report/${patient._id}`, auth: {username: user.username, password: user.password},
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
        path: endpoint, auth: {username: userNoPerms.username, password: userNoPerms.password},
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it(`throws error when user is not an online user`, async () => {
      const opts = {
        path: endpoint, auth: {username: offlineUser.username, password: offlineUser.password},
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

  describe('POST /api/v1/report', () => {
    const endpoint = '/api/v1/report';

    it('creates report with all required fields', async () => {
      const reportData = {
        type: 'data_record',
        form: 'pregnancy_home_visit',
        reported_date: Date.now(),
        contact: { _id: contact0._id }
      };

      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: reportData
      });

      expect(response).to.have.property('_id');
      expect(response).to.have.property('_rev');
      expect(response.type).to.equal('data_record');
      expect(response.form).to.equal('pregnancy_home_visit');
      expect(response).to.have.property('reported_date');
      expect(response.contact).to.have.property('_id', contact0._id);
    });

    it('creates report with custom fields', async () => {
      const reportData = {
        type: 'data_record',
        form: 'pregnancy_home_visit',
        reported_date: Date.now(),
        contact: { _id: contact0._id },
        fields: {
          patient_name: 'Test Patient',
          symptoms: 'fever, cough'
        }
      };

      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: reportData
      });

      expect(response).to.have.property('_id');
      expect(response).to.have.property('_rev');
      expect(response.fields).to.have.property('patient_name', 'Test Patient');
      expect(response.fields).to.have.property('symptoms', 'fever, cough');
    });

    it('creates report with contact as UUID string', async () => {
      const reportData = {
        type: 'data_record',
        form: 'pregnancy_home_visit',
        reported_date: Date.now(),
        contact: { _id: contact0._id }
      };

      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: reportData
      });

      expect(response).to.have.property('_id');
      expect(response.contact).to.have.property('_id', contact0._id);
    });

    it('auto-generates _id when not provided', async () => {
      const reportData = {
        type: 'data_record',
        form: 'pregnancy_home_visit',
        reported_date: Date.now(),
        contact: { _id: contact0._id }
      };

      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: reportData
      });

      expect(response).to.have.property('_id');
      expect(response._id).to.be.a('string');
      expect(response._id.length).to.be.greaterThan(0);
    });

    it('accepts ISO 8601 date string for reported_date', async () => {
      const isoDate = '2025-01-15T10:30:00.000Z';
      const reportData = {
        type: 'data_record',
        form: 'pregnancy_home_visit',
        reported_date: isoDate,
        contact: { _id: contact0._id }
      };

      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: reportData
      });

      expect(response.reported_date).to.equal(new Date(isoDate).getTime());
    });

    it('accepts Unix timestamp for reported_date', async () => {
      const timestamp = 1609459200000;
      const reportData = {
        type: 'data_record',
        form: 'pregnancy_home_visit',
        reported_date: timestamp,
        contact: { _id: contact0._id }
      };

      const response = await utils.request({
        path: endpoint,
        method: 'POST',
        body: reportData
      });

      expect(response.reported_date).to.equal(timestamp);
    });

    it('returns 400 when type is missing', async () => {
      const reportData = {
        form: 'report0',
        reported_date: Date.now(),
        contact: { _id: contact0._id }
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: reportData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when type is not data_record', async () => {
      const reportData = {
        type: 'invalid_type',
        form: 'report0',
        reported_date: Date.now(),
        contact: { _id: contact0._id }
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: reportData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when form is missing', async () => {
      const reportData = {
        type: 'data_record',
        reported_date: Date.now(),
        contact: { _id: contact0._id }
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: reportData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when form is invalid/does not exist', async () => {
      const reportData = {
        type: 'data_record',
        form: 'non-existent-form',
        reported_date: Date.now(),
        contact: { _id: contact0._id }
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: reportData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when reported_date is missing', async () => {
      const reportData = {
        type: 'data_record',
        form: 'report0',
        contact: { _id: contact0._id }
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: reportData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when reported_date is invalid format', async () => {
      const reportData = {
        type: 'data_record',
        form: 'report0',
        reported_date: 'invalid-date',
        contact: { _id: contact0._id }
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: reportData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when contact is missing', async () => {
      const reportData = {
        type: 'data_record',
        form: 'report0',
        reported_date: Date.now()
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: reportData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when contact UUID does not exist', async () => {
      const reportData = {
        type: 'data_record',
        form: 'report0',
        reported_date: Date.now(),
        contact: { _id: 'non-existent-contact-uuid' }
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: reportData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when _rev is provided for create', async () => {
      const reportData = {
        type: 'data_record',
        form: 'pregnancy_home_visit',
        reported_date: Date.now(),
        contact: { _id: contact0._id },
        _rev: '1-abc'
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: reportData
      })).to.be.rejectedWith('400 - {"code":400,"error":"_rev is not allowed for create operations."}');
    });

    it('returns 403 when user does not have can_create_reports permission', async () => {
      const reportData = {
        type: 'data_record',
        form: 'report0',
        reported_date: Date.now(),
        contact: { _id: contact0._id }
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: reportData,
        auth: { username: userNoPerms.username, password: userNoPerms.password }
      })).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it('returns 403 when user is not an online user', async () => {
      const reportData = {
        type: 'data_record',
        form: 'report0',
        reported_date: Date.now(),
        contact: { _id: contact0._id }
      };

      await expect(utils.request({
        path: endpoint,
        method: 'POST',
        body: reportData,
        auth: { username: offlineUser.username, password: offlineUser.password }
      })).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });
  });

  describe('PUT /api/v1/report/:uuid', () => {
    let createdReport;

    beforeEach(async () => {
      // Create a report to update
      createdReport = await utils.request({
        path: '/api/v1/report',
        method: 'POST',
        body: {
          type: 'data_record',
          form: 'pregnancy_home_visit',
          reported_date: Date.now(),
          contact: { _id: contact0._id },
          fields: {
            patient_name: 'Original Name'
          }
        }
      });
    });

    it('updates report successfully with mutable fields', async () => {
      const updatedData = {
        ...createdReport,
        fields: {
          patient_name: 'Updated Name',
          notes: 'Additional notes'
        }
      };

      const response = await utils.request({
        path: `/api/v1/report/${createdReport._id}`,
        method: 'PUT',
        body: updatedData
      });

      expect(response._id).to.equal(createdReport._id);
      expect(response._rev).to.not.equal(createdReport._rev);
      expect(response.fields.patient_name).to.equal('Updated Name');
      expect(response.fields.notes).to.equal('Additional notes');
    });

    it('updates report maintaining immutable fields', async () => {
      const updatedData = {
        ...createdReport,
        fields: {
          patient_name: 'Updated Name'
        },
        type: createdReport.type,
        form: createdReport.form,
        reported_date: createdReport.reported_date,
        contact: createdReport.contact
      };

      const response = await utils.request({
        path: `/api/v1/report/${createdReport._id}`,
        method: 'PUT',
        body: updatedData
      });

      expect(response._id).to.equal(createdReport._id);
      expect(response.type).to.equal(createdReport.type);
      expect(response.form).to.equal(createdReport.form);
      expect(response.reported_date).to.equal(createdReport.reported_date);
    });

    it('returns 404 when UUID is missing in URL path', async () => {
      const updatedData = {
        _id: createdReport._id,
        _rev: createdReport._rev,
        type: 'data_record',
        form: 'pregnancy_home_visit',
        reported_date: createdReport.reported_date,
        contact: createdReport.contact
      };

      await expect(utils.request({
        path: '/api/v1/report',
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('404');
    });

    it('returns 400 when _rev is missing in body', async () => {
      const updatedData = {
        _id: createdReport._id,
        type: 'data_record',
        form: 'pregnancy_home_visit',
        reported_date: createdReport.reported_date,
        contact: createdReport.contact
      };

      await expect(utils.request({
        path: `/api/v1/report/${createdReport._id}`,
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('400 - {"code":400,"error":"_rev is required for update operations."}');
    });

    it('returns 404 when report does not exist', async () => {
      const updatedData = {
        _id: 'non-existent-uuid',
        _rev: '1-abc',
        type: 'data_record',
        form: 'pregnancy_home_visit',
        reported_date: Date.now(),
        contact: { _id: contact0._id }
      };

      await expect(utils.request({
        path: '/api/v1/report/non-existent-uuid',
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('404');
    });

    it('returns 400 when trying to change type (immutable field)', async () => {
      const updatedData = {
        ...createdReport,
        type: 'different_type'
      };

      await expect(utils.request({
        path: `/api/v1/report/${createdReport._id}`,
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when trying to change form (immutable field)', async () => {
      const updatedData = {
        ...createdReport,
        form: 'report1'
      };

      await expect(utils.request({
        path: `/api/v1/report/${createdReport._id}`,
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when trying to change reported_date (immutable field)', async () => {
      const updatedData = {
        ...createdReport,
        reported_date: createdReport.reported_date + 1000
      };

      await expect(utils.request({
        path: `/api/v1/report/${createdReport._id}`,
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when trying to change contact (immutable field)', async () => {
      const updatedData = {
        ...createdReport,
        contact: { _id: contact1._id }
      };

      await expect(utils.request({
        path: `/api/v1/report/${createdReport._id}`,
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('400');
    });

    it('returns 400 when form is invalid', async () => {
      const updatedData = {
        ...createdReport,
        form: 'non-existent-form'
      };

      await expect(utils.request({
        path: `/api/v1/report/${createdReport._id}`,
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('400');
    });

    it('returns 409 on _rev conflict', async () => {
      const updatedData = {
        ...createdReport,
        _rev: '99-wrong-rev',
        fields: {
          patient_name: 'Updated Name'
        }
      };

      await expect(utils.request({
        path: `/api/v1/report/${createdReport._id}`,
        method: 'PUT',
        body: updatedData
      })).to.be.rejectedWith('409');
    });

    it('returns 403 when user does not have can_edit_reports permission', async () => {
      const updatedData = {
        ...createdReport,
        fields: {
          patient_name: 'Updated Name'
        }
      };

      await expect(utils.request({
        path: `/api/v1/report/${createdReport._id}`,
        method: 'PUT',
        body: updatedData,
        auth: { username: userNoPerms.username, password: userNoPerms.password }
      })).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it('returns 403 when user is not an online user', async () => {
      const updatedData = {
        ...createdReport,
        fields: {
          patient_name: 'Updated Name'
        }
      };

      await expect(utils.request({
        path: `/api/v1/report/${createdReport._id}`,
        method: 'PUT',
        body: updatedData,
        auth: { username: offlineUser.username, password: offlineUser.password }
      })).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });
  });
});
