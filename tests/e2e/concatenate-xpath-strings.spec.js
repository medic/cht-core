const helper = require('../helper');
const concatenateStrings = require('../page-objects/forms/concatenate-strings.po');
const common = require('../page-objects/common/common.po');
const utils = require('../utils');
const constants = require('../constants');
const genericForm = require('../page-objects/forms/generic-form.po');

const userContactDoc = {
  _id: constants.USER_CONTACT_ID,
  name: 'Jack',
  date_of_birth: '',
  phone: '+64274444444',
  alternate_phone: '',
  notes: '',
  type: 'person',
  reported_date: 1478469976421,
  parent: {
    _id: 'some_parent',
  },
};

// If this test starts failing then we need to document in the release notes that we've removed the deprecated
// feature allowing for concatenation of strings
describe('Concatenate xpath strings', () => {
  beforeAll(() => concatenateStrings.configureForm(userContactDoc));
  afterEach(() => utils.afterEach());

  it('concatenates strings', async () => {
    await common.goToReportsNative();
    await genericForm.selectFormNative(concatenateStrings.formInternalId);
    await helper.waitElementToPresentNative(element(by.css('#concat')));

    let name = await element(by.name('/concatenate-strings/inputs/full_name')).getAttribute('value');
    expect(name).toEqual('John Doe');

    await element(by.name('/concatenate-strings/inputs/first_name')).sendKeys('Bruce');
    await element(by.name('/concatenate-strings/inputs/full_name')).click();

    name = await element(by.name('/concatenate-strings/inputs/full_name')).getAttribute('value');
    expect(name).toEqual('Bruce Wayne');
  });
});
