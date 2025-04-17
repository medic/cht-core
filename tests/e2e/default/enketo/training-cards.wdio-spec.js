const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const trainingCardsPage = require('@page-objects/default/enketo/training-cards.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const privacyPolicyFactory = require('@factories/cht/settings/privacy-policy');
const privacyPage = require('@page-objects/default/privacy-policy/privacy-policy.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');

describe('Training Cards', () => {
  const expectedConfirmModalHeader = 'Leave training?';
  const expectedConfirmMessage = 'This training is not finished. ' +
    'If you leave now, you will lose your progress and be prompted again later to complete it.';

  const formDocId = 'training:training-cards-text-only';

  const setLastViewedDateInThePast = () => {
    return browser.execute(function() {
      this.localStorage.setItem('training-cards-last-viewed-date-user1', new Date('2024-10-05 20:10:05').toISOString());
    });
  };

  before(async () => {
    const parent = placeFactory.place().build({ _id: 'dist1', type: 'district_hospital' });
    const user = userFactory.build({ roles: [ 'nurse', 'chw' ] });
    const formDoc = commonPage.createFormDoc(`${__dirname}/forms/training-cards-text-only`);
    formDoc._id = `form:${formDocId}`;
    formDoc.internalId = formDocId;
    formDoc.context = {
      start_date: new Date().getTime(),
      user_roles: [ 'nurse' ],
      duration: 5,
    };

    await utils.saveDocs([ parent, formDoc ]);
    await utils.createUsers([ user ]);
    await loginPage.login(user);
    await commonPage.waitForPageLoaded();
  });

  after(async () => {
    await utils.deleteUsers([user]);
    await utils.deleteDocs([`form:${formDocId}`]);t
    await utils.revertDb([/^form:/], true);
  });

  it('should cancel training and not save it as completed', async () => {
    await trainingCardsPage.waitForTrainingCards();

    const confirmMessage = await trainingCardsPage.quitTraining();
    expect(confirmMessage.header).to.equal(expectedConfirmModalHeader);
    expect(confirmMessage.body).to.contain(expectedConfirmMessage);
    await trainingCardsPage.confirmQuitTraining();
    await trainingCardsPage.checkTrainingCardIsNotDisplayed();

    await commonPage.goToReports();
    await commonPage.waitForPageLoaded();
    expect(await reportsPage.leftPanelSelectors.allReports()).to.be.empty;
  });

  it('should display confirm message before navigating to different page', async () => {
    await commonPage.goToMessages();
    await commonPage.waitForPageLoaded();
    await setLastViewedDateInThePast();
    // Unfinished trainings should appear again after reload.
    await browser.refresh();
    await trainingCardsPage.waitForTrainingCards();
    await commonPage.goToPeople();

    const confirmMessage = await modalPage.getModalDetails();
    expect(confirmMessage.header).to.contain(expectedConfirmModalHeader);
    expect(confirmMessage.body).to.contain(expectedConfirmMessage);
    expect(await browser.getUrl()).to.contain('/messages');

    await trainingCardsPage.confirmQuitTraining();
    await trainingCardsPage.checkTrainingCardIsNotDisplayed();
    expect(await browser.getUrl()).to.contain('/contacts');

    // Going to Reports to check training was not saved
    await commonPage.goToReports();
    expect(await reportsPage.leftPanelSelectors.allReports()).to.be.empty;
  });

  it('should display confirm message when browser back button is clicked', async () => {
    // Creating navigation history to test back action
    await commonPage.goToMessages();
    await commonPage.goToPeople();

    await commonPage.waitForPageLoaded();
    await setLastViewedDateInThePast();
    // Unfinished trainings should appear again after reload.
    await browser.refresh();
    await trainingCardsPage.waitForTrainingCards();
    await browser.back();

    const confirmMessage = await modalPage.getModalDetails();
    expect(confirmMessage.header).to.contain(expectedConfirmModalHeader);
    expect(confirmMessage.body).to.contain(expectedConfirmMessage);
    expect(await browser.getUrl()).to.contain('/contacts');

    await trainingCardsPage.confirmQuitTraining();
    await trainingCardsPage.checkTrainingCardIsNotDisplayed();
    expect(await browser.getUrl()).to.contain('/messages');

    // Going to Reports to check training was not saved
    await commonPage.goToReports();
    expect(await reportsPage.leftPanelSelectors.allReports()).to.be.empty;
  });

  it('should not display training after it was canceled and the training doc was updated', async () => {
    await setLastViewedDateInThePast();
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

    await trainingCardsPage.checkTrainingCardIsNotDisplayed();
  });

  it('should display training after privacy policy', async () => {
    const privacyPolicy = privacyPolicyFactory.privacyPolicy().build();
    await utils.saveDocs([privacyPolicy]);
    await commonPage.goToReports();
    await commonPage.sync();
    await setLastViewedDateInThePast();
    await browser.refresh();

    await trainingCardsPage.checkTrainingCardIsNotDisplayed();
    await privacyPage.waitAndAcceptPolicy(await privacyPage.privacyWrapper(), privacyPolicyFactory.english, false);
    await trainingCardsPage.waitForTrainingCards();
    await trainingCardsPage.quitTraining();
  });

  it('should display training after reload and complete training', async () => {
    await commonPage.goToMessages();
    await commonPage.waitForPageLoaded();
    await setLastViewedDateInThePast();
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
    const firstReport = await reportsPage.getListReportInfo(await reportsPage.leftPanelSelectors.firstReport());
    expect(firstReport.heading).to.equal('OfflineUser');
    expect(firstReport.form).to.equal(formDocId);
  });

  it('should not display completed training', async () => {
    await commonPage.goToMessages();
    await commonPage.waitForPageLoaded();
    // Completed trainings should not appear again after reload.
    await browser.refresh();
    await trainingCardsPage.checkTrainingCardIsNotDisplayed();
  });
});
