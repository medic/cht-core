const moment = require('moment');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const fileDownloadUtils = require('@utils/file-download');
const utils = require('@utils');
const { DOC_IDS } = require('@medic/constants');

describe('Export Contacts ', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get(DOC_IDS.HEALTH_CENTER);
  const onlineUser = userFactory.build({ place: healthCenter._id, roles: [ 'program_officer' ] });
  const patient = personFactory.build({ parent: { _id: healthCenter._id, parent: healthCenter.parent } });
  const today = moment();

  const savedContactIds = [];

  beforeEach(async () => {
    await fileDownloadUtils.setupDownloadFolder();
    const contactDocs = await utils.saveDocs([ ...places.values(), patient ]);
    contactDocs.forEach(savedContact => savedContactIds.push(savedContact.id));
    await utils.createUsers([ onlineUser ]);
    await loginPage.login(onlineUser);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople();
  });

  it('should download export file', async () => {
    await commonPage.accessExportOption();

    const files = await fileDownloadUtils.waitForDownload(`contacts-${today.format('YYYYMMDD')}`);
    expect(files).to.not.be.undefined;
    expect(files.length).to.equal(1);

    const fileContent = await fileDownloadUtils.getFileContent(files[0].name);
    expect(fileContent).to.not.be.undefined;
    savedContactIds.forEach(id => expect(fileContent.indexOf(id) > -1).to.be.true);
  });
});
