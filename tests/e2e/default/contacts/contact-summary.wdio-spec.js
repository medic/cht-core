const commonElements = require('../../../page-objects/default/common/common.wdio.page.js');
const contactPage = require('../../../page-objects/default/contacts/contacts.wdio.page.js');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const reportFactory = require('../../../factories/cht/reports/generic-report');
const utils = require('../../../utils');

describe('Set contact summary and validate the info correspond', () => {
  const places = placeFactory.generateHierarchy();
  const bobPlace = places.get('clinic');
  const contactAlice = personFactory.build({ name: 'Alice Alison', phone: '+447765902001' });
  const contactDavid = personFactory.build({ name: 'David Davidson', phone: '+447765902002' });
  const contactCarol = personFactory.build({ name: 'Carol Carolina', parent: { _id: bobPlace._id } });
  const userHomeVisits = userFactory.build({
    username: 'user-home-visits',
    password: 'Sup3rSecret!',
    place: bobPlace._id,
    roles: ['national_admin'],
    contact: {
      _id: 'fixture:user-home-visits:offline',
      name: 'user-home-visits'
    }
  });
  const userDistrict = {
    username: 'user-district',
    password: 'Sup3rSecret!',
    place: bobPlace._id,
    roles: ['district_admin'],
    contact: {
      _id: 'fixture:user-district:offline',
      name: 'user-district'
    }
  };
  const docs = [...places.values(), contactAlice, contactDavid, contactCarol];

  before(async () => {
    await utils.saveDocs(docs);
    await utils.createUsers([userHomeVisits, userDistrict]);
  });


});
