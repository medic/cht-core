const moment = require('moment');

const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const reportFactory = require('@factories/cht/reports/generic-report');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const fileDownloadUtils = require('@utils/file-download');
const utils = require('@utils');

describe('Export Reports', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const onlineUser = userFactory.build({ place: healthCenter._id, roles: ['program_officer'] });
  const patient = personFactory.build({ parent: { _id: healthCenter._id, parent: healthCenter.parent } });

  const today = moment();
  const reports = [
    reportFactory
      .report()
      .build(
        {
          form: 'P',
          reported_date: moment([today.year(), today.month(), 1, 23, 30]).subtract(4, 'month').valueOf()
        },
        { patient, submitter: onlineUser.contact, fields: { lmp_date: 'Feb 3, 2022' } },
      ),
    reportFactory
      .report()
      .build(
        {
          form: 'P',
          reported_date: moment([today.year(), today.month(), 12, 10, 30]).subtract(1, 'month').valueOf()
        },
        { patient, submitter: onlineUser.contact, fields: { lmp_date: 'Feb 16, 2022' } },
      ),
  ];

  const savedReportIds = [];
  beforeEach(async () => {
    await fileDownloadUtils.setupDownloadFolder();
    await utils.saveDocs([...places.values(), patient]);
    (await utils.saveDocs(reports)).forEach(savedReport => savedReportIds.push(savedReport.id));
    await utils.createUsers([onlineUser]);
    await loginPage.login(onlineUser);
    await commonElements.waitForPageLoaded();
    await commonElements.goToReports();
  });
  afterEach(async () => {
    await utils.deleteUsers([onlineUser]);
    await utils.revertDb([/^form:/], true);
  });

  it('Should download export file', async () => {
    await (await reportsPage.firstReport()).waitForDisplayed();
    await reportsPage.exportReports();

    const files = await fileDownloadUtils.waitForDownload(`reports-${today.format('YYYYMMDD')}`);
    expect(files).to.not.be.undefined;
    expect(files.length).to.equal(1);

    const fileContent = await fileDownloadUtils.getFileContent(files[0].name);
    expect(fileContent).to.not.be.undefined;
    savedReportIds.forEach(id => expect(fileContent.indexOf(id) > -1).to.be.true);
  });
});
