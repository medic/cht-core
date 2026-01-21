const reportFactory = require('@factories/cht/reports/generic-report');
const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const userFactory = require('@factories/cht/users/users');
const { getRemoteDataContext, Report, Qualifier } = require('@medic/cht-datasource');
const { USER_ROLES } = require('@medic/constants');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const { setAuth, removeAuth } = require('./auth');
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
    }, roles: [ USER_ROLES.ONLINE ]
  }));
  const offlineUser = utils.deepFreeze(userFactory.build({
    username: 'offline-has-perms', place: place0._id, contact: {
      _id: 'fixture:user:offline-has-perms', name: 'Offline User',
    }, roles: [ 'chw' ]
  }));

  const allDocItems = [ contact0, contact1, contact2, place0, place1, place2, patient ];
  const allReports = [ report0, report1, report2, report3, report4, report5, report6, report7, report8 ];
  const dataContext = getRemoteDataContext(utils.getOrigin());
  
  const excludedProperties = ['_rev', 'reported_date'];

  before(async () => {
    setAuth();
    await utils.saveDocs(allDocItems);
    await utils.saveDocs(allReports);
    await sentinelUtils.waitForSentinel();
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
        expect(resReport).excluding(excludedProperties).to.deep.equal(report0);
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
        expect(resReport).excludingEvery(excludedProperties).to.deep.equal({
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

        expect(allReports).excludingEvery(excludedProperties).to.deep.equalInAnyOrder(expectedReportIds);
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

        expect(docs).excluding(excludedProperties).to.deep.equalInAnyOrder(expectedReportIds);
      });
    });
  });
});
