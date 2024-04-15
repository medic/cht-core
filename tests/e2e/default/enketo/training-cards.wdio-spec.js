const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const trainingCardsPage = require('@page-objects/default/enketo/training-cards.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const privacyPolicyFactory = require('@factories/cht/settings/privacy-policy');
const privacyPage = require('@page-objects/default/privacy-policy/privacy-policy.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('Training Cards', () => {

  const expectedConfirmMessage = 'This training is not finished. ' +
    'If you leave now, you will lose your progress and be prompted again later to complete it.';

  const formDocId = 'training:training-cards-text-only';

  before(async () => {
    const parent = placeFactory.place().build({ _id: 'dist1', type: 'district_hospital' });
    const user = userFactory.build({ roles: [ 'nurse', 'chw' ] });
    const patient = personFactory.build({ parent: { _id: user.place._id, parent: { _id: parent._id } } });
    const formDoc = await commonEnketoPage.uploadForm('training-cards-text-only', false);
    formDoc._id = `form:${formDocId}`;
    formDoc.internalId = formDocId;
    formDoc.context = {
      start_date: new Date().getTime(),
      user_roles: [ 'nurse' ],
      duration: 5,
    };

    await utils.saveDocs([ parent, patient ]);
    await utils.saveDoc(formDoc);
    await utils.createUsers([ user ]);
    await loginPage.login(user);
    await commonElements.waitForPageLoaded();
  });

  it('should cancel training and not save it as completed', async () => {
    await trainingCardsPage.waitForTrainingCards();

    const confirmMessage = await trainingCardsPage.quitTraining();
    expect(confirmMessage.header).to.equal('Leave training?');
    expect(confirmMessage.body).to.contain(expectedConfirmMessage);
    await trainingCardsPage.confirmQuitTraining();
    await trainingCardsPage.checkTrainingCardIsNotDisplayed();

    await commonPage.goToReports();
    await commonElements.waitForPageLoaded();
    expect(await reportsPage.allReports()).to.be.empty;
  });

  it('should display training after it was canceled and the training doc was updated', async () => {
    await commonPage.goToMessages();
    await commonElements.waitForPageLoaded();
    // Unfinished trainings should appear again after reload.
    await browser.refresh();
    await trainingCardsPage.waitForTrainingCards();

    const confirmMessage = await trainingCardsPage.quitTraining();
    expect(confirmMessage.body).to.contain(expectedConfirmMessage);
    await trainingCardsPage.confirmQuitTraining();
    await trainingCardsPage.checkTrainingCardIsNotDisplayed();

    const trainingForm = await utils.getDoc(`form:${formDocId}`);
    expect(trainingForm.context.duration).to.equal(5);
    trainingForm.context.duration = 10;
    await utils.saveDocs([ trainingForm ]);

    await commonPage.syncAndNotWaitForSuccess();
    const updatedTrainingForm = await utils.getDoc(`form:${formDocId}`);
    expect(updatedTrainingForm.context.duration).to.equal(10);

    await trainingCardsPage.waitForTrainingCards();
    const context = 'training_cards_text_only';
    const introCard = await trainingCardsPage.getCardContent(context, 'intro/intro_note_1:label"]');
    expect(introCard).to.equal(
      'There have been some changes to icons in your app. The next few screens will show you the difference.'
    );
  });

  it('should display training after privacy policy', async () => {
    const privacyPolicy = privacyPolicyFactory.privacyPolicy().build();
    await utils.saveDocs([privacyPolicy]);
    await commonPage.goToReports();
    await commonElements.sync();
    await browser.refresh();

    await trainingCardsPage.checkTrainingCardIsNotDisplayed();
    await privacyPage.waitAndAcceptPolicy(await privacyPage.privacyWrapper(), privacyPolicyFactory.english, false);
    await trainingCardsPage.waitForTrainingCards();
    await trainingCardsPage.quitTraining();
  });

  it('should display training after reload and complete training', async () => {
    await commonPage.goToMessages();
    await commonElements.waitForPageLoaded();
    // Unfinished trainings should appear again after reload.
    await browser.refresh();
    await trainingCardsPage.waitForTrainingCards();

    const context = 'training_cards_text_only';
    const introCard = await trainingCardsPage.getCardContent(context, 'intro/intro_note_1:label"]');
    expect(introCard).to.equal(
      'There have been some changes to icons in your app. The next few screens will show you the difference.'
    );

    const contentCard = await trainingCardsPage.getNextCardContent(context, 'action_icons/action_icons_note_1:label"]');
    expect(contentCard).to.equal('The "New Action" icon at the bottom of your app has also changed.');

    const instructionPage = await trainingCardsPage.getNextCardContent(context, 'ending/ending_note_1:label"]');
    expect(instructionPage).to.equal('If you do not understand these changes, please contact your supervisor.');

    await trainingCardsPage.submitTraining();
    await trainingCardsPage.checkTrainingCardIsNotDisplayed();

    await commonPage.goToReports();
    const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
    expect(firstReport.heading).to.equal('OfflineUser');
    expect(firstReport.form).to.equal(formDocId);
  });

  it('should not display completed training', async () => {
    await commonPage.goToMessages();
    await commonElements.waitForPageLoaded();
    // Completed trainings should not appear again after reload.
    await browser.refresh();
    await trainingCardsPage.checkTrainingCardIsNotDisplayed();
  });
});
