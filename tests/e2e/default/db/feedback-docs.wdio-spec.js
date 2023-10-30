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
      { timeout: 20000, interval: 500 }
    );
    await browser.execute(() => console.error('omg what', new Error('omg what')));
    await browser.pause(1000); // make sure that there's enough time to get the doc saved
    expect((await chtDbUtils.getFeedbackDocs()).length).to.equal(maxFeedbackDocs);

    await commonElements.sync();
    await browser.waitUntil(
      async () => (await getServerFeedbackDocs()).length >= maxFeedbackDocs,
      { timeout: 20000, interval: 500 }
    );
    await browser.pause(1000); // after sync, we set the purge seq, without which docs are not purged at refresh
    await commonElements.refresh();

    let feedbackDocs = await chtDbUtils.getFeedbackDocs();
    const initialFeedbackDocCount = feedbackDocs.length;
    expect(initialFeedbackDocCount).to.be.lessThan(maxFeedbackDocs);
    await browser.execute(() => console.error('omg what', new Error('omg what')));
    await browser.waitUntil(async () => (await chtDbUtils.getFeedbackDocs()).length === initialFeedbackDocCount + 1);
    feedbackDocs = await chtDbUtils.getFeedbackDocs();

    expect(feedbackDocs.at(-1)).to.deep.nested.include({ 'info.message': 'omg what' });

    await chtDbUtils.addReadDocs();
    await browser.execute(() => console.error('omg again', new Error('omg again')));

    await browser.waitUntil(async () => (await chtDbUtils.getFeedbackDocs()).length === initialFeedbackDocCount + 2);
    feedbackDocs = await chtDbUtils.getFeedbackDocs();
    expect(feedbackDocs.at(-1)).to.deep.nested.include({ 'info.message': 'omg again' });

    await chtDbUtils.clearFeedbackDocs();
  });
});
