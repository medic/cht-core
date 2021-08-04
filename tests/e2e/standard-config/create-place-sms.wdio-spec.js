const smspage = require('../../page-objects/admin/sms.wdio.page');
const utils = require('../../utils');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const contactPage = require('../../page-objects/contacts/contacts.wdio.page');
const usersAdminPage = require('../../page-objects/admin/user.wdio.page');

const messageValue = 'N Potu';
const phoneNumber = '+12068881234';

const placeFactory = require('../../factories/cht/contacts/place');
const personFactory = require('../../factories/cht/contacts/person');
const places = placeFactory.generateHierarchy(); // This generates ['district_hospital', 'health_center', 'clinic']
const sittuPerson = personFactory.build(
  {
    name: 'Sittu',
    phone: phoneNumber,
    parent: {
      _id: places[0]._id,
      parent: places[0].parent
    }
  });

describe('SMS Test Forms', async () => {
  beforeEach(async () => {
    await utils.saveDocs([...places, sittuPerson]);
    await loginPage.cookieLogin();
  });

  it('create person via SMS', async () => {    
    await usersAdminPage.goToAdminUser();
    await usersAdminPage.openAddUserDialog();
    await usersAdminPage.inputAddUserFields('sittu', 'Sittu', 'Regional manager - restricted to their place',
      places[0].name, sittuPerson.name, 'Pass@500', phoneNumber);
    await usersAdminPage.saveUser();

    await smspage.goToAdminSms();
    await smspage.inputMessageInfoAndSubmit(messageValue, phoneNumber);
    await commonPage.goToPeople();
    await contactPage.selectLHSRowByText(places[0].name);
    const allRHSPeople = await contactPage.getAllRHSPeopleNames();
    expect(allRHSPeople.sort()).toEqual(['Potu', sittuPerson.name]);
  });
});
