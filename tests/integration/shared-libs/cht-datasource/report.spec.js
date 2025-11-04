const reportFactory = require('@factories/cht/reports/generic-report');
const utils = require('@utils');
const userFactory = require('@factories/cht/users/users');
const {getRemoteDataContext, Report, Qualifier} = require('@medic/cht-datasource');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const {expect} = require('chai');
const {setAuth, removeAuth} = require('./auth');
const uuid = require('uuid').v4;

describe('cht-datasource Report', () => {
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
  const dataContext = getRemoteDataContext(utils.getOrigin());

  before(async () => {
    setAuth();
    await utils.saveDocs(allDocItems);
    await utils.saveDocs(allReports);
    await utils.createUsers([ userNoPerms, offlineUser ]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([ userNoPerms, offlineUser ]);
    removeAuth();
  });

  describe('v1', () => {
    describe('get', async () => {
      const getReport = Report.v1.get(dataContext);

      it('should return the report matching the provided UUID', async () => {
        const resReport = await getReport(Qualifier.byUuid(report0._id));
        expect(resReport).excluding([ '_rev', 'reported_date' ]).to.deep.equal(report0);
      });

      it('returns null when no report is found for the UUID', async () => {
        const report = await getReport(Qualifier.byUuid('invalid-uuid'));
        expect(report).to.be.null;
      });
    });

    describe('getWithLineage', async () => {
      const getReportWithLineage = Report.v1.getWithLineage(dataContext);

      it('should return the report with contact lineage matching the provided UUID', async () => {
        const resReport = await getReportWithLineage(Qualifier.byUuid(report0._id));

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

      it('returns null when no report is found for the UUID', async () => {
        const report = await getReportWithLineage(Qualifier.byUuid('invalid-uuid'));
        expect(report).to.be.null;
      });
    });
    
    describe('getUuidsPage', async () => {
      const getUuidsPage = Report.v1.getUuidsPage(dataContext);
      const freetext = 'report';
      const fourLimit = 4;
      const twoLimit = 2;
      const cursor = null;
      const invalidLimit = 'invalidLimit';
      const invalidCursor = 'invalidCursor';
      const emptyNouveauCursor = 'W10=';

      it('returns a page of report ids for no limit and cursor passed', async () => {
        const expectedReportIds = [ report0._id, report1._id, report2._id, report3._id, report4._id, report5._id ];
        const responsePage = await getUuidsPage(Qualifier.byFreetext(freetext));
        const responsePeople = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responsePeople).to.deep.equalInAnyOrder(expectedReportIds);
        expect(responseCursor).to.not.equal(emptyNouveauCursor);
      });

      it('returns a page of report ids when limit and cursor is passed and cursor can be reused', async () => {
        const expectedReportIds = [ report0._id, report1._id, report2._id, report3._id, report4._id, report5._id ];
        const firstPage = await getUuidsPage(Qualifier.byFreetext(freetext), cursor, fourLimit);
        const secondPage = await getUuidsPage(Qualifier.byFreetext(freetext), firstPage.cursor, fourLimit);

        const allReports = [ ...firstPage.data, ...secondPage.data ];

        expect(allReports).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedReportIds);
        expect(firstPage.data.length).to.be.equal(4);
        expect(secondPage.data.length).to.be.equal(2);
        expect(firstPage.cursor).to.not.equal(emptyNouveauCursor);
        expect(secondPage.cursor).to.not.equal(emptyNouveauCursor);
      });

      it('returns a page of unique report ids for when multiple fields match the same freetext', async () => {
        const expectedContactIds = [ report6._id, report7._id, report8._id ];
        const responsePage = await getUuidsPage(Qualifier.byFreetext(searchWord));
        const responseIds = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responseIds).to.deep.equalInAnyOrder(expectedContactIds);
        expect(responseCursor).to.not.equal(emptyNouveauCursor);
      });

      it('returns a page of unique report ids for when multiple fields match the same freetext with limit', 
        async () => {
          const expectedContactIds = [ report6._id, report7._id, report8._id ];
          // NOTE: adding a limit of 4 to deliberately fetch 4 contacts with the given search word
          // and enforce re-fetching logic
          const responsePage = await getUuidsPage(Qualifier.byFreetext(searchWord), null, fourLimit);
          const responseIds = responsePage.data;
          const responseCursor = responsePage.cursor;

          expect(responseIds).to.deep.equalInAnyOrder(expectedContactIds);
          expect(responseCursor).to.not.equal(emptyNouveauCursor);
        });

      it('returns a page of unique report ids for when multiple fields match the same freetext with lower limit',
        async () => {
          const expectedContactIds = [ report6._id, report7._id, report8._id ];
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
          getUuidsPage(Qualifier.byFreetext(freetext), cursor, invalidLimit)
        ).to.be.rejectedWith(
          `The limit must be a positive integer: [${JSON.stringify(invalidLimit)}].`
        );
      });

      it('throws error when cursor is invalid', async () => {
        await expect(
          getUuidsPage(Qualifier.byFreetext(freetext), invalidCursor, fourLimit)
        ).to.be.rejectedWith(
          `Internal Server Error`
        );
        // Nouveau just throws 500 - Internal Server Error whenever there is an invalid param.
        // So there is no way to know which input was actually wrong.
      });
    });

    describe('getUuids', async () => {
      it('fetches all data by iterating through generator', async () => {
        const expectedReportIds = [ report0._id, report1._id, report2._id, report3._id, report4._id, report5._id ];
        const freetext = 'report';
        const docs = [];

        const generator = Report.v1.getUuids(dataContext)(Qualifier.byFreetext(freetext));

        for await (const doc of generator) {
          docs.push(doc);
        }

        expect(docs).excluding([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(expectedReportIds);
      });
    });

    describe('create', async () => {
      const createReport = Report.v1.create(dataContext);
      const reportType = 'data_record';

      it('creates report with all required fields', async () => {
        const report = await createReport({
          type: reportType,
          form: 'pregnancy_home_visit',
          reported_date: Date.now(),
          contact: { _id: contact0._id }
        });

        expect(report).to.have.property('_id');
        expect(report).to.have.property('_rev');
        expect(report).to.have.property('reported_date');
        expect(report.type).to.equal(reportType);
        expect(report.form).to.equal('pregnancy_home_visit');
        expect(report.contact).to.have.property('_id', contact0._id);
      });

      it('creates report with patient reference', async () => {
        const report = await createReport({
          type: reportType,
          form: 'pregnancy_home_visit',
          reported_date: Date.now(),
          contact: { _id: contact0._id },
          patient: { _id: patient._id }
        });

        expect(report).to.have.property('_id');
        expect(report.patient).to.have.property('_id', patient._id);
      });

      it('creates report with place reference', async () => {
        const report = await createReport({
          type: reportType,
          form: 'pregnancy_home_visit',
          reported_date: Date.now(),
          contact: { _id: contact0._id },
          place: { _id: place0._id }
        });

        expect(report).to.have.property('_id');
        expect(report.place).to.have.property('_id', place0._id);
      });

      it('creates report with custom fields', async () => {
        const report = await createReport({
          type: reportType,
          form: 'pregnancy_home_visit',
          reported_date: Date.now(),
          contact: { _id: contact0._id },
          fields: {
            patient_name: 'John Doe',
            symptoms: 'fever'
          }
        });

        expect(report).to.have.property('_id');
        expect(report.fields).to.deep.equal({
          patient_name: 'John Doe',
          symptoms: 'fever'
        });
      });

      it('auto-generates _id when not provided', async () => {
        const report = await createReport({
          type: reportType,
          form: 'pregnancy_home_visit',
          reported_date: Date.now(),
          contact: { _id: contact0._id }
        });

        expect(report).to.have.property('_id');
        expect(report._id).to.be.a('string');
        expect(report._id.length).to.be.greaterThan(0);
      });

      it('creates report with provided reported_date', async () => {
        const timestamp = Date.now();
        const report = await createReport({
          type: reportType,
          form: 'pregnancy_home_visit',
          contact: { _id: contact0._id },
          reported_date: timestamp
        });

        expect(report).to.have.property('reported_date');
        expect(report.reported_date).to.equal(timestamp);
      });

      it('validates report type', async () => {
        await expect(createReport({
          type: 'invalid-type',
          form: 'pregnancy_home_visit',
          reported_date: Date.now(),
          contact: { _id: contact0._id }
        })).to.be.rejectedWith('Invalid report type');
      });

      it('validates form exists', async () => {
        await expect(createReport({
          type: reportType,
          form: 'non-existent-form',
          reported_date: Date.now(),
          contact: { _id: contact0._id }
        })).to.be.rejectedWith('Invalid form');
      });

      it('throws error when _rev is provided', async () => {
        await expect(createReport({
          type: reportType,
          form: 'pregnancy_home_visit',
          reported_date: Date.now(),
          contact: { _id: contact0._id },
          _rev: '1-abc'
        })).to.be.rejectedWith('_rev is not allowed for create operations');
      });

      it('throws error when contact document does not exist', async () => {
        await expect(createReport({
          type: reportType,
          form: 'pregnancy_home_visit',
          reported_date: Date.now(),
          contact: { _id: 'non-existent-uuid' }
        })).to.be.rejected;
      });

      it('throws error when patient document does not exist', async () => {
        await expect(createReport({
          type: reportType,
          form: 'pregnancy_home_visit',
          reported_date: Date.now(),
          contact: { _id: contact0._id },
          patient: { _id: 'non-existent-uuid' }
        })).to.be.rejected;
      });

      it('throws error when place document does not exist', async () => {
        await expect(createReport({
          type: reportType,
          form: 'pregnancy_home_visit',
          reported_date: Date.now(),
          contact: { _id: contact0._id },
          place: { _id: 'non-existent-uuid' }
        })).to.be.rejected;
      });

      it('returns created report with full data', async () => {
        const report = await createReport({
          type: reportType,
          form: 'pregnancy_home_visit',
          reported_date: Date.now(),
          contact: { _id: contact0._id },
          patient: { _id: patient._id },
          place: { _id: place0._id },
          fields: {
            note: 'Test note'
          }
        });

        expect(report).to.have.property('_id');
        expect(report).to.have.property('_rev');
        expect(report).to.have.property('reported_date');
        expect(report.type).to.equal(reportType);
        expect(report.form).to.equal('pregnancy_home_visit');
        expect(report.contact).to.have.property('_id', contact0._id);
        expect(report.patient).to.have.property('_id', patient._id);
        expect(report.place).to.have.property('_id', place0._id);
        expect(report.fields).to.have.property('note', 'Test note');
      });
    });

    describe('update', async () => {
      const createReport = Report.v1.create(dataContext);
      const updateReport = Report.v1.update(dataContext);
      const reportType = 'data_record';
      let createdReport;

      beforeEach(async () => {
        createdReport = await createReport({
          type: reportType,
          form: 'pregnancy_home_visit',
          reported_date: Date.now(),
          contact: { _id: contact0._id },
          fields: {
            patient_name: 'Original Name'
          }
        });
      });

      it('updates report successfully', async () => {
        const updated = await updateReport({
          ...createdReport,
          fields: {
            patient_name: 'Updated Name',
            symptoms: 'cough'
          }
        });

        expect(updated._id).to.equal(createdReport._id);
        expect(updated._rev).to.not.equal(createdReport._rev);
        expect(updated.fields.patient_name).to.equal('Updated Name');
        expect(updated.fields.symptoms).to.equal('cough');
      });

      it('maintains immutable fields', async () => {
        const updated = await updateReport({
          ...createdReport,
          fields: {
            patient_name: 'Updated Name'
          }
        });

        expect(updated.type).to.equal(createdReport.type);
        expect(updated.form).to.equal(createdReport.form);
        expect(updated.reported_date).to.equal(createdReport.reported_date);
        expect(updated.contact._id).to.equal(createdReport.contact._id);
      });

      it('throws error when _id is missing', async () => {
        const reportWithoutId = { ...createdReport };
        delete reportWithoutId._id;

        await expect(updateReport(reportWithoutId))
          .to.be.rejectedWith('Resource not found: undefined');
      });

      it('throws error when _rev is missing', async () => {
        const reportWithoutRev = { ...createdReport };
        delete reportWithoutRev._rev;

        await expect(updateReport(reportWithoutRev))
          .to.be.rejectedWith('_rev is required for update operations');
      });

      it('throws error when document does not exist', async () => {
        await expect(updateReport({
          _id: 'non-existent-uuid',
          _rev: '1-abc',
          type: reportType,
          form: 'report0',
          reported_date: Date.now(),
          contact: { _id: contact0._id }
        })).to.be.rejected;
      });

      it('throws error when trying to change type', async () => {
        await expect(updateReport({
          ...createdReport,
          type: 'different-type'
        })).to.be.rejected;
      });

      it('throws error when trying to change form', async () => {
        await expect(updateReport({
          ...createdReport,
          form: 'report1'
        })).to.be.rejected;
      });

      it('throws error when trying to change reported_date', async () => {
        await expect(updateReport({
          ...createdReport,
          reported_date: createdReport.reported_date + 1000
        })).to.be.rejected;
      });

      it('throws error when trying to change contact', async () => {
        await expect(updateReport({
          ...createdReport,
          contact: { _id: contact1._id }
        })).to.be.rejected;
      });

      it('returns updated report with new _rev', async () => {
        const updated = await updateReport({
          ...createdReport,
          fields: {
            patient_name: 'Updated Name'
          }
        });

        expect(updated).to.have.property('_id', createdReport._id);
        expect(updated).to.have.property('_rev');
        expect(updated._rev).to.not.equal(createdReport._rev);
        expect(updated.fields.patient_name).to.equal('Updated Name');
      });
    });
  });
});
