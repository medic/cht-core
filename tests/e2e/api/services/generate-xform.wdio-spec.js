const fs = require('fs');
const utils = require('../../../utils');
const constants = require('../../../constants');
const commonPage = require('../../../page-objects/common/common.wdio.page');
const loginPage = require('../../../page-objects/login/login.wdio.page');
const reportsPage = require('../../../page-objects/reports/reports.wdio.page');

const xml = fs.readFileSync(`${__dirname}/../../../forms/required-note.xml`, 'utf8');
const formDocument = {
  _id: 'form:required-note',
  internalId: 'required-note',
  title: 'Required Note',
  type: 'form',
  _attachments: {
    xml: {
      content_type: 'application/octet-stream',
      data: Buffer.from(xml).toString('base64')
    }
  }
};
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
    _id: 'some_parent'
  }
};

describe('generate-xform service', () => {
  before(async () => {
    await loginPage.cookieLogin();
    await utils.seedTestData(userContactDoc, [formDocument]);
  });

  // If this test fails, it means something has gone wrong with the custom logic in openrosa2html5form.xsl
  // that should prevent notes from every being required.
  it('should allow forms with required notes to be submitted', async () => {
    await commonPage.goToReports();
    await reportsPage.openForm('Required Note');

    await reportsPage.submitForm();
  });
});
