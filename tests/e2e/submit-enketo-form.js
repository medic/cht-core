const utils = require('../utils');
const helper = require('../helper');
const constants = require('../constants');
const commonElements = require('../page-objects/common/common.po.js');
const reportsPo = require('../page-objects/reports/reports.po');
const genericForm = require('../page-objects/forms/generic-form.po');

describe('Submit Enketo form', () => {
  const xml = `<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <h:head>
      <model>
        <instance>
          <data id="person" version="1">
            <name/>
            <meta><instanceID/></meta>
          </data>
        </instance>
        <bind nodeset="/data/name" type="string"/>
      </model>
    </h:head>
    <h:body>
      <input ref="/data/name">
        <label>person.field.name</label>
      </input>
    </h:body>
  </h:html>`;

  const contactId = constants.USER_CONTACT_ID;

  const docs = [
    {
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
    },
    {
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
  ];

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

  beforeAll(async () => {
    await utils.seedTestData(userContactDoc, docs);
  });

  afterEach(async () => {
    await utils.afterEach();
  });

  it('submits on reports tab', async () => {
    await commonElements.goToReportsNative();

    await helper.waitElementToBeClickable(reportsPo.submitReport);

    // select form
    await helper.clickElementNative(reportsPo.submitReport);
    await helper.waitElementToBeClickable(reportsPo.firstForm);
    await helper.clickElementNative(reportsPo.firstForm);

    // enter name

    await helper.waitElementToBeClickable(genericForm.nameField);
    await genericForm.nameField.sendKeys('Jones');

    // submit form

    await helper.waitUntilReadyNative(genericForm.submitButton);
    await helper.clickElementNative(genericForm.submitButton);
    await helper.waitElementToPresentNative(genericForm.submittedName);

    // check the submitted name
    await helper.waitUntilReadyNative(genericForm.submittedName);
    expect(await genericForm.submittedName.getText()).toBe('Jones');
  });
});
