const commonElements = require('@page-objects/default/common/common.wdio.page');
const utils = require('@utils');
const chtDbUtils = require('@utils/cht-db');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const personFactory = require('@factories/cht/contacts/person');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');

const places = placeFactory.generateHierarchy();
const clinic = places.get('clinic');
const contact = personFactory.build({ parent: { _id: clinic._id, parent: clinic.parent }, });
const user = userFactory.build({ contact: contact._id, place: clinic._id });

const getServerFeedbackDocs = async () => {
  const response = await utils.request({ path: `/medic-user-${user.username}-meta/_all_docs` });
  console.log(response.rows.filter(row => row.id.includes('feedback')).length);
  return response.rows.filter(row => row.id.includes('feedback'));
};

describe('feedback docs', () => {
  before(async () => {
    await utils.saveDocs([...places.values(), contact]);
    await utils.createUsers([user]);
    await loginPage.login(user);
  });

  it('should create and sync a feedback doc', async () => {
    await browser.execute(() => console.error('woot', new Error('w00t')));
    await browser.waitUntil(async () => (await chtDbUtils.getFeedbackDocs()).length > 0);
    const feedbackDocs = await chtDbUtils.getFeedbackDocs();
    expect(feedbackDocs.length).to.equal(1);

    expect(feedbackDocs[0]).to.deep.nested.include({ 'info.message': 'w00t' });

    await commonElements.sync();
    await commonElements.refresh();
    const feedbackDocsAfterSync = await chtDbUtils.getFeedbackDocs();
    expect(feedbackDocsAfterSync.length).to.deep.equal(0);

    const serverFeedbackDoc = await utils.request({ path: `/medic-user-${user.username}-meta/${feedbackDocs[0]._id}` });
    expect(feedbackDocs[0]).to.deep.equal(serverFeedbackDoc);
  });

  it('should stop creating feedback docs once the db has over 1000 feedback docs', async () => {
    const maxFeedbackDocs = 1000;
    for (let i = 0; i < maxFeedbackDocs; i++) {
      await browser.execute((i) => console.error(`woot ${i}`, new Error(`w00t ${i}`)), i);
    }
    await browser.waitUntil(
      async () => (await chtDbUtils.getFeedbackDocs()).length >= maxFeedbackDocs,
      { timeout: 10000, interval: 500 }
    );
    await browser.execute(() => console.error('omg what', new Error('omg what')));
    await browser.pause(1000);
    expect((await chtDbUtils.getFeedbackDocs()).length).to.equal(maxFeedbackDocs);

    await commonElements.sync();
    await browser.waitUntil(
      async () => (await getServerFeedbackDocs()).length >= maxFeedbackDocs,
      { timeout: 10000, interval: 1000 }
    );
    await commonElements.refresh();

    expect((await chtDbUtils.getFeedbackDocs()).length).to.equal(1);
    await browser.execute(() => console.error('omg what', new Error('omg what')));
    await browser.waitUntil(async () => (await chtDbUtils.getFeedbackDocs()).length === 2);
    const feedbackDocs = await chtDbUtils.getFeedbackDocs();
    expect(feedbackDocs.length).to.equal(2);

    expect(feedbackDocs[0]).to.deep.nested.include({ 'info.message': 'w00t 999' });
    expect(feedbackDocs[1]).to.deep.nested.include({ 'info.message': 'omg what' });

    await chtDbUtils.clearFeedbackDocs();
  });
});
