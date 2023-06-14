const realworldPlaceFactory = require('../../factories/real-world/contacts/place');
const realWorldPersonFactory = require('../../factories/real-world/contacts/person');
const realWorldUserFactory = require('../../factories/real-world/users/user');
const realWorldSurvey = require('../../factories/real-world/reports/survey');
const fs = require('fs');
const path = require('path');
const dataConfig = require('./data-config.json');
const sizeConfig = require('./size-config.json');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const args = process.argv.slice(2);
/**
* The initial idea was to parallelize this script and use the thread as the district hospital name.
* We need to improve this script to generate the users.csv header and config.json so that multiple threads
* can write simultaneously in the docs.
*/
const districtHospitalName = args[0] + '-districthospital';
const numberOfDistrictHospitals = sizeConfig.number_of_district_hospitals;
const numberOfManagersPerDistrictHospital = sizeConfig.number_of_managers_per_district_hospitals;
const numberOfHealthCentersPerDistrictHospital = sizeConfig.number_of_health_centers_per_district_hospital;
const numberOfChwPerHealthCenter = sizeConfig.number_of_chw_per_health_center;
const numberOfClinicsPerHealthCenter = sizeConfig.number_of_clinics_per_health_center;
const numberOfFamilyMembers = sizeConfig.number_of_family_members;
const dataDirectory = args[1];
const medicInstance = args[2];
const preconditionDirectory = dataConfig.precondition_data_directory;
const mainDirectory = dataConfig.main_script_data_directory;
const jsonDirectory = dataConfig.json_directory;
const preconditionDataDirectory = path.join(
  dataDirectory,
  dataConfig.precondition_data_directory,
  dataConfig.json_directory);
const mainDataDirectory = path.join(dataDirectory, dataConfig.main_script_data_directory);
const usersDirectory = path.join(dataDirectory, dataConfig.precondition_data_directory);
const dataExtension = dataConfig.json_data_extension;
const csvWriter = createCsvWriter({
  path: path.join(usersDirectory, 'users.csv'),
  header: [
    { id: 'username', title: 'username' },
    { id: 'password', title: 'password' },
    { id: 'roles', title: 'roles' },
    { id: 'contact', title: 'contact' },
    { id: 'phone', title: 'phone' },
    { id: 'place', title: 'place' },
  ],
  alwaysQuote: true
});

const users = [];
const managers = [];
const chwUsers = [];

const checkDataDirectory = async (directoryPath) => {
  try {
    await fs.promises.access(directoryPath);
  } catch (err) {
    console.error(err);
    throw new Error('Cant access data directory');
  }
};

const createDataDoc = async (folderPath, fileName, content, extension = dataExtension, replacer = {}) => {
  try {
    const filePath = path.join(folderPath, fileName + extension);
    await fs.promises.writeFile(filePath, JSON.stringify(content, replacer, 2));
  } catch (err) {
    console.error('CreateDataDoc ' + err);
    throw err;
  }
};

const createDataDirectory = async (directoryPath, directoryName) => {
  try {
    await fs.promises.mkdir(path.join(directoryPath, directoryName));
  } catch (err) {
    if (err.code === 'EEXIST') {
      return;
    }
    console.error('CreateDataDirectory ' + directoryName + ' failed - ' + err);
    throw err;
  }
};

const renameKey = (obj, oldKey, newKey) => {
  obj[newKey] = obj[oldKey];
  delete obj[oldKey];
};

const pairPlaceTypesRoles = {
  'district_hospital': 'supervisor',
  'health_center': 'district_admin',
  'clinic': null
};

const pairPlaceTypesNeedsUsers = {
  'district_hospital': true,
  'health_center': true,
  'clinic': false
};

const pairPlaceTypesPersonSubtype = {
  'district_hospital': 'manager',
  'health_center': 'chw',
  'clinic': 'member_eligible_woman'
};

const generatePerson = async (type, parents, isPrimaryContact) => {
  let subtype = pairPlaceTypesPersonSubtype[type];
  if (type === 'clinic' && !isPrimaryContact) {
    subtype = 'other';
  }
  const person = realWorldPersonFactory.generatePerson(parents, subtype);
  await createDataDoc(preconditionDataDirectory, person._id, person);
  if (type === 'district_hospital') {
    managers.push(person);
  }
  return person;
};

const generateUser = async (type, placeId, userName, person, isPrimaryContact) => {
  let roles = pairPlaceTypesRoles[type];
  if (isPrimaryContact && type === 'district_hospital') {
    roles = ['national_admin', 'mm-online'];
  }
  const personUser = realWorldUserFactory.generateUser(
    userName,
    roles,
    placeId);
  await createDataDoc(preconditionDataDirectory, personUser._id, personUser);
  const user = {
    username: userName,
    password: personUser.password,
    roles: personUser.roles,
    contact: person._id,
    phone: person.phone,
    place: personUser.facility_id
  };
  users.push(user);
  if (user.roles === 'district_admin') {
    chwUsers.push(user);
  }
};

const generateReports = async (parentPlace, place, person, isMainData) => {
  let reportsDirectory = preconditionDataDirectory;
  if (isMainData) {
    reportsDirectory = path.join(mainDataDirectory, parentPlace.contact._id);
    await createDataDirectory(mainDataDirectory, parentPlace.contact._id);
  }
  if (realWorldPersonFactory.shouldGeneratePregnancySurvey(person)) {
    const pregnancySurvey = realWorldSurvey.generaterealWorldSurvey('pregnancy', parentPlace, place, person);
    await createDataDoc(reportsDirectory, pregnancySurvey._id, pregnancySurvey);
  }
  if (realWorldPersonFactory.shouldGenerateAssessmentSurvey(person)) {
    const assesmentSurvey = realWorldSurvey.generaterealWorldSurvey('assesment', parentPlace, place, person);
    await createDataDoc(reportsDirectory, assesmentSurvey._id, assesmentSurvey);
    const assesmentFollowUpSurvey = realWorldSurvey.generaterealWorldSurvey(
      'assesment_follow_up', parentPlace, place, person);
    await createDataDoc(reportsDirectory, assesmentFollowUpSurvey._id, assesmentFollowUpSurvey);
  }
};

const generateHierarchy = async (type, placeName, parentPlace, numberOfPersons) => {
  let placeLineage = null;
  if (parentPlace) {
    placeLineage = { _id: parentPlace._id, parent: parentPlace.parent };
  }
  const place = realworldPlaceFactory.generatePlace(placeName, type, placeLineage);
  const personLineage = { _id: place._id, parent: place.parent };

  let isPrimaryContact = true;
  for (let i = 0; i < numberOfPersons; i++) {
    const person = await generatePerson(type, personLineage, isPrimaryContact);
    if (isPrimaryContact) {
      place.contact = person;
      await createDataDoc(preconditionDataDirectory, place._id, place);
    }
    const needUser = pairPlaceTypesNeedsUsers[type];
    if (needUser) {
      await generateUser(
        type,
        place._id,
        person.short_name.toLowerCase() + placeName + 'user' + i,
        person,
        isPrimaryContact);
    }
    if (realWorldPersonFactory.shouldGenerateSurvey(person)) {
      await generateReports(parentPlace, place, person, (i % 2 !== 0));
    }
    isPrimaryContact = false;
  }
  return place;
};

const generateData = async () => {
  await checkDataDirectory(dataDirectory);
  await createDataDirectory(dataDirectory, preconditionDirectory);
  await createDataDirectory(dataDirectory, mainDirectory);
  await createDataDirectory(path.join(dataDirectory, preconditionDirectory), jsonDirectory);
  for (let dh = 0; dh < numberOfDistrictHospitals; dh++) {
    managers.splice(0, managers.length);
    const districtHospital = await generateHierarchy(
      'district_hospital',
      districtHospitalName + 'districthospital' + dh,
      null,
      numberOfManagersPerDistrictHospital);
    for (let hc = 0; hc < numberOfHealthCentersPerDistrictHospital; hc++) {
      const healthCenterName = districtHospitalName + 'districthospital' + dh + 'healthcenter' + hc;
      const healthCenter = await generateHierarchy(
        'health_center',
        healthCenterName,
        districtHospital,
        numberOfChwPerHealthCenter);

      for (let c = 0; c < numberOfClinicsPerHealthCenter; c++) {
        const clinicName = districtHospitalName + 'districthospital' + dh + 'healthcenter' + hc + 'clinic' + c;
        await generateHierarchy(
          'clinic',
          clinicName,
          healthCenter,
          numberOfFamilyMembers);
      }
    }
  }
  await csvWriter.writeRecords(users);

  chwUsers.forEach(obj => renameKey(obj, 'username', 'name'));
  chwUsers.forEach(obj => renameKey(obj, 'password', 'pass'));

  const config2 = {
    data_directory: mainDataDirectory,
    url: medicInstance,
    users: chwUsers
  };
  await createDataDoc(
    '../replicate-real-world-docs',
    'config',
    config2,
    '.json',
    ['data_directory', 'url', 'users', 'name', 'pass', 'contact']);
};

generateData();
