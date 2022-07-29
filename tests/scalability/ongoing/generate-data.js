const fs = require('fs');
const path = require('path');

const [,, dataDir] = process.argv;

const config = require('./config');
const factoryPath = path.join(__dirname, '../../factories/brac');
const userFactory = require(path.join(factoryPath, 'users/brac-user'));
const dataFactory = require('./data-factory');

const dataDirPath = dataDir || __dirname;
const jsonDirPath = path.join(dataDirPath, 'json_docs');
const FILE_EXTENSION = '.doc.json';

const users = [];

const userRolesByFacilityType = {
  'district_hospital': ['supervisor'],
  'health_center': ['district_admin', 'chw'],
  'clinic': null
};

const expectedNbr = config.contactsNbr.district_hospital *
                    config.contactsNbr.health_center *
                    config.contactsNbr.clinic *
                    config.contactsNbr.person * 1.5;
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
  const place = dataFactory.generatePlace(type, parent);
  await saveJson(place);
  return place;
};

const generatePerson = async (parent, subtype, primary = false) => {
  const [personDoc, parentDoc] = dataFactory.generatePerson(parent, subtype, primary);
  await saveJson(personDoc);
  parentDoc && await saveJson(parentDoc);
  return personDoc;
};

const generateReports = async (person, parent) => {
  const reports = dataFactory.generateReports(person, parent);
  for (const report of reports) {
    await saveJson(report);
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
