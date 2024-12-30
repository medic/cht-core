const reportFactory = require('@factories/cht/reports/generic-report');
const utils = require('@utils');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const {expect} = require('chai');

describe('Report API', () => {
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

  const adminUser = {
    username: 'admin',
    password: 'pass'
  };
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
        auth: adminUser,
      };
      const resReport = await utils.request(opts);
      expect(resReport).excluding([ '_rev', 'reported_date' ]).to.deep.equal(report0);
    });

    it('returns null when no report is found for the UUID', async () => {
      const opts = {
        path: `${endpoint}/invalid-uuid`,
        auth: adminUser,
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
  });

  describe('GET /api/v1/report/uuid', async () => {
    const freetext = 'report';
    const limit = 4;
    const endpoint = '/api/v1/report/uuid';

    it('returns a page of report ids for no limit and cursor passed', async () => {
      const queryParams = {
        freetext
      };
      const stringQueryParams = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `${endpoint}?${stringQueryParams}`,
        auth: adminUser,
      };
      const responsePage = await utils.request(opts);
      const responsePeople = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responsePeople).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(allReportsIds);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of report ids when limit and cursor is passed and cursor can be reused', async () => {
      // first request
      const queryParams = {
        freetext,
        limit
      };
      let stringQueryParams = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `${endpoint}?${stringQueryParams}`,
        auth: adminUser
      };
      const firstPage = await utils.request(opts);

      // second request
      queryParams.cursor = firstPage.cursor;
      stringQueryParams = new URLSearchParams(queryParams).toString();
      const opts2 = {
        path: `${endpoint}?${stringQueryParams}`,
        auth: adminUser
      };
      const secondPage = await utils.request(opts2);

      const allReports = [ ...firstPage.data, ...secondPage.data ];

      expect(allReports).excludingEvery([ '_rev', 'reported_date' ]).to.deep.equalInAnyOrder(allReportsIds);
      expect(firstPage.data.length).to.be.equal(4);
      expect(secondPage.data.length).to.be.equal(2);
      expect(firstPage.cursor).to.be.equal('4');
      expect(secondPage.cursor).to.be.equal(null);
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
      const queryParams = {
        freetext: ''
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `${endpoint}?${queryString}`,
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(`400 - {"code":400,"error":"Invalid freetext [\\"\\"]."}`);
    });

    it('throws 400 error when limit is invalid', async () => {
      const queryParams = {
        freetext, limit: -1
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
        freetext, cursor: '-1'
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `${endpoint}?${queryString}`,
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(`400 - {"code":400,"error":"Invalid cursor token: [${-1}]."}`);
    });
  });
});
