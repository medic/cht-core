const helper = require('../helper');
const concatenateStrings = require('../page-objects/forms/concatenate-strings.po');
const common = require('../page-objects/common/common.po');
const utils = require('../utils');
const constants = require('../constants');

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
  beforeAll(done => {
    Promise.resolve()
      .then(() => concatenateStrings.configureForm(userContactDoc, done))
      .catch(done.fail);
  });

  afterEach(done => {
    utils.resetBrowser();
    done();
  });

  afterAll(utils.afterEach);

  it('concatenates strings', () => {
    common.goToReports();

    // select form
    const addButton = element(
      by.css('.action-container .general-actions:not(.ng-hide) .fa-plus')
    );
    helper.waitElementToPresent(addButton);
    helper.clickElement(addButton);
    element(
      by.css(
        '.action-container .general-actions .dropup.open .dropdown-menu li:first-child a'
      )
    ).click();
    helper.waitElementToPresent(
      element(by.css('#concat'))
    );
    let name = element(by.name('/concatenate-strings/inputs/full_name')).getAttribute('value');
    expect(name).toEqual('John Doe');
    element(by.name('/concatenate-strings/inputs/first_name')).sendKeys('Bruce');
    element(by.name('/concatenate-strings/inputs/full_name')).click();
    name = element(by.name('/concatenate-strings/inputs/full_name')).getAttribute('value');
    expect(name).toEqual('Bruce Wayne');
  });
});
