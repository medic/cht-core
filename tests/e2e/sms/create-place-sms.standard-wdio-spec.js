const utils = require('../../utils');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const contactPage = require('../../page-objects/contacts/contacts.wdio.page');

const messageValue = 'N Potu';
const phoneNumber = '+12068881234';

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hostpital'
};

const sittuUser = {
  username: 'sittu-user',
  password: 'Pass@500',
  roles: ['district_admin'],
  place: {
    _id: 'someplace',
    type: 'health_center',
    name: 'Sittu Place',
    parent: 'PARENT_PLACE'
  },
  contact: {
    _id: 'someperson',
    name: 'Sittu',
    phone: phoneNumber
  },
  phone: phoneNumber
};

describe('SMS Test Forms', async () => {
  beforeEach(async () => {
    await utils.saveDocs([parentPlace]);
    await loginPage.cookieLogin();
  });

  it('create person via SMS', async () => {
    await utils.request({ method: 'POST', path: '/api/v1/users', body: sittuUser });

    await utils.request({ method: 'POST', path: '/api/sms', body: { messages: [ {
      id: 'some-message-id',
      from: phoneNumber,
      content: messageValue
    }] } });
    
    await commonPage.goToPeople('someplace');
    const allRHSPeople = await contactPage.getAllRHSPeopleNames();
    expect(allRHSPeople.sort()).toEqual(['Potu', sittuUser.contact.name]);
  });
});
