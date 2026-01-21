import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { assert } from 'chai';
import { provideMockStore } from '@ngrx/store/testing';
import { HttpClient } from '@angular/common/http';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { EnketoTranslationService } from '@mm-services/enketo-translation.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { AttachmentService } from '@mm-services/attachment.service';
import { ContactSaveService } from '@mm-services/contact-save.service';
import { Contact, Qualifier } from '@medic/cht-datasource';
import * as FileManager from '../../../../src/js/enketo/file-manager.js';

describe('ContactSave service', () => {

  let service;
  let enketoTranslationService;
  let extractLineageService;
  let attachmentService;
  let clock;
  let chtDatasourceService;
  let getContact;

  beforeEach(() => {
    enketoTranslationService = {
      contactRecordToJs: sinon.stub(),
    };

    extractLineageService = { extract: sinon.stub() };
    attachmentService = {
      add: sinon.stub(),
      remove: sinon.stub()
    };
    getContact = sinon.stub();
    chtDatasourceService = { bind: sinon.stub().withArgs(Contact.v1.get).returns(getContact) };
    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: EnketoTranslationService, useValue: enketoTranslationService },
        { provide: ExtractLineageService, useValue: extractLineageService },
        { provide: AttachmentService, useValue: attachmentService },
        { provide: CHTDatasourceService, useValue: chtDatasourceService },
        { provide: HttpClient, useValue: {} },
      ]
    });

    service = TestBed.inject(ContactSaveService);
  });

  afterEach(() => {
    sinon.restore();
    clock?.restore();
  });

  it('fetches and binds db types and minifies string contacts', () => {
    const form = { getDataStr: () => '<data></data>' };
    const docId = null;
    const type = 'some-contact-type';

    enketoTranslationService.contactRecordToJs.returns({
      doc: { _id: 'main1', type: 'main', contact: 'abc' }
    });
    getContact.resolves({ _id: 'abc', name: 'gareth', parent: { _id: 'def' } });
    extractLineageService.extract.returns({ _id: 'abc', parent: { _id: 'def' } });

    return service
      .save(form, docId, type)
      .then(({ preparedDocs: savedDocs }) => {
        assert.isTrue(getContact.calledOnceWithExactly(Qualifier.byUuid('abc')));

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
    const form = { getDataStr: () => '<data></data>' };
    const docId = null;
    const type = 'some-contact-type';

    enketoTranslationService.contactRecordToJs.returns({
      doc: { _id: 'main1', type: 'main', contact: { _id: 'abc', name: 'Richard' } }
    });
    getContact.resolves({ _id: 'abc', name: 'Richard', parent: { _id: 'def' } });
    extractLineageService.extract.returns({ _id: 'abc', parent: { _id: 'def' } });

    return service
      .save(form, docId, type)
      .then(({ preparedDocs: savedDocs }) => {
        assert.isTrue(getContact.calledOnceWithExactly(Qualifier.byUuid('abc')));

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

    return service
      .save(form, docId, type)
      .then(({ preparedDocs: savedDocs }) => {
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

    const xmlVersion = {
      time: 123456,
      sha256: '654321'
    };

    return service
      .save(form, docId, type, xmlVersion)
      .then(({ preparedDocs: savedDocs }) => {
        assert.equal(savedDocs.length, 3);
        for (const savedDoc of savedDocs) {
          assert.equal(savedDoc.form_version.time, 123456);
          assert.equal(savedDoc.form_version.sha256, '654321');
        }
      });
  });

  it('should copy old properties for existing contacts', () => {
    const form = { getDataStr: () => '<data></data>' };
    const docId = 'main1';
    const type = 'some-contact-type';

    enketoTranslationService.contactRecordToJs.returns({
      doc: {
        _id: 'main1',
        type: 'contact',
        contact_type: 'some-contact-type',
        contact: { _id: 'contact', name: 'Richard' },
        value: undefined,
      }
    });
    getContact
      .withArgs(Qualifier.byUuid('main1'))
      .resolves({
        _id: 'main1',
        name: 'Richard',
        parent: { _id: 'def' },
        value: 33,
        some: 'additional',
        data: 'is present',
      })
      .withArgs(Qualifier.byUuid('contact'))
      .resolves({ _id: 'contact', name: 'Richard', parent: { _id: 'def' } });

    extractLineageService.extract
      .withArgs(sinon.match({ _id: 'contact' }))
      .returns({ _id: 'contact', parent: { _id: 'def' } })
      .withArgs(sinon.match({ _id: 'def' }))
      .returns({ _id: 'def' });
    clock = sinon.useFakeTimers({now: 5000});

    return service
      .save(form, docId, type)
      .then(({ preparedDocs: savedDocs }) => {
        assert.equal(getContact.callCount, 2);
        assert.deepEqual(getContact.args[0], [Qualifier.byUuid('main1')]);
        assert.deepEqual(getContact.args[1], [Qualifier.byUuid('contact')]);

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

  describe('file attachments', () => {
    it('should attach files from FileManager to main contact document', () => {
      // person-create form structure based on config/default/forms/contact/person-create.xml
      const xmlPersonCreate =
        '<data id="contact:person:create">' +
        '<person>' +
        '<parent>PARENT</parent>' +
        '<type>person</type>' +
        '<name>John Doe</name>' +
        '<phone>+254712345678</phone>' +
        '<sex>male</sex>' +
        '</person>' +
        '</data>';

      const form = { getDataStr: () => xmlPersonCreate };
      const docId = null;
      const type = 'person';

      const mockFile = new File(['test file content'], 'test-photo.png', { type: 'image/png' });
      sinon.stub(FileManager, 'getCurrentFiles').returns([mockFile]);

      enketoTranslationService.contactRecordToJs.returns({
        doc: { _id: 'person1', type: 'person', name: 'John Doe', phone: '+254712345678', sex: 'male' }
      });

      return service
        .save(form, docId, type)
        .then(() => {
          assert.isTrue(attachmentService.add.calledOnce, 'AttachmentService.add should be called once');

          const addCall = attachmentService.add.getCall(0);
          assert.equal(addCall.args[0]._id, 'person1', 'Should attach to the main document');
          assert.equal(addCall.args[1], 'user-file-test-photo.png', 'Should use correct attachment name pattern');
          assert.equal(addCall.args[2], mockFile, 'Should pass the file content');
          assert.equal(addCall.args[3], 'image/png', 'Should pass the file type');
          assert.equal(addCall.args[4], false, 'Should not be pre-encoded');
        });
    });

    it('should extract and attach binary field data from XML to main document', () => {
      const xmlWithBinaryField =
        '<data id="contact:person:create">' +
        '<person>' +
        '<parent>PARENT</parent>' +
        '<type>person</type>' +
        '<name>Jane Smith</name>' +
        '<phone>+254712345679</phone>' +
        '<sex>female</sex>' +
        '<signature type="binary">' +
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' +
        '</signature>' +
        '</person>' +
        '</data>';

      const form = { getDataStr: () => xmlWithBinaryField };
      const docId = null;
      const type = 'person';

      sinon.stub(FileManager, 'getCurrentFiles').returns([]);

      enketoTranslationService.contactRecordToJs.returns({
        doc: { _id: 'person1', type: 'person', name: 'Jane Smith', phone: '+254712345679', sex: 'female' }
      });

      return service
        .save(form, docId, type)
        .then(() => {
          assert.isTrue(attachmentService.add.calledOnce, 'AttachmentService.add should be called once');

          const addCall = attachmentService.add.getCall(0);
          assert.equal(addCall.args[0]._id, 'person1', 'Should attach to the main document');
          assert.equal(
            addCall.args[1],
            'user-file/contact:person:create/person/signature',
            'Should use XPath-based attachment name for binary field'
          );
          assert.equal(
            addCall.args[2],
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'Should pass the base64 content'
          );
          assert.equal(addCall.args[3], 'image/png', 'Should use image/png as content type for binary fields');
          assert.equal(addCall.args[4], true, 'Should indicate content is already base64 encoded');
        });
    });
  });
});
