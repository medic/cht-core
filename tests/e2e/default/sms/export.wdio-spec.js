const moment = require('moment');

const messagesPage = require('../../../page-objects/default/sms/messages.wdio.page');
const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const commonElements = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const fileDownloadUtils = require('../../../utils/file-download');
const utils = require('../../../utils');

describe('Export Messages', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const onlineUser = userFactory.build({ place: healthCenter._id, roles: [ 'program_officer' ] });
  const patient = personFactory.build({
    phone: '+12068881234',
    parent: { _id: healthCenter._id, parent: healthCenter.parent },
  });
  const today = moment();

  beforeEach(async () => {
    await fileDownloadUtils.setupDownloadFolder();
    await utils.saveDocs([ ...places.values(), patient ]);
    await utils.createUsers([ onlineUser ]);
    await loginPage.login(onlineUser);
    await commonElements.waitForPageLoaded();
    await commonElements.goToMessages();
  });

  it('Should download export file', async () => {
    await messagesPage.sendMessage('It is working!', patient.phone, messagesPage.contactNameSelector, patient.name);
    await messagesPage.waitForMessagesInLHS();

    await messagesPage.exportMessages();

    const files = await fileDownloadUtils.waitForDownload(`messages-${today.format('YYYYMMDD')}`);
    expect(files).to.not.be.undefined;
    expect(files.length).to.equal(1);

    const fileContent = await fileDownloadUtils.getFileContent(files[0].name);
    expect(fileContent).to.not.be.undefined;
    expect(fileContent.indexOf('It is working!') > -1).to.be.true;
  });
});
