import sinon from 'sinon';
import { assert } from 'chai';
import { cloneDeep } from 'lodash-es';
import EnketoDataTranslator from '../../../../src/js/enketo/enketo-data-translator';
import ContactSaver from '../../../../src/js/enketo/contact-saver';
import {
  ContactServices,
  FileServices
} from '../../../../src/js/enketo/enketo-form-manager';

describe('ContactSave service', () => {
  let contactRecordToJs;
  let contactSaver;
  let dbBulkDocs;
  let dbGet;
  let extractLineageService;
  let transitionsService;
  let clock;
  let form;

  const DEFAULT_DOC_ID = null;
  const DEFAULT_TYPE = 'some-contact-type';

  beforeEach(() => {
    contactRecordToJs = sinon.stub(EnketoDataTranslator, 'contactRecordToJs');

    const contactTypesService = { isHardcodedType: sinon.stub().returns(false) };
    extractLineageService = { extract: sinon.stub() };
    transitionsService = { applyTransitions: sinon.stub().resolvesArg(0) };
    dbBulkDocs = sinon.stub().resolves([]);
    dbGet = sinon.stub();

    const contactServices = new ContactServices(extractLineageService, null, contactTypesService);
    const dbService = {
      get: sinon.stub().returns({
        bulkDocs: dbBulkDocs,
        get: dbGet,
      })
    };
    const fileServices = new FileServices(dbService);
    contactSaver = new ContactSaver(contactServices, fileServices, transitionsService);

    form = { getDataStr: sinon.stub().returns('<data></data>') };
  });

  afterEach(() => {
    sinon.restore();
    clock?.restore();
  });

  it('fetches and binds db types and minifies string contacts', () => {
    contactRecordToJs.returns({
      doc: { _id: 'main1', type: 'main', contact: 'abc' }
    });
    dbGet.resolves({ _id: 'abc', name: 'gareth', parent: { _id: 'def' } });
    extractLineageService.extract.returns({ _id: 'abc', parent: { _id: 'def' } });

    return contactSaver
      .save(form, DEFAULT_DOC_ID, DEFAULT_TYPE)
      .then(() => {
        assert.equal(dbGet.callCount, 1);
        assert.equal(dbGet.args[0][0], 'abc');

        assert.equal(dbBulkDocs.callCount, 1);

        const savedDocs = dbBulkDocs.args[0][0];

        assert.equal(savedDocs.length, 1);
        assert.deepEqual(savedDocs[0].contact, {
          _id: 'abc',
          parent: {
            _id: 'def'
          }
        });
      });
  });

  it('fetches and binds db types and minifies object contacts', () => {
    contactRecordToJs.returns({
      doc: { _id: 'main1', type: 'main', contact: { _id: 'abc', name: 'Richard' } }
    });
    dbGet.resolves({ _id: 'abc', name: 'Richard', parent: { _id: 'def' } });
    extractLineageService.extract.returns({ _id: 'abc', parent: { _id: 'def' } });

    return contactSaver
      .save(form, DEFAULT_DOC_ID, DEFAULT_TYPE)
      .then(() => {
        assert.equal(dbGet.callCount, 1);
        assert.equal(dbGet.args[0][0], 'abc');

        assert.equal(dbBulkDocs.callCount, 1);

        const savedDocs = dbBulkDocs.args[0][0];

        assert.equal(savedDocs.length, 1);
        assert.deepEqual(savedDocs[0].contact, {
          _id: 'abc',
          parent: {
            _id: 'def'
          }
        });
      });
  });

  it('should include parent ID in repeated children', () => {
    contactRecordToJs.returns({
      doc: { _id: 'main1', type: 'main', contact: 'NEW' },
      siblings: {
        contact: { _id: 'sis1', type: 'sister', parent: 'PARENT', },
      },
      repeats: {
        child_data: [{ _id: 'kid1', type: 'child', parent: 'PARENT', }],
      },
    });

    extractLineageService.extract.callsFake(contact => {
      contact.extracted = true;
      return contact;
    });

    return contactSaver
      .save(form, DEFAULT_DOC_ID, DEFAULT_TYPE)
      .then(() => {
        assert.isTrue(dbBulkDocs.calledOnce);

        const savedDocs = dbBulkDocs.args[0][0];

        assert.equal(savedDocs[0]._id, 'main1');

        assert.equal(savedDocs[1]._id, 'kid1');
        assert.equal(savedDocs[1].parent._id, 'main1');
        assert.equal(savedDocs[1].parent.extracted, true);

        assert.equal(savedDocs[2]._id, 'sis1');
        assert.equal(savedDocs[2].parent._id, 'main1');
        assert.equal(savedDocs[2].parent.extracted, true);

        assert.equal(extractLineageService.extract.callCount, 3);
      });
  });

  it('should include form_version if provided', () => {
    const form = { getDataStr: () => '<data></data>' };
    const docId = null;
    const type = 'some-contact-type';

    enketoTranslationService.contactRecordToJs.returns({
      doc: { _id: 'main1', type: 'main', contact: 'NEW'},
      siblings: {
        contact: { _id: 'sis1', type: 'sister', parent: 'PARENT', },
      },
      repeats: {
        child_data: [ { _id: 'kid1', type: 'child', parent: 'PARENT', } ],
      },
    });

    extractLineageService.extract.callsFake(contact => {
      contact.extracted = true;
      return contact;
    });

    bulkDocs.resolves([]);

    const xmlVersion = {
      time: 123456,
      sha256: '654321'
    };

    return service
      .save(form, docId, type, xmlVersion)
      .then(() => {
        assert.isTrue(bulkDocs.calledOnce);
        const savedDocs = bulkDocs.args[0][0];
        assert.equal(savedDocs.length, 3);
        for (const savedDoc of savedDocs) {
          assert.equal(savedDoc.form_version.time, 123456);
          assert.equal(savedDoc.form_version.sha256, '654321');
        }
      });
  });

  it('should copy old properties for existing contacts', () => {
    const docId = 'main1';

    contactRecordToJs.returns({
      doc: {
        _id: 'main1',
        type: 'contact',
        contact_type: 'some-contact-type',
        contact: { _id: 'contact', name: 'Richard' },
        value: undefined,
      }
    });
    dbGet
      .withArgs('main1')
      .resolves({
        _id: 'main1',
        name: 'Richard',
        parent: { _id: 'def' },
        value: 33,
        some: 'additional',
        data: 'is present',
      })
      .withArgs('contact')
      .resolves({ _id: 'contact', name: 'Richard', parent: { _id: 'def' } });

    extractLineageService.extract
      .withArgs(sinon.match({ _id: 'contact' }))
      .returns({ _id: 'contact', parent: { _id: 'def' } })
      .withArgs(sinon.match({ _id: 'def' }))
      .returns({ _id: 'def' });
    clock = sinon.useFakeTimers(5000);

    return contactSaver
      .save(form, docId, DEFAULT_TYPE)
      .then(() => {
        assert.equal(dbGet.callCount, 2);
        assert.deepEqual(dbGet.args[0], ['main1']);
        assert.deepEqual(dbGet.args[1], ['contact']);

        assert.equal(dbBulkDocs.callCount, 1);

        const savedDocs = dbBulkDocs.args[0][0];

        assert.equal(savedDocs.length, 1);
        assert.deepEqual(savedDocs[0], {
          _id: 'main1',
          type: 'contact',
          name: 'Richard',
          contact_type: 'some-contact-type',
          contact: { _id: 'contact', parent: { _id: 'def' } },
          parent: { _id: 'def' },
          value: 33,
          some: 'additional',
          data: 'is present',
          reported_date: 5000,
        });
      });
  });

  it('should pass the contacts to transitions service before saving and save modified contacts', () => {
    contactRecordToJs.returns({
      doc: { _id: 'main1', type: 'main', contact: { _id: 'abc', name: 'Richard' } }
    });
    dbGet.resolves({ _id: 'abc', name: 'Richard', parent: { _id: 'def' } });
    extractLineageService.extract.returns({ _id: 'abc', parent: { _id: 'def' } });
    transitionsService.applyTransitions.callsFake((docs) => {
      const clonedDocs = cloneDeep(docs); // don't mutate so we can assert
      clonedDocs[0].transitioned = true;
      clonedDocs.push({ this: 'is a new doc' });
      return Promise.resolve(clonedDocs);
    });
    clock = sinon.useFakeTimers(1000);

    return contactSaver
      .save(form, DEFAULT_DOC_ID, DEFAULT_TYPE)
      .then(() => {
        assert.equal(dbGet.callCount, 1);
        assert.equal(dbGet.args[0][0], 'abc');

        assert.equal(transitionsService.applyTransitions.callCount, 1);
        assert.deepEqual(transitionsService.applyTransitions.args[0], [[
          {
            _id: 'main1',
            contact: { _id: 'abc', parent: { _id: 'def' } },
            contact_type: DEFAULT_TYPE,
            type: 'contact',
            parent: undefined,
            reported_date: 1000
          }
        ]]);

        assert.equal(dbBulkDocs.callCount, 1);
        const savedDocs = dbBulkDocs.args[0][0];

        assert.equal(savedDocs.length, 2);
        assert.deepEqual(savedDocs, [
          {
            _id: 'main1',
            contact: { _id: 'abc', parent: { _id: 'def' } },
            contact_type: DEFAULT_TYPE,
            type: 'contact',
            parent: undefined,
            reported_date: 1000,
            transitioned: true,
          },
          { this: 'is a new doc' },
        ]);
      });
  });
});
