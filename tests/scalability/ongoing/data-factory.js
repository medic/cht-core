const path = require('path');
const factoryPath = path.join(__dirname, '../../factories/brac');
const placeFactory = require(path.join(factoryPath, 'contacts/brac-place'));
const personFactory = require(path.join(factoryPath, 'contacts/brac-person'));
const surveyFactory = require(path.join(factoryPath, 'reports/brac-survey'));

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
  const person = personFactory.generateBracPerson(lineage, subtype);
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
    const pregnancySurvey = surveyFactory.generateBracSurvey('pregnancy', parent, person);
    const assesmentSurvey = surveyFactory.generateBracSurvey('assesment', parent, person);
    docs.push(pregnancySurvey, assesmentSurvey);
  }

  if (personFactory.shouldGenerateAssessmentSurvey(person)) {
    const assesmentSurvey = surveyFactory.generateBracSurvey('assesment', parent, person);
    const assesmentFollowUpSurvey = surveyFactory.generateBracSurvey('assesment_follow_up', parent, person);
    docs.push(assesmentSurvey, assesmentFollowUpSurvey);
  }

  return docs;
};

const generatePlace = (type, parent) => {
  const lineage = parent && { _id: parent._id, parent: parent.parent };
  const place = placeFactory.generateBracPlace('', type, lineage);
  return place;
};

module.exports = {
  generatePlace,
  generatePerson,
  generateReports,
};
