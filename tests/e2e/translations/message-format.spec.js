const utils = require('../../utils');
const helper = require('../../helper');
const commonElements = require('../../page-objects/common/common.po');
const contactElements = require('../../page-objects/contacts/contacts.po');

describe('MessageFormat', () => {
  const createContact = () => utils.saveDoc({
    _id: 'district',
    name: 'The District',
    type: 'district_hospital',
    reported_date: 1000,
    parent: '',
  });

  afterEach(async () => {
    await utils.afterEach();
  });

  it('should display plurals correctly', async () => {
    await commonElements.goToReportsNative();
    await createContact();
    await commonElements.goToPeople();
    await contactElements.selectLHSRowByText('The District');

    const reportsFilter = await helper.getTextFromElements(contactElements.getReportsFilters(), 3);
    expect(reportsFilter.sort()).toEqual(['3 months', '6 months', 'View all'].sort());

    const tasksFilter = await helper.getTextFromElements(contactElements.getTasksFilters(), 3);
    expect(tasksFilter.sort()).toEqual(['1 week', '2 weeks', 'View all'].sort());

  });

  it('should work with botched translations', async () => {
    await commonElements.goToReportsNative();
    await utils.addTranslations('en', {
      'Messages': 'Messages {thing}',
      'Tasks': 'Tasks {thing',
      'Reports': 'Reports {{thing}}'
    });

    // wait for language to load
    await browser.wait(
      async () => await commonElements.getReportsButtonLabel().getText() === 'Reports {{thing}}',
      2000
    );

    expect(await commonElements.getReportsButtonLabel().getText()).toEqual('Reports {{thing}}');
    expect(await commonElements.getTasksButtonLabel().getText()).toEqual('Tasks {thing');
    expect(await commonElements.getMessagesButtonLabel().getText()).toEqual('Messages {thing}');
  });
});
