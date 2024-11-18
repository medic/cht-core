const fs = require('fs');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const trainingCardsPage = require('@page-objects/default/enketo/training-cards.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');

describe('Training Materials Page', () => {
  const CONFIRM_TITLE = 'Leave training?';
  const CONFIRM_CONTENT = 'This training is not finished. ' +
    'If you leave now, you will lose your progress and be prompted again later to complete it.';
  const FORMS_FOLDER = `${__dirname}/../../../e2e/default/training-materials/forms`;
  const FIRST_TRAINING_NAME = 'first_training';
  const FIRST_TRAINING_ID = `training:${FIRST_TRAINING_NAME}`;
  const SECOND_TRAINING_NAME = 'second_training';
  const SECOND_TRAINING_ID = `training:${SECOND_TRAINING_NAME}`;

  before(async () => {
    const facility = placeFactory.place().build({ _id: 'dist1', type: 'district_hospital' });
    const user = userFactory.build({ roles: [ 'pharmacist', 'chw' ] });

    const firstXML = fs.readFileSync(`${FORMS_FOLDER}/first-training.xml`, 'utf8');
    const firstTraining = {
      _id: `form:${FIRST_TRAINING_ID}`,
      internalId: FIRST_TRAINING_ID,
      title: FIRST_TRAINING_NAME,
      type: 'form',
      context: { start_date: new Date().getTime(), user_roles: [ 'pharmacist' ], duration: 5 },
      _attachments: {
        xml: { content_type: 'application/octet-stream', data: Buffer.from(firstXML).toString('base64') },
      },
    };

    const secondXML = fs.readFileSync(`${FORMS_FOLDER}/second-training.xml`, 'utf8');
    const secondTraining = {
      _id: `form:${SECOND_TRAINING_ID}`,
      internalId: SECOND_TRAINING_ID,
      title: SECOND_TRAINING_NAME,
      type: 'form',
      context: { start_date: new Date().getTime(), user_roles: [ 'pharmacist' ], duration: 5 },
      _attachments: {
        xml: { content_type: 'application/octet-stream', data: Buffer.from(secondXML).toString('base64') },
      },
    };

    const expiredTrainingXML = fs.readFileSync(`${FORMS_FOLDER}/expired-training.xml`, 'utf8');
    const expiredTraining = {
      _id: 'form:training:expired_training',
      internalId: 'training:expired_training',
      title: 'expired_training',
      type: 'form',
      context: { start_date: '2023-12-8', user_roles: [ 'pharmacist' ], duration: 50 },
      _attachments: {
        xml: { content_type: 'application/octet-stream', data: Buffer.from(expiredTrainingXML).toString('base64') },
      },
    };

    await utils.saveDocs([ facility, firstTraining, expiredTraining, secondTraining ]);
    await utils.createUsers([ user ]);
    await loginPage.login(user);
    await commonElements.waitForPageLoaded();
  });

  it('should quit training in modal, and be able to complete it later in the Training Material page,' +
    ' verify completed trainings display in the list', async () => {
    await trainingCardsPage.waitForTrainingCards();
    const trainingModalTitle = await trainingCardsPage.getTrainingTitle();
    expect(trainingModalTitle).to.equal(FIRST_TRAINING_NAME);

    const confirmMessage = await trainingCardsPage.quitTraining();
    expect(confirmMessage.header).to.equal(CONFIRM_TITLE);
    expect(confirmMessage.body).to.contain(CONFIRM_CONTENT);
    await trainingCardsPage.confirmQuitTraining();
    await trainingCardsPage.checkTrainingCardIsNotDisplayed();

    await commonPage.openHamburgerMenu();
    await commonPage.openTrainingMaterials();

    const trainings = await trainingCardsPage.getAllTrainingsText();
    expect(trainings.length).to.equal(2);
    expect(trainings).to.have.members([ FIRST_TRAINING_NAME, SECOND_TRAINING_NAME ]);
    expect(await trainingCardsPage.isTrainingComplete(FIRST_TRAINING_ID)).to.be.false;
    expect(await trainingCardsPage.isTrainingComplete(SECOND_TRAINING_ID)).to.be.false;

    await trainingCardsPage.openTrainingMaterial(FIRST_TRAINING_ID);
    const trainingMaterialTitle = await trainingCardsPage.getTrainingTitle();
    expect(trainingMaterialTitle).to.equal(FIRST_TRAINING_NAME);

    const introCard = await trainingCardsPage.getCardContent(FIRST_TRAINING_NAME, 'intro/intro_note_1:label"]');
    expect(introCard).to.equal(
      'There have been some changes to icons in your app. The next few screens will show you the difference.'
    );
    const nextCard = await trainingCardsPage.getNextCardContent(
      FIRST_TRAINING_NAME,
      'action_icons/action_icons_note_1:label"]',
    );
    expect(nextCard).to.equal('The "New Action" icon at the bottom of your app has also changed.');
    const lastCard = await trainingCardsPage.getNextCardContent(FIRST_TRAINING_NAME, 'ending/ending_note_1:label"]');
    expect(lastCard).to.equal('If you do not understand these changes, please contact your supervisor.');
    await trainingCardsPage.submitTraining(false);

    const allTrainings = await trainingCardsPage.getAllTrainingsText();
    expect(allTrainings.length).to.equal(2);
    expect(allTrainings).to.have.members([ FIRST_TRAINING_NAME, SECOND_TRAINING_NAME ]);
    expect(await trainingCardsPage.isTrainingComplete(FIRST_TRAINING_ID)).to.be.true;
    expect(await trainingCardsPage.isTrainingComplete(SECOND_TRAINING_ID)).to.be.false;

    await commonPage.goToReports();
    const firstReport = await reportsPage.getListReportInfo(await reportsPage.leftPanelSelectors.firstReport());
    expect(firstReport.form).to.equal(FIRST_TRAINING_ID);
  });

  it('should revisit completed trainings and load uncompleted trainings', async () => {
    await commonPage.openHamburgerMenu();
    await commonPage.openTrainingMaterials();

    const trainings = await trainingCardsPage.getAllTrainingsText();
    expect(trainings.length).to.equal(2);
    expect(trainings).to.have.members([ FIRST_TRAINING_NAME, SECOND_TRAINING_NAME ]);
    expect(await trainingCardsPage.isTrainingComplete(FIRST_TRAINING_ID)).to.be.true;
    expect(await trainingCardsPage.isTrainingComplete(SECOND_TRAINING_ID)).to.be.false;

    await trainingCardsPage.openTrainingMaterial(FIRST_TRAINING_ID);
    const trainingMaterialTitle = await trainingCardsPage.getTrainingTitle();
    expect(trainingMaterialTitle).to.equal(FIRST_TRAINING_NAME);

    const introCard = await trainingCardsPage.getCardContent(FIRST_TRAINING_NAME, 'intro/intro_note_1:label"]');
    expect(introCard).to.equal(
      'There have been some changes to icons in your app. The next few screens will show you the difference.'
    );
    const nextCard = await trainingCardsPage.getNextCardContent(
      FIRST_TRAINING_NAME,
      'action_icons/action_icons_note_1:label"]',
    );
    expect(nextCard).to.equal('The "New Action" icon at the bottom of your app has also changed.');

    const confirmMessage = await trainingCardsPage.quitTraining();
    expect(confirmMessage.header).to.equal(CONFIRM_TITLE);
    expect(confirmMessage.body).to.contain(CONFIRM_CONTENT);
    await trainingCardsPage.confirmQuitTraining();
    await trainingCardsPage.checkTrainingCardIsNotDisplayed();

    await trainingCardsPage.openTrainingMaterial(SECOND_TRAINING_ID);
    const secondTrainingTitle = await trainingCardsPage.getTrainingTitle();
    expect(secondTrainingTitle).to.equal(SECOND_TRAINING_NAME);
    const secondIntroCard = await trainingCardsPage.getCardContent(SECOND_TRAINING_NAME, 'intro/intro_note_1:label"]');
    expect(secondIntroCard).to.equal(
      'The next few screens will show you the difference.'
    );

    const secondConfirmMessage = await trainingCardsPage.quitTraining();
    expect(secondConfirmMessage.header).to.equal(CONFIRM_TITLE);
    expect(secondConfirmMessage.body).to.contain(CONFIRM_CONTENT);
    await trainingCardsPage.confirmQuitTraining();
    await trainingCardsPage.checkTrainingCardIsNotDisplayed();

    const allTrainings = await trainingCardsPage.getAllTrainingsText();
    expect(allTrainings.length).to.equal(2);
    expect(allTrainings).to.have.members([ FIRST_TRAINING_NAME, SECOND_TRAINING_NAME ]);
    expect(await trainingCardsPage.isTrainingComplete(FIRST_TRAINING_ID)).to.be.true;
    expect(await trainingCardsPage.isTrainingComplete(SECOND_TRAINING_ID)).to.be.false;
  });
});
