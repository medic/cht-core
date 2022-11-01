const utils = require('../../../utils');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const contactPage = require('../../../page-objects/default/contacts/contacts.wdio.page');
const placeFactory = require('../../../factories/cht/contacts/place');
const userFactory = require('../../../factories/cht/users/users');
const gatewayApiUtils = require('../../../gateway-api.utils');

const messageValue = 'N Potu';

const places = placeFactory.generateHierarchy();
const hcId = places.get('health_center')._id;

const user = userFactory.build({ place: hcId });

describe('SMS Test Forms', async () => {
  beforeEach(async () => {
    await utils.saveDocs(places.values());
    await loginPage.cookieLogin();
  });

  it('create person via SMS', async () => {
    await utils.createUsers([user]);

    await gatewayApiUtils.api.postMessage({
      id: 'some-message-id',
      from: user.phone,
      content: messageValue
    });

    await commonPage.goToPeople(user.place);
    const allRHSPeople = await contactPage.getAllRHSPeopleNames();
    expect(allRHSPeople.length).to.equal(2);
    expect(allRHSPeople).to.include.members(['Potu', user.contact.name]);
  });
});
