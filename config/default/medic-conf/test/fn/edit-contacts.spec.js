const { expect, assert } = require('chai');
const rewire = require('rewire');
const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-memory'));
const fs = require('../../src/lib/sync-fs');
const environment = require('../../src/lib/environment');
const sinon = require('sinon');

let pouch, editContactsModule;

// specifying directory paths to use
const editContactsPath = `data/edit-contacts`;
const saveDocsDir = `${editContactsPath}/json_docs`;
const expectedDocsDirNested = `${editContactsPath}/expected-json_docs/nested-columns`;
const expectedDocsDirOneCol = `${editContactsPath}/expected-json_docs/one-column`;
const expectedDocsDirAllCols = `${editContactsPath}/expected-json_docs/all-columns`;
const expectedDocsMultipleCsv = `${editContactsPath}/expected-json_docs/multiple-csv-columns`;
const expectedDocsUsersCsv = `${editContactsPath}/expected-json_docs/user-columns`;
const filesToUpload = fs.recurseFiles(`${editContactsPath}/server-contact_docs`).filter(name => name.endsWith('.json'));
const countFilesInDir = path => fs.fs.readdirSync(path).length;

const docs = filesToUpload
  .map(file => {
    const doc = fs.readJson(file);
    return doc;
  });

const uploadDocuments = (docs) => {
  return pouch.bulkDocs(docs);
};

const compareDocuments = (expectedDocsDir) => {
      fs.recurseFiles(expectedDocsDir)
      .map(file => fs.path.basename(file))
      .forEach(file => {
        const expected  = fs.readJson(`${expectedDocsDir}/${file}`);
        const generated = fs.readJson(`${saveDocsDir}/${file}`);
        delete generated._rev;
        expect(expected).to.deep.eq(generated);
      });
};

describe('edit-contacts', function() {

  beforeEach(async () => {
    editContactsModule = rewire('../../src/fn/edit-contacts');
    pouch = new PouchDB('edit-contacts', { adapter: 'memory' });
    await uploadDocuments(docs);
    sinon.stub(environment, 'pathToProject').get(() => editContactsPath);
    const pouchDb = sinon.stub();
    pouchDb.returns(pouch);
    editContactsModule.__set__('pouch', pouchDb);
  });

  afterEach(async () => {
    pouch.destroy();
    fs.deleteFilesInFolder(saveDocsDir);
    sinon.restore();
  });

  it(`should do a top-down test well and add all available columns to the docs since they are not specified`, async function(){

    await editContactsModule.execute();
    assert.equal(countFilesInDir(saveDocsDir),
                countFilesInDir(expectedDocsDirAllCols),
                `Different number of files in ${saveDocsDir} and ${expectedDocsDirAllCols}.`);
    compareDocuments(expectedDocsDirAllCols);
  }); 

  it(`should only process listed files`, async function(){

    sinon.stub(environment, 'extraArgs').get(() => ['--files=contact.csv,contact.two.csv,users.csv']);

    await editContactsModule.execute();
    assert.equal(countFilesInDir(saveDocsDir),
                countFilesInDir(expectedDocsMultipleCsv),
                `Different number of files in ${saveDocsDir} and ${expectedDocsMultipleCsv}.`);
    compareDocuments(expectedDocsMultipleCsv);
  });

  it(`should only add specified column names to the json docs`, async function(){

    sinon.stub(environment, 'extraArgs').get(() => ['--columns=is_in_emnch', '--files=contact.csv']);

    await editContactsModule.execute();

    assert.equal(countFilesInDir(saveDocsDir),
                countFilesInDir(expectedDocsDirOneCol),
                `Different number of files in ${saveDocsDir} and ${expectedDocsDirOneCol}.`);
    compareDocuments(expectedDocsDirOneCol);
  });
  
  it(`should add nested columns to the json docs perfectly`, async function(){

    sinon.stub(environment, 'extraArgs').get(() => ['--files=contact.nested.csv']);

    await editContactsModule.execute();

    assert.equal(countFilesInDir(saveDocsDir),
                countFilesInDir(expectedDocsDirNested),
                `Different number of files in ${saveDocsDir} and ${expectedDocsDirOneCol}.`);
    compareDocuments(expectedDocsDirNested);
  });

  it(`should add nested columns to the json docs perfectly`, async function(){

    sinon.stub(environment, 'extraArgs').get(() => ['--files=contact.nested.csv','--columns=is_pilot.rbf.place,weird_property,another_property']);

    await editContactsModule.execute();

    assert.equal(countFilesInDir(saveDocsDir),
                countFilesInDir(expectedDocsDirNested),
                `Different number of files in ${saveDocsDir} and ${expectedDocsDirOneCol}.`);
    compareDocuments(expectedDocsDirNested);
  });


  it(`should fail when wrong column names are provided`, async function(){

    sinon.stub(environment, 'extraArgs').get(() => ['--columns=enmch', '--files=contact.csv']);
    
    try {
      await editContactsModule.execute();
      assert.fail('should throw an error when wrong column names are provided');
    } catch (err) {
      expect(err.message).to.be.equal('The column name(s) specified do not exist.');
    }
  }); 

  it(`should fail when protected column names are provided`, async function(){

    sinon.stub(environment, 'extraArgs').get(() => ['--columns=parent', '--files=contact.test.csv']);
    
    try {
      await editContactsModule.execute();
      assert.fail('should throw an error when protected names are provided');
    } catch (err) {
      expect(err.message).to.include('this property name is protected.');
    }
  });  

  it(`should fail when DB doesn't contain the requested _id's`, async function(){
    
    sinon.stub(environment, 'extraArgs').get(() => ['--files=contact.wrong.id.csv']);

    try {
      await editContactsModule.execute();
      assert.fail('should throw an error when requested ID cannot be found on the database');
    } catch (err) {
      expect(err.message).to.include('could not be found.');
    }
  });

  it(`should fail when document type is not a contact`, async function(){

    await pouch.put({
      _id: 'documentID',
      type: 'data_record'
    });

    sinon.stub(environment, 'extraArgs').get(() => ['--files=contact.protected.type.csv']);
   
    try {
      await editContactsModule.execute();
      assert.fail('should throw an error when document is not a contact');
    } catch (err) {
      expect(err.message).to.include('cannot be edited');
    }
  });

  it(`should add all columns when editing user docs`, async function(){

    sinon.stub(environment, 'extraArgs').get(() => ['--files=users.csv']);


    await editContactsModule.execute();
    assert.equal(countFilesInDir(saveDocsDir),
                countFilesInDir(expectedDocsUsersCsv),
                `Different number of files in ${saveDocsDir} and ${expectedDocsUsersCsv}.`);
    compareDocuments(expectedDocsUsersCsv);
    
  }); 

  it(`should fail when wrong column names are provided when editing user docs`, async function(){

    sinon.stub(environment, 'extraArgs').get(() => ['--columns=enmch', '--files=users.csv']);
    
    try {
      await editContactsModule.execute();
      assert.fail('should throw an error when wrong column names are provided');
    } catch (err) {
      expect(err.message).to.be.equal('The column name(s) specified do not exist.');
    }
  }); 
 
});