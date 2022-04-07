const bracPlaceFactory = require('../../factories/brac/contacts/brac-place');
const bracPersonFactory = require('../../factories/brac/contacts/brac-person');
const bracUserFactory = require('../../factories/brac/users/brac-user');
const bracSurvey = require('../../factories/brac/reports/brac-survey');
const fs = require('fs');
const Faker = require('@faker-js/faker');
const dataConfig = require('./data-config.json');

//const [, , threadId] = process.argv;
//TODO threadId from Jmeter to speed up the data creation;
const districtHospitalName = 'finalassesment';

//TODO maybe it is better to have this min max values on config file and use Faker to randomize the sizes
const numberOfDistrictHospitals = 2; //Production data 150 DH
const numberOfManagersPerDistrictHospital = 4; //Production data aprox 5 managers per DH

const numberOfHealthCentersPerDistrictHospital = 4;//Production data 60 HC per DH
const numberOfChwPerHealthCenter = 1;//Production data 1 CHP per HC

const numberOfClinicsPerHealthCenter = 10;//Production data 150 Families per HC
const numberOfFamilyMembers = 6;//Production data aprox 10 family member per family

const dataDirectory = dataConfig.dataDirectory + dataConfig.jsonDirectory;
const usersDirectory = dataConfig.dataDirectory;
const dataExtension = dataConfig.jsonDataExtension;
const userNameExtension = dataConfig.userDataNameExtension;
const usersStream = fs.createWriteStream(usersDirectory + userNameExtension, { flags: 'a' });

//Managers that would be use as supervisors in subsequent levels
const managers = [];

const createDataDoc = (directory, content) => {
  fs.writeFile(directory, content, err => {
    if (err) {
      console.error(err);
      return;
    }
  });
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


const generateHierarchy = (type, placeName, numberOfPersons,
  parentFirstLevelId, parentSecondLevelId, directParentPlace) => {

  const place = bracPlaceFactory.generateBracPlace(placeName, type,
    setParents(parentFirstLevelId, parentSecondLevelId));

  const needUser = pairPlaceTypesNeedsUsers[type];
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
    let roles = pairPlaceTypesRoles[type];
    let subtype = pairPlaceTypesPersonSubtype[type];

    if (type === 'clinic' && !isPrimaryContact) {
      subtype = 'other';
    }

    const person = bracPersonFactory.generateBracPerson(setParents(parentPersonFirstLevelId,
      parentPersonSecondLevelId, parentPersonThirdLevelId), subtype);
    if (isPrimaryContact) {
      place.contact = person;
      createDataDoc(dataDirectory + place._id + dataExtension, JSON.stringify(place, {}, 2));
      if (type === 'district_hospital') {
        roles = ['national_admin', 'mm-online'];
      }
    }
    createDataDoc(dataDirectory + person._id + dataExtension, JSON.stringify(person, {}, 2));

    if (type === 'district_hospital') {
      managers.push(person);
    }

    if (needUser) {
      const personUSer = bracUserFactory.generateBracUser(
        person.short_name.toLowerCase() + placeName + 'user' + i, roles, place._id);
      createDataDoc(dataDirectory + personUSer._id + dataExtension, JSON.stringify(personUSer, {}, 2));
      const csvContent = '"' + person.short_name.toLowerCase() + placeName + 'user' + i
        + '","' + personUSer.password + '","' + personUSer.roles + '","' + person._id + '","'
        + person.phone + '","' + personUSer.facility_id + '"\n';
      usersStream.write(csvContent);
    }


    if (person.family_member_type === 'member_eligible_woman') {
      if (person.group_other_woman_pregnancy.other_woman_pregnant) {
        const pregnancySurvey = bracSurvey.generateBracSurvey('pregnancy', directParentPlace, place, person);
        createDataDoc(dataDirectory + pregnancySurvey._id + dataExtension, JSON.stringify(pregnancySurvey, {}, 2));
      }
    }
    if (person.family_member_type === 'member_child') {
      const assesmentSurvey = bracSurvey.generateBracSurvey('assesment', directParentPlace, place, person);
      createDataDoc(dataDirectory + assesmentSurvey._id + dataExtension, JSON.stringify(assesmentSurvey, {}, 2));
    }

    isPrimaryContact = false;
  }

  return place;
};


const generateData = () => {

  const usersCsvHeader = '"username","password","roles","contact","phone","place"\n';
  usersStream.write(usersCsvHeader);

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

  usersStream.end();
};

generateData();
