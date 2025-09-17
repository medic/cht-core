const path = require('path');
const Faker = require('@faker-js/faker');
const factoryPath = path.join(__dirname, '../../factories/real-world');
const placeFactory = require(path.join(factoryPath, 'contacts/place'));
const personFactory = require(path.join(factoryPath, 'contacts/person'));
const surveyFactory = require(path.join(factoryPath, 'reports/survey'));

const personSubtypeByParentType = {
  'district_hospital': ['manager'],
  'health_center': ['chw'],
  'clinic': ['member_eligible_woman', 'member_child'],
};

const getRandomPersonSubtype = (parent) => {
  const subTypes = personSubtypeByParentType[parent.type];
  const idx = Math.floor(Math.random() * subTypes.length);
  return subTypes[idx];
};

const generatePerson = (parent, subtype, primary = false) => {
  const docs = [];

  const lineage = { _id: parent._id, parent: parent.parent };
  subtype = subtype || getRandomPersonSubtype(parent);
  const person = personFactory.generatePerson(lineage, subtype);
  docs.push(person);
  if (primary) {
    parent.contact = { _id: person._id, parent: lineage };
    docs.push(parent);
  }
  return docs;
};

const generateReports = (person, parent) => {
  const docs = [];
  if (!personFactory.shouldGenerateSurvey(person)) {
    return docs;
  }

  if (personFactory.shouldGeneratePregnancySurvey(person)) {
    const pregnancySurvey = surveyFactory.generateSurvey('pregnancy', parent, person, person);
    const assesmentSurvey = surveyFactory.generateSurvey('assesment', parent, person, person);
    docs.push(pregnancySurvey, assesmentSurvey);
  }

  if (personFactory.shouldGenerateAssessmentSurvey(person)) {
    const assesmentSurvey = surveyFactory.generateSurvey('assesment', parent, person, person);
    const assesmentFollowUpSurvey = surveyFactory.generateSurvey('assesment_follow_up', parent, person, person);
    docs.push(assesmentSurvey, assesmentFollowUpSurvey);
  }

  return docs;
};

const generatePlace = (type, parent) => {
  const lineage = parent && { _id: parent._id, parent: parent.parent };
  
  let name = '';
  if (type === 'district_hospital') {
    name = `District Hospital ${Faker.faker.person.firstName()}`;
  } else if (type === 'health_center') {
    name = `Health Center ${Faker.faker.person.firstName()}`;
  } else if (type === 'clinic') {
    name = `Clinic ${Faker.faker.person.firstName()}`;
  } else {
    name = `${type} ${Faker.faker.person.firstName()}`;
  }
  
  const place = placeFactory.generatePlace(name, type, lineage);
  return place;
};

module.exports = {
  generatePlace,
  generatePerson,
  generateReports,
};