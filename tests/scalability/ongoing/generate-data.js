const path = require('path');

const config = require('./config');
const factoryPath = path.join(__dirname, '../../factories/real-world');
const userFactory = require(path.join(factoryPath, 'users/user'));
const dataFactory = require('./data-factory');
const uploadData = require('./upload-data');

const users = [];
let userCounter = 1; 

const userRolesByFacilityType = {
  'district_hospital': ['chw_supervisor', 'district_admin'],
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
  const personDoc = await generatePerson(parent);
  const user = userFactory.generateUser(personDoc.name, roles, parent);
  
  const cleanName = user.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); 
  
  const uniqueUsername = `scal${cleanName}${userCounter}`;
  userCounter++;
  
  const chtUser = {
    username: uniqueUsername,
    password: user.password,
    roles: user.roles,
    place: user.facility_id._id,
    contact: personDoc._id
  };
  
  users.push(chtUser);
};

const generateHierarchy = async () => {
  const districtHospital = await generatePlace('district_hospital');
  
  await generateUser(districtHospital);
  
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
