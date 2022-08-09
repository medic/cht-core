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

const generatePlace = async (type, parent) => {
  const place = dataFactory.generatePlace(type, parent);
  await uploadData.saveJson(place);
  return place;
};

const generatePerson = async (parent, subtype, primary = false) => {
  const [personDoc, parentDoc] = dataFactory.generatePerson(parent, subtype, primary);
  await uploadData.saveJson(personDoc);
  parentDoc && await uploadData.saveJson(parentDoc);
  return personDoc;
};

const generateReports = async (person, parent) => {
  const reports = dataFactory.generateReports(person, parent);
  for (const report of reports) {
    await uploadData.saveJson(report);
  }
};

const generateUser = async (parent) => {
  const roles = userRolesByFacilityType[parent.type];
  const person = await generatePerson(parent);
  const user = userFactory.generateBracUser(undefined, roles, parent, person);
  users.push(user);
};

const generateHierarchy = async () => {
  const districtHospital = await generatePlace('district_hospital');
  for (let i = 0; i < config.contactsNbr.health_center; i++) {
    const healthCenter = await generatePlace('health_center', districtHospital);

    for (let c = 0; c < config.contactsNbr.chw; c++) {
      await generateUser(healthCenter);
    }

    for (let j = 0; j < config.contactsNbr.clinic; j++) {
      const clinic = await generatePlace('clinic', healthCenter);
      for (let k = 0; k < config.contactsNbr.person; k++) {
        const person = await generatePerson(clinic, null, !k);
        await generateReports(person, clinic);
      }
    }
  }

  await uploadData.uploadGeneratedDocs();
};

const generateData = async () => {
  await uploadData.createJsonDir();
  for (let i = 0; i < config.contactsNbr.district_hospital; i++) {
    await generateHierarchy();
  }
};


(async () => {
  try {
    await generateData();
    await uploadData.indexViews();
    await uploadData.generateLoginList(users);
    await uploadData.uploadUsers();
  } catch (err) {
    console.error('Error while generating data', err);
    process.exit(1);
  }
})();
