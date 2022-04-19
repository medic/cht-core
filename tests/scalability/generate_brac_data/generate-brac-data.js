const bracPlaceFactory = require('../../factories/brac/contacts/brac-place');
const bracPersonFactory = require('../../factories/brac/contacts/brac-person');
const bracUserFactory = require('../../factories/brac/users/brac-user');
const bracSurvey = require('../../factories/brac/reports/brac-survey');
const fs = require('fs');
const path = require('path');
const Faker = require('@faker-js/faker');
const dataConfig = require('./data-config.json');
const sizeConfig = require('./size-config.json');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const args = process.argv.slice(2);
//const [, , threadId, directory] = process.argv;
const districtHospitalName = args[0] + '-districthospital';
const numberOfDistrictHospitals = sizeConfig.number_of_district_hospitals;
const numberOfManagersPerDistrictHospital = sizeConfig.number_of_managers_per_district_hospitals;
const numberOfHealthCentersPerDistrictHospital = sizeConfig.number_of_health_centers_per_district_hospital;
const numberOfChwPerHealthCenter = sizeConfig.number_of_chw_per_health_center;
const numberOfClinicsPerHealthCenter = sizeConfig.number_of_clinics_per_health_center;
const numberOfFamilyMembers = sizeConfig.number_of_family_members;
const dataDirectory = args[1];
const preconditionDirectory = dataConfig.precondition_data_directory;
const mainDirectory = dataConfig.main_script_data_directory;
const jsonDirectory = dataConfig.json_directory;
const preconditionDataDirectory = path.join(dataDirectory, dataConfig.precondition_data_directory, dataConfig.json_directory);
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
  alwaysQuote: true,
  append: true
});

const users = [];
const managers = [];

const createDataDoc = async (filePath, fileName, content) => {
  try {
    await fs.promises.writeFile(path.join(filePath, fileName), content);
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

const setParents = (firstLevelId, secondLevelId, thirdLevelId) => {
  return {
    _id: firstLevelId,
    parent: {
      _id: secondLevelId,
      parent: {
        _id: thirdLevelId
      }
    }
  };
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

const generatePerson = (type, parents, isPrimaryContact) => {
  let subtype = pairPlaceTypesPersonSubtype[type];
  if (type === 'clinic' && !isPrimaryContact) {
    subtype = 'other';
  }
  const person = bracPersonFactory.generateBracPerson(parents, subtype);
  createDataDoc(preconditionDataDirectory, person._id + dataExtension, JSON.stringify(person, {}, 2));
  if (type === 'district_hospital') {
    managers.push(person);
  }
  return person;
}

const generateUser = (type, placeId, userName, person, isPrimaryContact) => {
  let roles = pairPlaceTypesRoles[type];
  if (isPrimaryContact && type === 'district_hospital') {
    roles = ['national_admin', 'mm-online'];
  }
  const personUser = bracUserFactory.generateBracUser(
    userName,
    roles,
    placeId);
  createDataDoc(preconditionDataDirectory, personUser._id + dataExtension, JSON.stringify(personUser, {}, 2));
  const user = {
    username: userName,
    password: personUser.password,
    roles: personUser.roles,
    contact: person._id,
    phone: person.phone,
    place: personUser.facility_id
  };
  users.push(user);
}

const generateReports = (directParentPlace, place, person, isMainData) => {
  if (person.family_member_type === 'member_eligible_woman' || person.family_member_type === 'member_child') {
    let reportsDirectory = preconditionDataDirectory;
    if (isMainData) {
      reportsDirectory = path.join(mainDataDirectory, directParentPlace.contact._id);
      createDataDirectory(mainDataDirectory, directParentPlace.contact._id);
    }
    if (person.family_member_type === 'member_eligible_woman') {
      if (person.group_other_woman_pregnancy.other_woman_pregnant) {
        const pregnancySurvey = bracSurvey.generateBracSurvey('pregnancy', directParentPlace, place, person);
        createDataDoc(reportsDirectory, pregnancySurvey._id + dataExtension, JSON.stringify(pregnancySurvey, {}, 2));
      }
    }
    if (person.family_member_type === 'member_child') {
      const assesmentSurvey = bracSurvey.generateBracSurvey('assesment', directParentPlace, place, person);
      createDataDoc(reportsDirectory, assesmentSurvey._id + dataExtension, JSON.stringify(assesmentSurvey, {}, 2));
      const assesmentFollowUpSurvey = bracSurvey.generateBracSurvey(
        'assesment_follow_up', directParentPlace, place, person);
      createDataDoc(reportsDirectory, assesmentFollowUpSurvey._id + dataExtension,
        JSON.stringify(assesmentFollowUpSurvey, {}, 2));
    }
  }
}

const generateHierarchy = (type, placeName, numberOfPersons,
  parentFirstLevelId, parentSecondLevelId, directParentPlace) => {
  let place = bracPlaceFactory.generateBracPlace(placeName, type,
    setParents(parentFirstLevelId, parentSecondLevelId));
  let parentPersonThirdLevelId = null;
  let parentPersonSecondLevelId = null;
  let parentPersonFirstLevelId = null;
  if (type === 'district_hospital') {
    parentPersonFirstLevelId = place._id;
  }
  if (type === 'health_center') {
    parentPersonFirstLevelId = place._id;
    parentPersonSecondLevelId = parentFirstLevelId;
    const randomIndex = Faker.faker.datatype.number(numberOfManagersPerDistrictHospital - 1);
    place.supervisor = managers[randomIndex]._id;
  }
  if (type === 'clinic') {
    parentPersonFirstLevelId = place._id;
    parentPersonSecondLevelId = parentFirstLevelId;
    parentPersonThirdLevelId = parentSecondLevelId;
  }
  let isPrimaryContact = true;
  for (let i = 0; i < numberOfPersons; i++) {
    const person = generatePerson(type, setParents(parentPersonFirstLevelId,
      parentPersonSecondLevelId, parentPersonThirdLevelId), isPrimaryContact);
    if (isPrimaryContact) {
      place.contact = person;
      createDataDoc(preconditionDataDirectory, place._id + dataExtension, JSON.stringify(place, {}, 2));
    }
    const needUser = pairPlaceTypesNeedsUsers[type];
    if (needUser) {
      generateUser(type, place._id, person.short_name.toLowerCase() + placeName + 'user' + i, person, isPrimaryContact);
    }
    generateReports(directParentPlace, place, person, (i % 2 !== 0));
    isPrimaryContact = false;
  }
  return place;
};

const generateData = () => {
  createDataDirectory(dataDirectory, preconditionDirectory);
  createDataDirectory(dataDirectory, mainDirectory);
  createDataDirectory(path.join(dataDirectory, preconditionDirectory), jsonDirectory);

  for (let dh = 0; dh < numberOfDistrictHospitals; dh++) {
    managers.splice(0, managers.length);
    const districtHospital = generateHierarchy(
      'district_hospital',
      districtHospitalName + 'districthospital' + dh,
      numberOfManagersPerDistrictHospital);

    for (let hc = 0; hc < numberOfHealthCentersPerDistrictHospital; hc++) {
      const healthCenter = generateHierarchy(
        'health_center',
        districtHospitalName + 'districthospital' + dh + 'healthcenter' + hc,
        numberOfChwPerHealthCenter, districtHospital._id);

      for (let c = 0; c < numberOfClinicsPerHealthCenter; c++) {
        generateHierarchy('clinic',
          districtHospitalName + 'districthospital' + dh + 'healthcenter' + hc + 'clinic' + c,
          numberOfFamilyMembers, healthCenter._id, districtHospital._id, healthCenter);
      }
    }
  }
  csvWriter.writeRecords(users);
};

generateData();
