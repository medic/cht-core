const utils = require('../../utils');
const sentinelUtils = require('../sentinel/utils');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const trainingCardsPo = require('../../page-objects/forms/training-cards.po');

describe('Training Cards', () => {
  const place = {
    _id: 'fixture:district',
    type: 'district_hospital',
    name: 'District',
    place_id: 'district',
    reported_date: new Date().getTime(),
  };
  const chw = {
    username: 'bob',
    password: 'medic.123',
    place: 'fixture:district',
    contact: { _id: 'fixture:user:bob', name: 'Bob' },
    roles: ['chw'],
  };

  before(async () => {
    await utils.saveDoc(place);
    await utils.createUsers([ chw ]);
    await trainingCardsPo.configureForm();
    await sentinelUtils.waitForSentinel();
    await loginPage.login({ username: chw.username, password: chw.password });
    await commonPage.closeTour();
  });

  it('should display training cards', async () => {
    await commonPage.goToMessages();
    await trainingCardsPo.waitForTrainingCards();

    const introCard = await trainingCardsPo.getTextFromPage('intro/intro_note_1:label"]');
    expect(introCard).to.equal(
      'There have been some changes to icons in your app. The next few screens will show you the difference.'
    );
    await trainingCardsPo.goNext();

    const contentCard = await trainingCardsPo.getTextFromPage('action_icons/action_icons_note_1:label"]');
    expect(contentCard).to.equal('The "New Action" icon at the bottom of your app has also changed.');
    await trainingCardsPo.goNext();

    const instructionPage = await trainingCardsPo.getTextFromPage('ending/ending_note_1:label"]');
    expect(instructionPage).to.equal('If you do not understand these changes, please contact your supervisor.');
    await trainingCardsPo.submit();

    await commonPage.goToReports();
    const completedTraining = await trainingCardsPo.getCompletedTraining();
    expect(completedTraining).to.equal(trainingCardsPo.FORM_DOC.internalId);
  });
});
