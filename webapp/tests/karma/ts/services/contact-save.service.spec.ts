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
      const form = { getDataStr: () => '<data><person><name>John Doe</name></person></data>' };
      const docId = null;
      const type = 'person';

      const mockFile = new File(['test file content'], 'test-photo.png', { type: 'image/png' });
      sinon.stub(FileManager, 'getCurrentFiles').returns([mockFile]);

      enketoTranslationService.contactRecordToJs.returns({
        doc: { _id: 'person1', type: 'person', name: 'John Doe' }
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

    it('should extract and attach binary field data from XML', () => {
      const xmlWithBinaryField =
        '<data id="person-create">' +
        '<person>' +
        '<name>Jane Doe</name>' +
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
        doc: { _id: 'person1', type: 'person', name: 'Jane Doe' }
      });

      return service
        .save(form, docId, type)
        .then(() => {
          assert.isTrue(attachmentService.add.calledOnce, 'AttachmentService.add should be called once');

          const addCall = attachmentService.add.getCall(0);
          assert.equal(addCall.args[0]._id, 'person1', 'Should attach to the main document');
          assert.equal(
            addCall.args[1],
            'user-file/person-create/person/signature',
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

    it('should attach binary field to sibling document when field is in sibling section', () => {
      const xmlWithSibling =
        '<data id="clinic-create">' +
        '<clinic>' +
        '<name>Main Health Clinic</name>' +
        '</clinic>' +
        '<contact>' +
        '<name>Dr. Smith</name>' +
        '<signature type="binary">' +
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' +
        '</signature>' +
        '</contact>' +
        '</data>';

      const form = { getDataStr: () => xmlWithSibling };
      const docId = null;
      const type = 'clinic';

      sinon.stub(FileManager, 'getCurrentFiles').returns([]);

      enketoTranslationService.contactRecordToJs.returns({
        doc: { _id: 'clinic1', type: 'clinic', name: 'Main Health Clinic', contact: 'NEW' },
        siblings: {
          contact: { _id: 'person1', type: 'person', name: 'Dr. Smith', parent: 'PARENT' }
        }
      });

      extractLineageService.extract.callsFake((contact: any) => {
        return { _id: contact._id };
      });

      return service
        .save(form, docId, type)
        .then(({ preparedDocs }) => {
          assert.equal(preparedDocs.length, 2, 'Should have 2 documents');
          assert.equal(preparedDocs[0]._id, 'clinic1', 'First doc should be clinic');
          assert.equal(preparedDocs[1]._id, 'person1', 'Second doc should be contact person');

          // There's only one binary field (signature in contact section), so should be called once
          assert.equal(attachmentService.add.callCount, 1, 'AttachmentService.add should be called once');

          const siblingCall = attachmentService.add.getCall(0);
          assert.equal(siblingCall.args[0]._id, 'person1', 'Should attach to the sibling contact document');
          assert.equal(
            siblingCall.args[1],
            'user-file/clinic-create/contact/signature',
            'Should use XPath-based attachment name'
          );
          assert.equal(
            siblingCall.args[2],
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'Should pass the base64 content'
          );
          assert.equal(siblingCall.args[3], 'image/png', 'Should use image/png as content type');
          assert.equal(siblingCall.args[4], true, 'Should indicate content is already base64 encoded');
        });
    });

    it('should attach binary fields to repeated child documents based on repeat index', () => {
      // XML structure: household registration with repeated children, each with their own photo
      const xmlWithRepeats =
        '<data id="household-create">' +
        '<household>' +
        '<name>Smith Family</name>' +
        '</household>' +
        '<child_data>' +
        '<child>' +
        '<name>Alice Smith</name>' +
        '<photo type="binary">AAAA</photo>' +
        '</child>' +
        '<child>' +
        '<name>Bob Smith</name>' +
        '<photo type="binary">BBBB</photo>' +
        '</child>' +
        '</child_data>' +
        '</data>';

      const form = { getDataStr: () => xmlWithRepeats };
      const docId = null;
      const type = 'household';

      sinon.stub(FileManager, 'getCurrentFiles').returns([]);

      // ContactSaveService creates three documents: household (main) and two children (repeats)
      enketoTranslationService.contactRecordToJs.returns({
        doc: { _id: 'household1', type: 'household', name: 'Smith Family' },
        repeats: {
          child_data: [
            { _id: 'child1', type: 'person', name: 'Alice Smith', parent: 'PARENT' },
            { _id: 'child2', type: 'person', name: 'Bob Smith', parent: 'PARENT' }
          ]
        }
      });

      extractLineageService.extract.callsFake((contact: any) => {
        return { _id: contact._id };
      });

      return service
        .save(form, docId, type)
        .then(({ preparedDocs }) => {
          assert.equal(preparedDocs.length, 3, 'Should have 3 documents');
          assert.equal(preparedDocs[0]._id, 'household1', 'First doc should be household');
          assert.equal(preparedDocs[1]._id, 'child1', 'Second doc should be first child');
          assert.equal(preparedDocs[2]._id, 'child2', 'Third doc should be second child');

          // Should be called twice: once for each child's photo
          assert.equal(attachmentService.add.callCount, 2, 'AttachmentService.add should be called twice');

          // First child's photo
          const firstChildCall = attachmentService.add.getCall(0);
          assert.equal(firstChildCall.args[0]._id, 'child1', 'Should attach first photo to first child document');
          assert.equal(
            firstChildCall.args[1],
            'user-file/household-create/child_data/child[1]/photo',
            'Should use XPath with repeat index [1] for first child'
          );
          assert.equal(firstChildCall.args[2], 'AAAA', 'Should pass first child photo content');

          // Second child's photo
          const secondChildCall = attachmentService.add.getCall(1);
          assert.equal(secondChildCall.args[0]._id, 'child2', 'Should attach second photo to second child document');
          assert.equal(
            secondChildCall.args[1],
            'user-file/household-create/child_data/child[2]/photo',
            'Should use XPath with repeat index [2] for second child'
          );
          assert.equal(secondChildCall.args[2], 'BBBB', 'Should pass second child photo content');
        });
    });

    it('should handle complex multi-document forms with attachments in all sections', () => {
      // Complex scenario: Clinic registration form that creates multiple documents
      // - Main clinic document with a photo
      // - Contact person sibling with a signature
      // - Multiple service records (repeats) each with their own certificate
      const xmlComplex =
        '<data id="clinic-registration">' +
        '<clinic>' +
        '<name>Central Health Clinic</name>' +
        '<photo type="binary">CLINIC_PHOTO</photo>' +
        '</clinic>' +
        '<contact>' +
        '<name>Dr. Jane Wilson</name>' +
        '<signature type="binary">DR_SIGNATURE</signature>' +
        '</contact>' +
        '<repeat>' +
        '<service>' +
        '<name>Vaccination Service</name>' +
        '<certificate type="binary">CERT_1</certificate>' +
        '</service>' +
        '<service>' +
        '<name>Laboratory Service</name>' +
        '<certificate type="binary">CERT_2</certificate>' +
        '</service>' +
        '</repeat>' +
        '</data>';

      const form = { getDataStr: () => xmlComplex };
      const docId = null;
      const type = 'clinic';

      sinon.stub(FileManager, 'getCurrentFiles').returns([]);

      // repeatsToJs creates keys as nodeName + '_data', so <service> becomes service_data
      enketoTranslationService.contactRecordToJs.returns({
        doc: { _id: 'clinic1', type: 'clinic', name: 'Central Health Clinic', contact: 'NEW' },
        siblings: {
          contact: { _id: 'person1', type: 'person', name: 'Dr. Jane Wilson', parent: 'PARENT' }
        },
        repeats: {
          service_data: [
            { _id: 'service1', type: 'service', name: 'Vaccination Service', parent: 'PARENT' },
            { _id: 'service2', type: 'service', name: 'Laboratory Service', parent: 'PARENT' }
          ]
        }
      });

      extractLineageService.extract.callsFake((contact: any) => {
        return { _id: contact._id };
      });

      return service
        .save(form, docId, type)
        .then(({ preparedDocs }) => {
          // Verify document structure
          assert.equal(preparedDocs.length, 4, 'Should have 4 documents: clinic, 2 services, contact');
          assert.equal(preparedDocs[0]._id, 'clinic1', 'First doc should be clinic');
          assert.equal(preparedDocs[1]._id, 'service1', 'Second doc should be first service (repeat)');
          assert.equal(preparedDocs[2]._id, 'service2', 'Third doc should be second service (repeat)');
          assert.equal(preparedDocs[3]._id, 'person1', 'Fourth doc should be contact person (sibling)');

          // Should be called 4 times: clinic photo, contact signature, 2 service certificates
          assert.equal(attachmentService.add.callCount, 4, 'AttachmentService.add should be called 4 times');

          // Verify clinic photo
          const clinicPhotoCall = attachmentService.add.getCall(0);
          assert.equal(clinicPhotoCall.args[0]._id, 'clinic1', 'Clinic photo should attach to clinic document');
          assert.equal(
            clinicPhotoCall.args[1],
            'user-file/clinic-registration/clinic/photo',
            'Clinic photo should use correct XPath'
          );
          assert.equal(clinicPhotoCall.args[2], 'CLINIC_PHOTO', 'Should pass clinic photo content');

          // Verify contact signature (sibling)
          const contactSignatureCall = attachmentService.add.getCall(1);
          assert.equal(
            contactSignatureCall.args[0]._id,
            'person1',
            'Contact signature should attach to contact document'
          );
          assert.equal(
            contactSignatureCall.args[1],
            'user-file/clinic-registration/contact/signature',
            'Contact signature should use correct XPath'
          );
          assert.equal(contactSignatureCall.args[2], 'DR_SIGNATURE', 'Should pass contact signature content');

          // Verify first service certificate (repeat)
          const service1CertCall = attachmentService.add.getCall(2);
          assert.equal(
            service1CertCall.args[0]._id,
            'service1',
            'First service certificate should attach to first service document'
          );
          assert.equal(
            service1CertCall.args[1],
            'user-file/clinic-registration/repeat/service[1]/certificate',
            'First service certificate should use correct XPath with [1] index'
          );
          assert.equal(service1CertCall.args[2], 'CERT_1', 'Should pass first service certificate content');

          // Verify second service certificate (repeat)
          const service2CertCall = attachmentService.add.getCall(3);
          assert.equal(
            service2CertCall.args[0]._id,
            'service2',
            'Second service certificate should attach to second service document'
          );
          assert.equal(
            service2CertCall.args[1],
            'user-file/clinic-registration/repeat/service[2]/certificate',
            'Second service certificate should use correct XPath with [2] index'
          );
          assert.equal(service2CertCall.args[2], 'CERT_2', 'Should pass second service certificate content');
        });
    });

    it('should handle multiple repeat wrapper elements with flattening', () => {
      // This test verifies that prepareRepeatedDocs correctly handles multiple
      // repeat wrapper elements (like <repeat> and <other-women-repeat>).
      // Real contact forms use separate wrapper elements for different repeat groups,
      // not mixed element types within a single <repeat> node.

      const xmlWithMultipleRepeats =
        '<data id="household-registration">' +
        '<household>' +
        '<name>Test Household</name>' +
        '</household>' +
        '<repeat>' +
        '<child>' +
        '<name>First Child</name>' +
        '<photo type="binary">PHOTO_1</photo>' +
        '</child>' +
        '<child>' +
        '<name>Second Child</name>' +
        '<photo type="binary">PHOTO_2</photo>' +
        '</child>' +
        '</repeat>' +
        '<contact>' +
        '<name>Contact Person</name>' +
        '<signature type="binary">SIGNATURE</signature>' +
        '</contact>' +
        '</data>';

      const form = { getDataStr: () => xmlWithMultipleRepeats };
      const docId = null;
      const type = 'household';

      sinon.stub(FileManager, 'getCurrentFiles').returns([]);

      // repeatsToJs processes <repeat> wrapper and creates child_data array
      enketoTranslationService.contactRecordToJs.returns({
        doc: { _id: 'household1', type: 'household', name: 'Test Household', contact: 'NEW' },
        siblings: {
          contact: { _id: 'contact1', type: 'person', name: 'Contact Person', parent: 'PARENT' }
        },
        repeats: {
          child_data: [
            { _id: 'child1', type: 'person', name: 'First Child', parent: 'PARENT' },
            { _id: 'child2', type: 'person', name: 'Second Child', parent: 'PARENT' }
          ]
        }
      });

      extractLineageService.extract.callsFake((contact: any) => {
        return { _id: contact._id };
      });

      return service
        .save(form, docId, type)
        .then(({ preparedDocs }) => {
          // Verify document structure: main, repeats, siblings
          // Expected: 1 household + 2 children + 1 contact = 4 total
          assert.equal(preparedDocs.length, 4, 'Should have 4 documents: 1 household, 2 children, 1 contact');
          assert.equal(preparedDocs[0]._id, 'household1', 'First doc should be main household');

          // Repeats should be in XML document order
          assert.equal(preparedDocs[1]._id, 'child1', 'Second doc should be first child');
          assert.equal(preparedDocs[2]._id, 'child2', 'Third doc should be second child');

          // Last doc should be the sibling
          assert.equal(preparedDocs[3]._id, 'contact1', 'Last doc should be contact sibling');

          // Verify attachments are routed correctly based on XPath matching
          assert.equal(attachmentService.add.callCount, 3, 'Should attach 3 binary fields');

          // Verify each attachment went to correct document based on XPath
          const child1PhotoCall = attachmentService.add.getCalls().find(call =>
            call.args[1].includes('repeat/child[1]/photo')
          );
          assert.isDefined(child1PhotoCall, 'Should have first child photo');
          assert.equal(child1PhotoCall!.args[0]._id, 'child1', 'First child photo should attach to child1');
          assert.equal(child1PhotoCall!.args[2], 'PHOTO_1', 'Should pass first child photo content');

          const child2PhotoCall = attachmentService.add.getCalls().find(call =>
            call.args[1].includes('repeat/child[2]/photo')
          );
          assert.isDefined(child2PhotoCall, 'Should have second child photo');
          assert.equal(child2PhotoCall!.args[0]._id, 'child2', 'Second child photo should attach to child2');
          assert.equal(child2PhotoCall!.args[2], 'PHOTO_2', 'Should pass second child photo content');

          const contactSignatureCall = attachmentService.add.getCalls().find(call =>
            call.args[1].includes('/contact/signature')
          );
          assert.isDefined(contactSignatureCall, 'Should have contact signature');
          assert.equal(contactSignatureCall!.args[0]._id, 'contact1', 'Contact signature should attach to contact1');
          assert.equal(contactSignatureCall!.args[2], 'SIGNATURE', 'Should pass contact signature content');
        });
    });
  });
});
