const fs = require('fs');
const { expect } = require('chai');
const utils = require('@utils');
const constants = require('@constants');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const requireNodeXml = fs.readFileSync(`${__dirname}/forms/required-note.xml`, 'utf8');

describe('Submit Enketo form', () => {
  const xml = `<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <h:head>
      <model>
        <instance>
          <data id="person" version="1">
            <name/>
            <today/>
            <meta><instanceID/></meta>
          </data>
        </instance>
        <bind nodeset="/data/name" type="string"/>
        <!-- Calculate with value that changes - https://github.com/medic/cht-core/issues/7910 -->
        <bind nodeset="/data/today" type="string" calculate="now()"/>
      </model>
    </h:head>
    <h:body>
      <input ref="/data/name">
        <label>person.field.name</label>
      </input>
    </h:body>
  </h:html>`;

  const contactId = constants.USER_CONTACT_ID;

  const assessmentForm = {
    _id: 'form:assessment',
    internalId: 'A',
    title: 'Assessment',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(xml).toString('base64'),
      },
    },
  };

  const requiredNoteForm = {
    _id: 'form:required-note',
    internalId: 'required-note',
    title: 'Required Note',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(requireNodeXml).toString('base64')
      }
    }
  };

  const district = {
    _id: 'c49385b3594af7025ef097114104ef48',
    reported_date: 1469578114543,
    notes: '',
    contact: {
      _id: contactId,
      name: 'Jack',
      date_of_birth: '',
      phone: '+64274444444',
      alternate_phone: '',
      notes: '',
      type: 'person',
      reported_date: 1478469976421,
    },
    name: 'Number three district',
    external_id: '',
    type: 'district_hospital',
  };

  const userContactDoc = {
    _id: contactId,
    name: 'Jack',
    date_of_birth: '',
    phone: '+64274444444',
    alternate_phone: '',
    notes: '',
    type: 'person',
    reported_date: 1478469976421,
    parent: {
      _id: 'c49385b3594af7025ef097114104ef48',
      reported_date: 1469578114543,
      notes: '',
      contact: {
        _id: contactId,
        name: 'Jack',
        date_of_birth: '',
        phone: '+64274444444',
        alternate_phone: '',
        notes: '',
        type: 'person',
        reported_date: 1478469976421,
      },
      name: 'Number three district',
      external_id: '',
      type: 'district_hospital',
    },
  };

  before(async () => {
    await loginPage.cookieLogin();
    await utils.seedTestData(userContactDoc, [ assessmentForm, district, requiredNoteForm ]);
  });

  it('submits on reports tab', async () => {
    await commonElements.goToReports();
    await commonElements.openFastActionReport(assessmentForm.internalId, false);

    // enter name
    await commonEnketoPage.setInputValue('person.field.name', 'Jones');

    // submit form
    await (await genericForm.submitButton()).click();

    // check the submitted name
    await (await reportsPage.firstReportDetailField()).waitForDisplayed();
    expect(await (await reportsPage.firstReportDetailField()).getText()).to.equal('Jones');
  });

  // If this test fails, it means something has gone wrong with the custom logic in openrosa2html5form.xsl
  // that should prevent notes from ever being required.
  it('allows forms with required notes to be submitted', async () => {
    await commonElements.goToReports();
    await commonElements.openFastActionReport(requiredNoteForm.internalId, false);
    await reportsPage.submitForm();
  });

  it('cancelling form with no input does not trigger confirmation dialog', async () => {
    await commonElements.goToReports();
    const originalReportsText = await reportsPage.getAllReportsText();
    await commonElements.openFastActionReport(assessmentForm.internalId, false);
    // Do not set any values before cancelling
    await (await genericForm.cancelButton()).click();

    await commonElements.waitForPageLoaded();
    await (await reportsPage.noReportSelectedLabel()).waitForDisplayed();
    // No new report added
    expect(await reportsPage.getAllReportsText()).to.deep.equal(originalReportsText);
  });

  it('cancelling form with input triggers confirmation dialog box', async () => {
    await commonElements.goToReports();
    const originalReportsText = await reportsPage.getAllReportsText();
    await commonElements.openFastActionReport(assessmentForm.internalId, false);
    await commonEnketoPage.setInputValue('person.field.name', 'Jones');
    await (await genericForm.cancelButton()).click();

    await modalPage.submit();

    await commonElements.waitForPageLoaded();
    await (await reportsPage.noReportSelectedLabel()).waitForDisplayed();
    // No new report added
    expect(await reportsPage.getAllReportsText()).to.deep.equal(originalReportsText);
  });
});
