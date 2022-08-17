const path = require('path');

const config = require('./config');
const factoryPath = path.join(__dirname, '../../factories/brac');
const userFactory = require(path.join(factoryPath, 'users/brac-user'));
const dataFactory = require('./data-factory');
const uploadData = require('./upload-data');

const users = [];

const userRolesByFacilityType = {
  'district_hospital': ['supervisor'],
  'health_center': ['district_admin', 'chw'],
  'clinic': null
};

const generatePerson = async (parent, subtype, primary = false) => {
  const [personDoc, parentDoc] = dataFactory.generatePerson(parent, subtype, primary);
  await uploadData.saveJson(personDoc);
  parentDoc && await uploadData.saveJson(parentDoc);
  return personDoc;
};

const generateUser = async (parent) => {
  const roles = userRolesByFacilityType[parent.type];
  const person = await generatePerson(parent);
  const user = userFactory.generateBracUser(undefined, roles, parent, person);
  users.push(user);
  await uploadData.uploadGeneratedDocs();
};

(async () => {
  try {
    const places = await uploadData.getHealthCenters();
    for (const place of places) {
      for (let c = 0; c < config.contactsNbr.chw; c++) {
        await generateUser(place);
      }
    }
    await uploadData.generateLoginList(users);
    console.log('-------------- Uploading users ---------------');
    await uploadData.uploadUsers();
  } catch (err) {
    console.error('Error while generating data', err);
    process.exit(1);
  }
})();
