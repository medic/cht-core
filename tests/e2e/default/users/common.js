const utils = require('@utils');

const personFactory = require('@factories/cht/contacts/person');
const placeFactory = require('@factories/cht/contacts/place');

const OFFLINE_USER_ROLE = 'chw';
const USERNAME = 'jackuser';

const places = placeFactory.generateHierarchy();
const districtHospital = places.get('district_hospital');

const districtHospital2 = placeFactory.place().build({
  name: 'district_hospital',
  type: 'district_hospital',
});

const person = personFactory.build({ parent: districtHospital, roles: [OFFLINE_USER_ROLE] });

const user = {
  username: USERNAME,
  place: [
    districtHospital._id
  ],
  roles: [
    OFFLINE_USER_ROLE
  ],
  contact: person._id,
  oidc_username: `${USERNAME}@ssollinc.com`
};

const createUser = () => {
  utils.createUsers([user]);
};

const createHierarchy = async () => {
  await utils.saveDocs([...places.values(), person, districtHospital2]);
};

const updateSettings =  async () => { 
  const settings = await utils.getSettings();
  await utils.updateSettings({
    permissions: { ...settings.permissions, can_have_multiple_places: [OFFLINE_USER_ROLE] },
    oidc_provider: {
      discovery_url: 'https://discovery_url.com',
      client_id: 'cht'
    }
  }, { ignoreReload: true });
};

module.exports = {
  user,
  person,
  districtHospital,
  districtHospital2,
  createUser,
  createHierarchy,
  updateSettings
};
