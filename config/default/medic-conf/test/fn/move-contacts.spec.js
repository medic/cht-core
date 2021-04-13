const { assert, expect } = require('chai');
const rewire = require('rewire');
const sinon = require('sinon');
const fs = require('../../src/lib/sync-fs');
const environment = require('../../src/lib/environment');

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-memory'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const moveContactsModule = rewire('../../src/fn/move-contacts');
moveContactsModule.__set__('prepareDocumentDirectory', () => {});
const updateLineagesAndStage = moveContactsModule.__get__('updateLineagesAndStage');
const { mockReport, mockHierarchy, parentsToLineage } = require('../mock-hierarchies');

const contacts_by_depth = {
  // eslint-disable-next-line quotes
  map: "function(doc) {\n  if (doc.type === 'tombstone' && doc.tombstone) {\n    doc = doc.tombstone;\n  }\n  if (['contact', 'person', 'clinic', 'health_center', 'district_hospital'].indexOf(doc.type) !== -1) {\n    var value = doc.patient_id || doc.place_id;\n    var parent = doc;\n    var depth = 0;\n    while (parent) {\n      if (parent._id) {\n        emit([parent._id], value);\n        emit([parent._id, depth], value);\n      }\n      depth++;\n      parent = parent.parent;\n    }\n  }\n}",
};

const reports_by_freetext = {
  // eslint-disable-next-line quotes
  map: "function(doc) {\n  var skip = [ '_id', '_rev', 'type', 'refid', 'content' ];\n\n  var usedKeys = [];\n  var emitMaybe = function(key, value) {\n    if (usedKeys.indexOf(key) === -1 && // Not already used\n        key.length > 2 // Not too short\n    ) {\n      usedKeys.push(key);\n      emit([key], value);\n    }\n  };\n\n  var emitField = function(key, value, reportedDate) {\n    if (!key || !value) {\n      return;\n    }\n    key = key.toLowerCase();\n    if (skip.indexOf(key) !== -1 || /_date$/.test(key)) {\n      return;\n    }\n    if (typeof value === 'string') {\n      value = value.toLowerCase();\n      value.split(/\\s+/).forEach(function(word) {\n        emitMaybe(word, reportedDate);\n      });\n    }\n    if (typeof value === 'number' || typeof value === 'string') {\n      emitMaybe(key + ':' + value, reportedDate);\n    }\n  };\n\n  if (doc.type === 'data_record' && doc.form) {\n    Object.keys(doc).forEach(function(key) {\n      emitField(key, doc[key], doc.reported_date);\n    });\n    if (doc.fields) {\n      Object.keys(doc.fields).forEach(function(key) {\n        emitField(key, doc.fields[key], doc.reported_date);\n      });\n    }\n    if (doc.contact && doc.contact._id) {\n      emitMaybe('contact:' + doc.contact._id.toLowerCase(), doc.reported_date);\n    }\n  }\n}"
};

describe('move-contacts', () => {

  let pouchDb, scenarioCount = 0;
  const writtenDocs = [];
  const getWrittenDoc = docId => {
    const matches = writtenDocs.filter(doc => doc && doc._id === docId);
    if (matches.length === 0) {
      return undefined;
    }

    // Remove _rev because it makes expectations harder to write
    const result = matches[matches.length - 1];
    delete result._rev;
    return result;
  };
  const expectWrittenDocs = expected => expect(writtenDocs.map(doc => doc._id)).to.deep.eq(expected);

  const upsert = async (id, content) => {
    const { _rev } = await pouchDb.get(id);
    await pouchDb.put(Object.assign({
      _id: id,
      _rev,
    }, content));
  };
  const updateHierarchyRules = contact_types => upsert('settings', { settings: { contact_types } });

  beforeEach(async () => {
    pouchDb = new PouchDB(`scenario${scenarioCount++}`, { adapter: 'memory' });

    await mockHierarchy(pouchDb, {
      district_1: {
        health_center_1: {
          clinic_1: {
            patient_1: {},
          },
        },
      },
      district_2: {},
    });

    await pouchDb.put({ _id: 'settings', settings: {} });

    await mockReport(pouchDb, {
      id: 'report_1',
      creatorId: 'health_center_1_contact',
    });

    await pouchDb.put({
      _id: '_design/medic-client',
      views: { reports_by_freetext },
    });

    await pouchDb.put({
      _id: '_design/medic',
      views: { contacts_by_depth },
    });

    moveContactsModule.__set__('writeDocumentToDisk', (docDirectoryPath, doc) => writtenDocs.push(doc));
    writtenDocs.length = 0;
  });

  afterEach(async () => pouchDb.destroy());

  it('move health_center_1 to district_2', async () => {
    await updateLineagesAndStage({
      contactIds: ['health_center_1'],
      parentId: 'district_2',
    }, pouchDb);

    expect(getWrittenDoc('health_center_1_contact')).to.deep.eq({
      _id: 'health_center_1_contact',
      type: 'person',
      parent: parentsToLineage('health_center_1', 'district_2'),
    });

    expect(getWrittenDoc('health_center_1')).to.deep.eq({
      _id: 'health_center_1',
      type: 'health_center',
      contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_2'),
      parent: parentsToLineage('district_2'),
    });

    expect(getWrittenDoc('clinic_1')).to.deep.eq({
      _id: 'clinic_1',
      type: 'clinic',
      contact: parentsToLineage('clinic_1_contact', 'clinic_1', 'health_center_1', 'district_2'),
      parent: parentsToLineage('health_center_1', 'district_2'),
    });

    expect(getWrittenDoc('patient_1')).to.deep.eq({
      _id: 'patient_1',
      type: 'person',
      parent: parentsToLineage('clinic_1', 'health_center_1', 'district_2'),
    });

    expect(getWrittenDoc('report_1')).to.deep.eq({
      _id: 'report_1',
      form: 'foo',
      type: 'data_record',
      contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_2'),
    });
  });

  it('move health_center_1 to root', async () => {
    await updateHierarchyRules([{ id: 'health_center', parents: [] }]);

    await updateLineagesAndStage({
      contactIds: ['health_center_1'],
      parentId: 'root',
    }, pouchDb);

    expect(getWrittenDoc('health_center_1_contact')).to.deep.eq({
      _id: 'health_center_1_contact',
      type: 'person',
      parent: parentsToLineage('health_center_1'),
    });

    expect(getWrittenDoc('health_center_1')).to.deep.eq({
      _id: 'health_center_1',
      type: 'health_center',
      contact: parentsToLineage('health_center_1_contact', 'health_center_1'),
      parent: parentsToLineage(),
    });

    expect(getWrittenDoc('clinic_1')).to.deep.eq({
      _id: 'clinic_1',
      type: 'clinic',
      contact: parentsToLineage('clinic_1_contact', 'clinic_1', 'health_center_1'),
      parent: parentsToLineage('health_center_1'),
    });

    expect(getWrittenDoc('patient_1')).to.deep.eq({
      _id: 'patient_1',
      type: 'person',
      parent: parentsToLineage('clinic_1', 'health_center_1'),
    });

    expect(getWrittenDoc('report_1')).to.deep.eq({
      _id: 'report_1',
      form: 'foo',
      type: 'data_record',
      contact: parentsToLineage('health_center_1_contact', 'health_center_1'),
    });
  });

  it('move district_1 from root', async () => {
    await updateHierarchyRules([{ id: 'district_hospital', parents: ['district_hospital'] }]);

    await updateLineagesAndStage({
      contactIds: ['district_1'],
      parentId: 'district_2',
    }, pouchDb);

    expect(getWrittenDoc('district_1')).to.deep.eq({
      _id: 'district_1',
      type: 'district_hospital',
      contact: parentsToLineage('district_1_contact', 'district_1', 'district_2'),
      parent: parentsToLineage('district_2'),
    });

    expect(getWrittenDoc('health_center_1_contact')).to.deep.eq({
      _id: 'health_center_1_contact',
      type: 'person',
      parent: parentsToLineage('health_center_1', 'district_1', 'district_2'),
    });

    expect(getWrittenDoc('health_center_1')).to.deep.eq({
      _id: 'health_center_1',
      type: 'health_center',
      contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_1', 'district_2'),
      parent: parentsToLineage('district_1', 'district_2'),
    });

    expect(getWrittenDoc('clinic_1')).to.deep.eq({
      _id: 'clinic_1',
      type: 'clinic',
      contact: parentsToLineage('clinic_1_contact', 'clinic_1', 'health_center_1', 'district_1', 'district_2'),
      parent: parentsToLineage('health_center_1', 'district_1', 'district_2'),
    });

    expect(getWrittenDoc('patient_1')).to.deep.eq({
      _id: 'patient_1',
      type: 'person',
      parent: parentsToLineage('clinic_1', 'health_center_1', 'district_1', 'district_2'),
    });

    expect(getWrittenDoc('report_1')).to.deep.eq({
      _id: 'report_1',
      form: 'foo',
      type: 'data_record',
      contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_1', 'district_2'),
    });
  });

  it('move district_1 to flexible hierarchy parent', async () => {
    await pouchDb.put({
      _id: `county_1`,
      type: 'contact',
      contact_type: 'county',
    });
    
    await updateHierarchyRules([
      { id: 'county', parents: [] },
      { id: 'district_hospital', parents: ['county'] },
    ]);
    
    await updateLineagesAndStage({
      contactIds: ['district_1'],
      parentId: 'county_1',
    }, pouchDb);

    expect(getWrittenDoc('health_center_1_contact')).to.deep.eq({
      _id: 'health_center_1_contact',
      type: 'person',
      parent: parentsToLineage('health_center_1', 'district_1', 'county_1'),
    });

    expect(getWrittenDoc('health_center_1')).to.deep.eq({
      _id: 'health_center_1',
      type: 'health_center',
      contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_1', 'county_1'),
      parent: parentsToLineage('district_1', 'county_1'),
    });

    expect(getWrittenDoc('clinic_1')).to.deep.eq({
      _id: 'clinic_1',
      type: 'clinic',
      contact: parentsToLineage('clinic_1_contact', 'clinic_1', 'health_center_1', 'district_1', 'county_1'),
      parent: parentsToLineage('health_center_1', 'district_1', 'county_1'),
    });

    expect(getWrittenDoc('patient_1')).to.deep.eq({
      _id: 'patient_1',
      type: 'person',
      parent: parentsToLineage('clinic_1', 'health_center_1', 'district_1', 'county_1'),
    });

    expect(getWrittenDoc('report_1')).to.deep.eq({
      _id: 'report_1',
      form: 'foo',
      type: 'data_record',
      contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_1', 'county_1'),
    });
  });

  it('moves flexible hierarchy contact to flexible hierarchy parent', async () => {
    await updateHierarchyRules([
      { id: 'county', parents: [] },
      { id: 'subcounty', parents: ['county'] },
      { id: 'focal', parents: ['county', 'subcounty'], person: true }
    ]);

    await pouchDb.bulkDocs([
      { _id: `county`, type: 'contact', contact_type: 'county' },
      { _id: `subcounty`, type: 'contact', contact_type: 'subcounty', parent: { _id: 'county' } },
      { _id: `focal`, type: 'contact', contact_type: 'focal', parent: { _id: 'county' } },
    ]);

    await mockReport(pouchDb, {
      id: 'report_focal',
      creatorId: 'focal',
    });
    
    await updateLineagesAndStage({
      contactIds: ['focal'],
      parentId: 'subcounty',
    }, pouchDb);

    expect(getWrittenDoc('focal')).to.deep.eq({
      _id: 'focal',
      type: 'contact',
      contact_type: 'focal',
      parent: parentsToLineage('subcounty', 'county'),
    });

    expect(getWrittenDoc('report_focal')).to.deep.eq({
      _id: 'report_focal',
      form: 'foo',
      type: 'data_record',
      contact: parentsToLineage('focal', 'subcounty', 'county'),
    });
  });

  it('moving primary contact updates parents', async () => {
    await mockHierarchy(pouchDb, {
      t_district_1: {
        t_health_center_1: {
          t_clinic_1: {
            t_patient_1: {},
          },
          t_clinic_2: {
            t_patient_2: {},
          }
        },
      },
    });

    const patient1Lineage = parentsToLineage('t_patient_1', 't_clinic_1', 't_health_center_1', 't_district_1');
    await upsert('t_health_center_1', {
      type: 'health_center',
      contact: patient1Lineage,
      parent: parentsToLineage('t_district_1'),
    });

    await upsert('t_district_1', {
      type: 'district_hospital',
      contact: patient1Lineage,
      parent: parentsToLineage(),
    });

    await updateLineagesAndStage({
      contactIds: ['t_patient_1'],
      parentId: 't_clinic_2',
    }, pouchDb);

    expect(getWrittenDoc('t_health_center_1')).to.deep.eq({
      _id: 't_health_center_1',
      type: 'health_center',
      contact: parentsToLineage('t_patient_1', 't_clinic_2', 't_health_center_1', 't_district_1'),
      parent: parentsToLineage('t_district_1'),
    });

    expect(getWrittenDoc('t_district_1')).to.deep.eq({
      _id: 't_district_1',
      type: 'district_hospital',
      contact: parentsToLineage('t_patient_1', 't_clinic_2', 't_health_center_1', 't_district_1'),
    });

    expectWrittenDocs(['t_patient_1', 't_district_1', 't_health_center_1']);
  });

  // We don't want lineage { id, parent: '' } to result from district_hospitals which have parent: ''
  it('district_hospital with empty string parent is not preserved', async () => {
    await upsert('district_2', { parent: '', type: 'district_hospital' });
    await updateLineagesAndStage({
      contactIds: ['health_center_1'],
      parentId: 'district_2',
    }, pouchDb);

    expect(getWrittenDoc('health_center_1')).to.deep.eq({
      _id: 'health_center_1',
      type: 'health_center',
      contact: parentsToLineage('health_center_1_contact', 'health_center_1', 'district_2'),
      parent: parentsToLineage('district_2'),
    });
  });

  it('documents should be minified', async () => {
    await updateHierarchyRules([{ id: 'clinic', parents: ['district_hospital'] }]);
    const patient = {
      parent: parentsToLineage('clinic_1', 'health_center_1', 'district_1'),
      type: 'person',
      important: true,
    };
    const clinic = {
      parent: parentsToLineage('health_center_1', 'district_1'),
      type: 'clinic',
      important: true,
    };
    patient.parent.important = false;
    clinic.parent.parent.important = false;

    await upsert('clinic_1', clinic);
    await upsert('patient_1', patient);

    await updateLineagesAndStage({
      contactIds: ['clinic_1'],
      parentId: 'district_2',
    }, pouchDb);


    expect(getWrittenDoc('clinic_1')).to.deep.eq({
      _id: 'clinic_1',
      type: 'clinic',
      important: true,
      parent: parentsToLineage('district_2'),
    });
    expect(getWrittenDoc('patient_1')).to.deep.eq({
      _id: 'patient_1',
      type: 'person',
      important: true,
      parent: parentsToLineage('clinic_1', 'district_2'),
    });
  });

  it('cannot create circular hierarchy', async () => {
    // even if the hierarchy rules allow it
    await updateHierarchyRules([{ id: 'health_center', parents: ['clinic'] }]);

    try {
      await updateLineagesAndStage({
        contactIds: ['health_center_1'],
        parentId: 'clinic_1',
      }, pouchDb);
      assert.fail('should throw');
    } catch (err) {
      expect(err.message).to.include('circular');
    }
  });

  it('throw if parent does not exist', async () => {
    try {
      await updateLineagesAndStage({
        contactIds: ['clinic_1'],
        parentId: 'dne_parent_id'
      }, pouchDb);
      assert.fail('should throw when parent is not defined');
    } catch (err) {
      expect(err.message).to.include('could not be found');
    }
  });

  it('throw when altering same lineage', async () => {
    try {
      await updateLineagesAndStage({
        contactIds: ['patient_1', 'health_center_1'],
        parentId: 'district_2',
      }, pouchDb);
      assert.fail('should throw');
    } catch (err) {
      expect(err.message).to.include('same lineage');
    }
  });

  it('throw if contact_id does not exist', async () => {
    try {
      await updateLineagesAndStage({
        contactIds: ['dne'],
        parentId: 'clinic_1'
      }, pouchDb);
      assert.fail('should throw');
    } catch (err) {
      expect(err.message).to.include('could not be found');
    }
  });

  it('throw if contact_id is not a contact', async () => {
    try {
      await updateLineagesAndStage({
        contactIds: ['report_1'],
        parentId: 'clinic_1'
      }, pouchDb);
      assert.fail('should throw');
    } catch (err) {
      expect(err.message).to.include('unknown type');
    }
  });

  it('throw if moving primary contact of parent', async () => {
    try {
      await updateLineagesAndStage({
        contactIds: ['clinic_1_contact'],
        parentId: 'district_1'
      }, pouchDb);

      assert.fail('should throw');
    } catch (err) {
      expect(err.message).to.include('primary contact');
    }
  });

  it('throw if setting parent to self', async () => {
    await updateHierarchyRules([{ id: 'clinic', parents: ['clinic'] }]);
    try {
      await updateLineagesAndStage({
        contactIds: ['clinic_1'],
        parentId: 'clinic_1'
      }, pouchDb);

      assert.fail('should throw');
    } catch (err) {
      expect(err.message).to.include('circular');
    }
  });

  it('throw when moving place to unconfigured parent', async () => {
    await updateHierarchyRules([{ id: 'district_hospital', parents: [] }]);

    try {
      await updateLineagesAndStage({
        contactIds: ['district_1'],
        parentId: 'district_2',
      }, pouchDb);

      assert.fail('Expected error');
    } catch (err) {
      expect(err.message).to.include('parent of type');
    }
  });

  describe('parseExtraArgs', () => {
    const parseExtraArgs = moveContactsModule.__get__('parseExtraArgs');
    it('undefined arguments', () => {
      expect(() => parseExtraArgs(__dirname, undefined)).to.throw('required list of contact_id');
    });

    it('empty arguments', () => expect(() => parseExtraArgs(__dirname, [])).to.throw('required list of contact_id'));

    it('contacts only', () => expect(() => parseExtraArgs(__dirname, ['--contacts=a'])).to.throw('required parameter parent'));

    it('contacts and parents', () => {
      const args = ['--contacts=food,is,tasty', '--parent=bar', '--docDirectoryPath=/', '--force=hi'];
      expect(parseExtraArgs(__dirname, args)).to.deep.eq({
        contactIds: ['food', 'is', 'tasty'],
        parentId: 'bar',
        force: true,
        docDirectoryPath: '/',
      });
    });
  });

  let readline;
  describe('prepareDocumentDirectory', () => {
    const moveContacts = rewire('../../src/fn/move-contacts');
    const userPrompt = rewire('../../src/lib/user-prompt');
    const prepareDocDir = moveContacts.__get__('prepareDocumentDirectory');
    let docOnj = { docDirectoryPath: '/test/path/for/testing ', force: false };
    beforeEach(() => {
      readline = { keyInYN: sinon.stub() };
      userPrompt.__set__('readline', readline);
      moveContacts.__set__('userPrompt', userPrompt);
      sinon.stub(process, 'exit');
      sinon.stub(fs, 'exists').returns(true);
      sinon.stub(fs, 'recurseFiles').returns(Array(20));
      sinon.stub(fs, 'deleteFilesInFolder').returns(true);
    });
    afterEach(() => {
      sinon.restore();
    });

    it('does not delete files in directory when user presses n', () => {
      readline.keyInYN.returns(false);
      prepareDocDir(docOnj);
      assert.equal(fs.deleteFilesInFolder.callCount, 0);
      assert.equal(process.exit.callCount, 1);
    });

    it('deletes files in directory when user presses y', () => {
      readline.keyInYN.returns(true);
      prepareDocDir(docOnj);
      assert.equal(fs.deleteFilesInFolder.callCount, 1);
      assert.equal(process.exit.callCount, 0);
    });

    it('deletes files in directory when force is set', () => {
      sinon.stub(environment, 'force').get(() => true);
      prepareDocDir(docOnj);
      assert.equal(fs.deleteFilesInFolder.callCount, 1);
      assert.equal(process.exit.callCount, 0);
    });
  });
});
