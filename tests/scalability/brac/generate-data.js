const fs = require('fs');
const path = require('path');

const [,, dataDir] = process.argv;

const config = require('./config');
const factoryPath = path.join(__dirname, '../../factories/brac');
const placeFactory = require(path.join(factoryPath, 'contacts/brac-place'));
const personFactory = require(path.join(factoryPath, 'contacts/brac-person'));
const surveyFactory = require(path.join(factoryPath, 'reports/brac-survey'));
const userFactory = require(path.join(factoryPath, 'users/brac-user'));

const dataDirPath = dataDir || __dirname;
const jsonDirPath = path.join(dataDirPath, 'json_docs');
const FILE_EXTENSION = '.doc.json';

const users = [];

const personSubtypeByParentType = {
  'district_hospital': 'manager',
  'health_center': 'chw',
  'clinic': 'member_eligible_woman'
};

const userRolesByFacilityType = {
  'district_hospital': ['supervisor'],
  'health_center': ['district_admin', 'chw'],
  'clinic': null
};

const expectedNbr = config.contactsNbr.district_hospital *
                    config.contactsNbr.health_center *
                    config.contactsNbr.clinic *
                    config.contactsNbr.person * 2;
let savedDocs = 0;

const saveJson = (doc) => {
  const docName = `${doc._id}${FILE_EXTENSION}`;
  savedDocs++;
  if (savedDocs % 1000 === 0) {
    console.log(`Generated ${savedDocs} of approx ${expectedNbr}`);
  }
  return fs.promises.writeFile(path.join(jsonDirPath, docName), JSON.stringify(doc, null, 2));
};

const createJsonDir = async () => {
  if (fs.existsSync(jsonDirPath)) {
    const stats = await fs.promises.stat(jsonDirPath);
    if (!stats.isDirectory()) {
      throw new Error(`Data location ${jsonDirPath} exists and is not a directory`);
    }

    const contents = await fs.promises.readdir(jsonDirPath);
    if (contents.length) {
      throw new Error(`json_docs folder ${jsonDirPath} already exists and is not empty.`);
    }
  }

  try {
    await fs.promises.mkdir(jsonDirPath);
  } catch (err) {
    throw new Error(`Could not create ${jsonDirPath} folder.`);
  }
};

const generatePlace = async (type, parent) => {
  const lineage = parent && { _id: parent._id, parent: parent.parent };
  const place = placeFactory.generateBracPlace('', type, lineage);
  await saveJson(place);
  return place;
};

const generatePerson = async (parent, subtype, primary = false) => {
  const lineage = { _id: parent._id, parent: parent.parent };
  subtype = subtype || personSubtypeByParentType[parent.type];
  const person = personFactory.generateBracPerson(lineage, subtype);
  await saveJson(person);
  if (primary) {
    parent.contact = { _id: person._id, parent: lineage };
    await saveJson(parent);
  }
  return person;
};

const generateReports = async (person, parent) => {
  if (personFactory.shouldGeneratePregnancySurvey(person)) {
    const pregnancySurvey = surveyFactory.generateBracSurvey('pregnancy', parent, person);
    await saveJson(pregnancySurvey);
  }

  if (personFactory.shouldGenerateAssessmentSurvey(person)) {
    const assesmentSurvey = surveyFactory.generateBracSurvey('assesment', parent, person);
    await saveJson(assesmentSurvey);

    const assesmentFollowUpSurvey = surveyFactory.generateBracSurvey('assesment_follow_up', parent, person);
    await saveJson(assesmentFollowUpSurvey);
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
        if (personFactory.shouldGenerateSurvey(person)) {
          await generateReports(person, clinic);
        }
      }
    }
  }
};

const generateData = async () => {
  await createJsonDir();
  for (let i = 0; i < config.contactsNbr.district_hospital; i++) {
    await generateHierarchy();
  }
};

const generateLoginList = () => {
  return fs.promises.writeFile(path.join(dataDirPath, 'users.json'), JSON.stringify(users, null, 2 ));
};

(async () => {
  try {
    await generateData();
    await generateLoginList();
  } catch (err) {
    console.error('Error while generating data', err);
    process.exit(1);
  }
})();
