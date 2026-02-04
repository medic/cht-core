import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { assert, expect } from 'chai';
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
    it('should attach files from FileManager to main contact document', async () => {
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

      await service.save(form, docId, type);

      expect(attachmentService.add.calledOnce, 'AttachmentService.add should be called once').to.be.true;

      const addCall = attachmentService.add.getCall(0);
      expect(addCall.args[0]._id, 'Should attach to the main document').to.equal('person1');
      expect(addCall.args[1], 'Should use correct attachment name pattern').to.equal('user-file-test-photo.png');
      expect(addCall.args[2], 'Should pass the file content').to.equal(mockFile);
      expect(addCall.args[3], 'Should pass the file type').to.equal('image/png');
      expect(addCall.args[4], 'Should not be pre-encoded').to.be.false;
    });

    it('should extract and attach binary field data from XML to main document', async () => {
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

      await service.save(form, docId, type);

      expect(attachmentService.add.calledOnce, 'AttachmentService.add should be called once').to.be.true;

      const addCall = attachmentService.add.getCall(0);
      expect(addCall.args[0]._id, 'Should attach to the main document').to.equal('person1');
      expect(
        addCall.args[1],
        'Should use XPath-based attachment name for binary field'
      ).to.equal('user-file/contact:person:create/person/signature');
      expect(
        addCall.args[2],
        'Should pass the base64 content'
      ).to.equal('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
      expect(addCall.args[3], 'Should use image/png as content type for binary fields').to.equal('image/png');
      expect(addCall.args[4], 'Should indicate content is already base64 encoded').to.be.true;
    });

    describe('attachment cleanup', () => {
      it('should remove orphaned attachment when replaced with new file', async () => {
        const xmlStr =
          '<data id="contact:person:edit">' +
          '<person>' +
          '<parent>PARENT</parent>' +
          '<type>person</type>' +
          '<name>John Doe</name>' +
          '<photo>new-photo.png</photo>' +
          '</person>' +
          '</data>';

        const form = { getDataStr: () => xmlStr };
        const docId = 'person1';
        const type = 'person';

        const newFile = new File(['new photo content'], 'new-photo.png', { type: 'image/png' });
        sinon.stub(FileManager, 'getCurrentFiles').returns([newFile]);

        // Existing contact has an old attachment
        getContact.withArgs(Qualifier.byUuid('person1')).resolves({
          _id: 'person1',
          type: 'person',
          name: 'John Doe',
          photo: 'old-photo.png',
          _attachments: {
            'user-file-old-photo.png': { content_type: 'image/png', data: 'old-data' }
          }
        });

        enketoTranslationService.contactRecordToJs.returns({
          doc: { _id: 'person1', type: 'person', name: 'John Doe', photo: 'new-photo.png' }
        });

        await service.save(form, docId, type);

        expect(
          attachmentService.add.calledWith(sinon.match({ _id: 'person1' }), 'user-file-new-photo.png'),
          'Should add the new attachment'
        ).to.be.true;

        expect(
          attachmentService.remove.calledWith(sinon.match({ _id: 'person1' }), 'user-file-old-photo.png'),
          'Should remove the orphaned attachment'
        ).to.be.true;
      });

      it('should keep existing attachment when field value still references it', async () => {
        const xmlStr =
          '<data id="contact:person:edit">' +
          '<person>' +
          '<parent>PARENT</parent>' +
          '<type>person</type>' +
          '<name>John Updated</name>' +
          '<photo>existing-photo.png</photo>' +
          '</person>' +
          '</data>';

        const form = { getDataStr: () => xmlStr };
        const docId = 'person1';
        const type = 'person';

        sinon.stub(FileManager, 'getCurrentFiles').returns([]);

        getContact.withArgs(Qualifier.byUuid('person1')).resolves({
          _id: 'person1',
          type: 'person',
          name: 'John Doe',
          photo: 'existing-photo.png',
          _attachments: {
            'user-file-existing-photo.png': { content_type: 'image/png', data: 'photo-data' }
          }
        });

        enketoTranslationService.contactRecordToJs.returns({
          doc: { _id: 'person1', type: 'person', name: 'John Updated', photo: 'existing-photo.png' }
        });

        await service.save(form, docId, type);

        expect(
          attachmentService.remove.called,
          'Should not remove the referenced attachment'
        ).to.be.false;
      });

      it('should remove attachment when field is cleared', async () => {
        const xmlStr =
          '<data id="contact:person:edit">' +
          '<person>' +
          '<parent>PARENT</parent>' +
          '<type>person</type>' +
          '<name>John Doe</name>' +
          '<photo/>' +
          '</person>' +
          '</data>';

        const form = { getDataStr: () => xmlStr };
        const docId = 'person1';
        const type = 'person';

        sinon.stub(FileManager, 'getCurrentFiles').returns([]);

        getContact.withArgs(Qualifier.byUuid('person1')).resolves({
          _id: 'person1',
          type: 'person',
          name: 'John Doe',
          photo: 'old-photo.png',
          _attachments: {
            'user-file-old-photo.png': { content_type: 'image/png', data: 'photo-data' }
          }
        });

        enketoTranslationService.contactRecordToJs.returns({
          doc: { _id: 'person1', type: 'person', name: 'John Doe', photo: '' }
        });

        await service.save(form, docId, type);

        expect(
          attachmentService.remove.calledWith(sinon.match({ _id: 'person1' }), 'user-file-old-photo.png'),
          'Should remove the attachment when field is cleared'
        ).to.be.true;
      });

      it('should handle multiple attachments with mixed actions', async () => {
        const xmlStr =
          '<data id="contact:person:edit">' +
          '<person>' +
          '<parent>PARENT</parent>' +
          '<type>person</type>' +
          '<name>John Doe</name>' +
          '<photo>keep-photo.png</photo>' +
          '<document>new-doc.pdf</document>' +
          '<signature/>' +
          '</person>' +
          '</data>';

        const form = { getDataStr: () => xmlStr };
        const docId = 'person1';
        const type = 'person';

        const newDocFile = new File(['new doc'], 'new-doc.pdf', { type: 'application/pdf' });
        sinon.stub(FileManager, 'getCurrentFiles').returns([newDocFile]);

        getContact.withArgs(Qualifier.byUuid('person1')).resolves({
          _id: 'person1',
          type: 'person',
          name: 'John Doe',
          photo: 'keep-photo.png',
          document: 'old-doc.pdf',
          signature: 'old-sig.png',
          _attachments: {
            'user-file-keep-photo.png': { content_type: 'image/png', data: 'photo-data' },
            'user-file-old-doc.pdf': { content_type: 'application/pdf', data: 'doc-data' },
            'user-file-old-sig.png': { content_type: 'image/png', data: 'sig-data' },
          }
        });

        enketoTranslationService.contactRecordToJs.returns({
          doc: {
            _id: 'person1',
            type: 'person',
            name: 'John Doe',
            photo: 'keep-photo.png',   // kept (field still references it)
            document: 'new-doc.pdf',    // replaced (new file uploaded)
            signature: '',              // cleared
          }
        });

        await service.save(form, docId, type);

        expect(
          attachmentService.add.calledWith(sinon.match({ _id: 'person1' }), 'user-file-new-doc.pdf'),
          'Should add the new document attachment'
        ).to.be.true;

        expect(
          attachmentService.remove.calledWith(sinon.match({ _id: 'person1' }), 'user-file-old-doc.pdf'),
          'Should remove the replaced document attachment'
        ).to.be.true;

        expect(
          attachmentService.remove.calledWith(sinon.match({ _id: 'person1' }), 'user-file-old-sig.png'),
          'Should remove the cleared signature attachment'
        ).to.be.true;

        const removeArgs = attachmentService.remove.getCalls().map(call => call.args[1]);
        expect(removeArgs, 'Should not remove the kept photo').to.not.include('user-file-keep-photo.png');

        expect(attachmentService.remove.callCount, 'Should only remove 2 orphaned attachments').to.equal(2);
      });
    });

    it('should attach multiple attachments (file widgets and binary fields) to main document', async () => {
      const xmlWithMultipleAttachments =
        '<data id="contact:person:create">' +
        '<person>' +
        '<parent>PARENT</parent>' +
        '<type>person</type>' +
        '<name>Dr. Maria Garcia</name>' +
        '<phone>+254712345680</phone>' +
        '<sex>female</sex>' +
        '<photo type="binary">BASE64_PHOTO_DATA</photo>' +
        '<signature type="binary">BASE64_SIGNATURE_DATA</signature>' +
        '</person>' +
        '</data>';

      const form = { getDataStr: () => xmlWithMultipleAttachments };
      const docId = null;
      const type = 'person';

      const mockFile1 = new File(['certificate content'], 'certificate.pdf', { type: 'application/pdf' });
      const mockFile2 = new File(['insurance ID content'], 'insurance-id.pdf', { type: 'application/pdf' });
      sinon.stub(FileManager, 'getCurrentFiles').returns([mockFile1, mockFile2]);

      enketoTranslationService.contactRecordToJs.returns({
        doc: { _id: 'person1', type: 'person', name: 'Dr. Maria Garcia', phone: '+254712345680', sex: 'female' }
      });

      await service.save(form, docId, type);

      expect(
        attachmentService.add.callCount,
        'AttachmentService.add should be called 4 times (2 file widgets + 2 binary fields)'
      ).to.equal(4);

      attachmentService.add.getCalls().forEach(call => {
        expect(call.args[0]._id, 'All attachments should attach to the main document').to.equal('person1');
      });

      const fileWidget1Call = attachmentService.add.getCall(0);
      expect(fileWidget1Call.args[1], 'First file widget attachment name').to.equal('user-file-certificate.pdf');
      expect(fileWidget1Call.args[2], 'First file widget content').to.equal(mockFile1);
      expect(fileWidget1Call.args[3], 'First file widget content type').to.equal('application/pdf');
      expect(fileWidget1Call.args[4], 'File widget should not be pre-encoded').to.be.false;

      const fileWidget2Call = attachmentService.add.getCall(1);
      expect(fileWidget2Call.args[1], 'Second file widget attachment name').to.equal('user-file-insurance-id.pdf');
      expect(fileWidget2Call.args[2], 'Second file widget content').to.equal(mockFile2);
      expect(fileWidget2Call.args[3], 'Second file widget content type').to.equal('application/pdf');
      expect(fileWidget2Call.args[4], 'File widget should not be pre-encoded').to.be.false;

      const photoCall = attachmentService.add.getCall(2);
      expect(
        photoCall.args[1],
        'Photo binary field XPath-based name'
      ).to.equal('user-file/contact:person:create/person/photo');
      expect(photoCall.args[2], 'Photo binary field content').to.equal('BASE64_PHOTO_DATA');
      expect(photoCall.args[3], 'Binary field content type').to.equal('image/png');
      expect(photoCall.args[4], 'Binary field should be pre-encoded').to.be.true;

      const signatureCall = attachmentService.add.getCall(3);
      expect(
        signatureCall.args[1],
        'Signature binary field XPath-based name'
      ).to.equal('user-file/contact:person:create/person/signature');
      expect(signatureCall.args[2], 'Signature binary field content').to.equal('BASE64_SIGNATURE_DATA');
      expect(signatureCall.args[3], 'Binary field content type').to.equal('image/png');
      expect(signatureCall.args[4], 'Binary field should be pre-encoded').to.be.true;
    });
  });
});
