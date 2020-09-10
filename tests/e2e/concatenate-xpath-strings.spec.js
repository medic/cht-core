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
      element(by.css('#concat #first-name'))
    );
    element(by.css('#concat #first-name')).sendKeys('Bruce');
    helper.waitElementToPresent(
      element(by.css('#concat #full-name'))
    );
    expect(element(by.css('#concat #full-name'))).toEqual('Bruce Wayne');
  });
});
