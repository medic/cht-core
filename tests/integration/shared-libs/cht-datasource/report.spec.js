const reportFactory = require('@factories/cht/reports/generic-report');
const utils = require('@utils');
const userFactory = require('@factories/cht/users/users');
const {getRemoteDataContext, Report, Qualifier} = require('@medic/cht-datasource');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const {expect} = require('chai');

describe('Report', () => {
  const contact0 = utils.deepFreeze(personFactory.build({name: 'contact0', role: 'chw'}));
  const contact1 = utils.deepFreeze(personFactory.build({name: 'contact1', role: 'chw_supervisor'}));
  const contact2 = utils.deepFreeze(personFactory.build({name: 'contact2', role: 'program_officer'}));
  const placeMap = utils.deepFreeze(placeFactory.generateHierarchy());
  const place1 = utils.deepFreeze({...placeMap.get('health_center'), contact: {_id: contact1._id}});
  const place2 = utils.deepFreeze({...placeMap.get('district_hospital'), contact: {_id: contact2._id}});
  const place0 = utils.deepFreeze({
    ...placeMap.get('clinic'), contact: {_id: contact0._id}, parent: {
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
  const report0 = utils.deepFreeze(reportFactory.report().build({
    form: 'report0'
  }, {
    patient, submitter: contact0
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
  const allReports = [ report0, report1, report2, report3, report4, report5 ];
  const allReportsIds = allReports.map(report => report._id);
  const dataContext = getRemoteDataContext(utils.getOrigin());

  before(async () => {
    await utils.saveDocs(allDocItems);
    await utils.saveDocs(allReports);
    await utils.createUsers([ userNoPerms, offlineUser ]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([ userNoPerms, offlineUser ]);
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

    describe('getUuidsPage', async () => {
      const getUuidsPage = Report.v1.getUuidsPage(dataContext);
      const freetext = 'report';
      const limit = 4;
      const cursor = null;
      const invalidLimit = 'invalidLimit';
      const invalidCursor = 'invalidCursor';

      it('returns a page of report ids for no limit and cursor passed', async () => {
        const responsePage = await getUuidsPage(Qualifier.byFreetext(freetext));
        const responsePeople = responsePage.data;
        const responseCursor = responsePage.cursor;

        expect(responsePeople).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(allReportsIds);
        expect(responseCursor).to.be.equal(null);
      });

      it('returns a page of report ids when limit and cursor is passed and cursor can be reused', async () => {
        const firstPage = await getUuidsPage(Qualifier.byFreetext(freetext), cursor, limit);
        const secondPage = await getUuidsPage(Qualifier.byFreetext(freetext), firstPage.cursor, limit);

        const allReports = [ ...firstPage.data, ...secondPage.data ];

        expect(allReports).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(allReportsIds);
        expect(firstPage.data.length).to.be.equal(4);
        expect(secondPage.data.length).to.be.equal(2);
        expect(firstPage.cursor).to.be.equal('4');
        expect(secondPage.cursor).to.be.equal(null);
      });

      it('throws error when limit is invalid', async () => {
        await expect(
          getUuidsPage(Qualifier.byFreetext(freetext), cursor, invalidLimit)
        ).to.be.rejectedWith(
          `The limit must be a positive number: [${invalidLimit}].`
        );
      });

      it('throws error when cursor is invalid', async () => {
        await expect(
          getUuidsPage(Qualifier.byFreetext(freetext), invalidCursor, limit)
        ).to.be.rejectedWith(
          `Invalid cursor token: [${invalidCursor}].`
        );
      });
    });

    describe('getUuids', async () => {
      it('fetches all data by iterating through generator', async () => {
        const freetext = 'report';
        const docs = [];

        const generator = Report.v1.getUuids(dataContext)(Qualifier.byFreetext(freetext));

        for await (const doc of generator) {
          docs.push(doc);
        }

        expect(docs).excluding([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(allReportsIds);
      });
    });
  });
});
