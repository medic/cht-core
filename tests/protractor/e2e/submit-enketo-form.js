const utils = require('../utils'),
      auth = require('../auth')();

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

 const contactId = '3b3d50d275280d2568cd36281d00348b';
  //const userSettingsDocId = `org.couchdb.user:${auth.user}`;

  const docs = [
    {
      _id: 'form:assessment',
      internalId: 'A',
      title: 'Assessment',
      type: 'form',
      _attachments: {
        xml: {
          content_type: 'application/octet-stream',
          data: new Buffer(xml).toString('base64')
        }
      }
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
        reported_date: 1478469976421
      },
      name: 'Number three district',
      external_id: '',
      type: 'district_hospital'
    },
    {
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
          reported_date: 1478469976421
        },
        name: 'Number three district',
        external_id: '',
        type: 'district_hospital'
      }
    }
  ];

 
 beforeAll(function(done) {
    utils.seedTestData(done,contactId, docs);
  });

  afterEach(function(done) {
    utils.resetBrowser();
    done();
  });

  afterAll(utils.afterEach);

  it('submits on reports tab', () => {
    element(by.id('reports-tab')).click();

    // refresh - live list only updates on changes but changes are disabled for e2e
    browser.driver.navigate().refresh();
    browser.wait(() => {
      return element(by.css('.action-container .general-actions .fa-plus')).isPresent();
    }, 10000);

    // select form
    element(by.css('.action-container .general-actions .fa-plus')).click();
    element(by.css('.action-container .general-actions .dropup.open .dropdown-menu li:first-child a')).click();
    browser.wait(() => {
      return element(by.css('#report-form form [name="/data/name"]')).isPresent();
    }, 10000);

    // submit form
    element(by.css('#report-form form [name="/data/name"]')).sendKeys('Jones');
    element(by.css('#report-form .submit')).click();
    browser.wait(() => {
      return element(by.css('#reports-content .details ul li:first-child p')).isPresent();
    }, 10000);

    browser.sleep(100); // TODO required to make the test deterministic. https://github.com/medic/medic-webapp/issues/3509

    // check the submitted name
    expect(element(by.css('#reports-content .details ul li:first-child p')).getText()).toBe('Jones');

  });
});
