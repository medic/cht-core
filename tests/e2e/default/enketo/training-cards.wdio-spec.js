const fs = require('fs');

const utils = require('../../../utils');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const modalPage = require('../../../page-objects/default/common/modal.wdio.page');
const trainingCardsPage = require('../../../page-objects/default/enketo/training-cards.wdio.page');
const genericFormPage = require('../../../page-objects/default/enketo/generic-form.wdio.page');
const placeFactory = require('../../../factories/cht/contacts/place');
const userFactory = require('../../../factories/cht/users/users');
const personFactory = require('../../../factories/cht/contacts/person');
const commonElements = require('../../../page-objects/default/common/common.wdio.page');
const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');
const reportsPo = require('../../../page-objects/default/reports/reports.wdio.page');

describe('Training Cards', () => {
  const parent = placeFactory.place().build({ _id: 'dist1', type: 'district_hospital' });
  const user = userFactory.build({ roles: [ 'nurse', 'chw' ] });
  const patient = personFactory.build({ parent: { _id: user.place._id, parent: { _id: parent._id } } });
  const formDoc = {
    _id: 'form:training:text_only',
    internalId: 'training:text_only',
    title: 'Text Only Training',
    type: 'form',
    context: {
      start_date: new Date().getTime(),
      user_roles: [ 'nurse' ],
      duration: 5,
    },
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer
          .from(fs.readFileSync(`${__dirname}/forms/training-cards-text-only.xml`, 'utf8'))
          .toString('base64'),
      },
    },
  };

  before(async () => {
    await utils.saveDocs([ parent, patient, formDoc ]);
    await utils.createUsers([ user ]);
    await loginPage.login(user);
    await commonElements.waitForPageLoaded();
  });

  it('should cancel training', async () => {
    await commonPage.goToMessages();
    await trainingCardsPage.waitForTrainingCards();
    await genericFormPage.cancelForm();

    const modal = await modalPage.getModalDetails();
    expect(modal.header).to.equal('Important changes');
    expect(modal.body).to.contain(
      'This training is not finished. You will lose your progress if you leave now. Are you sure you want to leave?'
    );
    await trainingCardsPage.quitTraining();

    await commonPage.goToReports();
    await commonElements.waitForPageLoaded();
    await (await reportsPo.noReportSelectedLabel()).waitForDisplayed();
  });

  it('should complete training', async () => {
    await commonPage.goToMessages();
    await commonElements.waitForPageLoaded();
    browser.refresh();
    await trainingCardsPage.waitForTrainingCards();

    const introCard = await trainingCardsPage.getCardContent('intro/intro_note_1:label"]');
    expect(introCard).to.equal(
      'There have been some changes to icons in your app. The next few screens will show you the difference.'
    );
    await genericFormPage.nextPage();

    const contentCard = await trainingCardsPage.getCardContent('action_icons/action_icons_note_1:label"]');
    expect(contentCard).to.equal('The "New Action" icon at the bottom of your app has also changed.');
    await genericFormPage.nextPage();

    const instructionPage = await trainingCardsPage.getCardContent('ending/ending_note_1:label"]');
    expect(instructionPage).to.equal('If you do not understand these changes, please contact your supervisor.');
    await genericFormPage.submitForm();

    await commonPage.goToReports();
    const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
    expect(firstReport.heading).to.equal('OfflineUser');
    expect(firstReport.form).to.equal('training:text_only');
  });
});
