const helper = require('../../helper');
const utils = require('../../utils');
const commonElements = require('../../page-objects/common/common.po.js');
const contactPage = require('../../page-objects/contacts/contacts.po.js');
const uuid = require('uuid');
const districtId = uuid.v4();

describe('Creating contacts with standard config', function() {
  beforeAll(done => {
    return Promise.all([
      utils.saveDocs(expectedDocs)
    ])
    .then(() => done()).catch(done.fail);
  });
  
  const expectedDocs = [
    {
      _id: districtId,
      name: 'ADistrict',
      type: 'district_hospital',
      reported_date: Date.now(),
    },
    {
      _id: uuid.v4,
      parent: {
        _id: districtId
      },
      name: 'AHealthCenter',
      type: 'health_center',
      reported_date: Date.now(),
    }
  ];
  
  it('should create a new district hospital', async function() {
    const districtName = 'Test District';
    await commonElements.goToPeople();
    await contactPage.addNewDistrict(districtName);
    helper.waitUntilReady(contactPage.contactName);
    expect(contactPage.contactName.getText()).toBe(districtName);
  });

  it('should create a new health center', async function(){
    await commonElements.goToPeople();
    contactPage.selectLHSRowByText(expectedDocs[0].name);
    const hcName = 'Health Center 1';
    contactPage.addHealthCenter(hcName);
    helper.waitUntilReady(contactPage.contactName);
    expect(contactPage.contactName.getText()).toBe(hcName);
  });

  it('should create a new clinic', async function(){
    await commonElements.goToPeople();
    contactPage.selectLHSRowByText(expectedDocs[1].name);
    contactPage.addClinic();
    helper.waitUntilReady(contactPage.contactName);
    expect(contactPage.contactName.getText()).toBe('Clinic 1');
  });
});

