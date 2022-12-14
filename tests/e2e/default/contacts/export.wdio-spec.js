const moment = require('moment');

const contactPage = require('../../../page-objects/default/contacts/contacts.wdio.page');
const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const commonElements = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const fileDownloadUtils = require('../../../utils/file-download');
const utils = require('../../../utils');

describe('Export Contacts', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
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
    await commonElements.waitForPageLoaded();
    await commonElements.goToPeople();
  });

  it('Should download export file', async () => {
    await contactPage.exportContacts();

    const files = await fileDownloadUtils.waitForDownload(`contacts-${today.format('YYYYMMDD')}`);
    expect(files).to.not.be.undefined;
    expect(files.length).to.equal(1);

    const fileContent = await fileDownloadUtils.getFileContent(files[0].name);
    expect(fileContent).to.not.be.undefined;
    savedContactIds.forEach(id => expect(fileContent.indexOf(id) > -1).to.be.true);
  });
});
