const utils = require('../../../utils');
const helper = require('../../../helper');
const commonElements = require('../../../page-objects/common/common.po.js');
const contactPage = require('../../../page-objects/contacts/contacts.po.js');
const uuid = require('uuid');
const districtId = uuid.v4();
const districtName = uuid.v4();
const healthCenterId = uuid.v4();
const healtchCenterName = uuid.v4();
const personName = uuid.v4();
const personId = uuid.v4();

describe('Editing contacts with the CHT config', function() {
  beforeAll(done => {
    utils.saveDocs(expectedDocs)
      .then(() => done())
      .catch(done.fail);
  });

  afterEach(utils.afterEach);

  const expectedDocs = [
    {
      _id: districtId,
      name: districtName,
      type: 'district_hospital',
      reported_date: Date.now()
    },
    {
      _id: healthCenterId,
      parent: {
        _id: districtId
      },
      name: healtchCenterName,
      type: 'health_center',
      reported_date: Date.now(),
      contact: {
        _id: personId,
        parent: {
          _id: healthCenterId,
          parent: { _id: districtId }
        }
      }
    },
    {
      type: 'person',
      _id: personId,
      name: personName,
      date_of_birth: '2000-02-01',
      sex: 'female',
      role: 'patient',
      parent: {
        _id: healthCenterId,
        parent: { _id: districtId }
      }
    },
    {
      type: 'person',
      _id: uuid.v4(),
      name: uuid.v4(),
      date_of_birth: '1989-02-01',
      sex: 'female',
      role: 'patient',
      parent: {
        _id: healthCenterId,
        parent: { _id: districtId }
      }
    }
  ];

  it('should remove the primary contact from the health center when the contact is deleted', async function() {
    commonElements.goToPeople();
    contactPage.selectLHSRowByText(healtchCenterName);
    contactPage.deleteContactByName(expectedDocs[2].name);
    commonElements.confirmDelete();
    contactPage.selectLHSRowByText(healtchCenterName);
    expect(contactPage.peopleRows.count()).toBe(0);
  });

  it('should update the primary contact to a new person', async function(){
    const expectedContact = expectedDocs[3];
    commonElements.goToPeople();
    contactPage.selectLHSRowByText(healtchCenterName);
    contactPage.selectNewPrimaryContact(expectedContact.name);  
    helper.waitUntilReady(contactPage.contactRowById(expectedContact._id));
    const text = await contactPage.peopleRows.first().getText();
    expect(text.split('\n')[0]).toBe(expectedContact.name);
  });
});