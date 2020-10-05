const utils = require('../../../utils');
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
});
