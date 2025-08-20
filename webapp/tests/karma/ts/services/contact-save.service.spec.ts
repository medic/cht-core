import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { assert } from 'chai';
import { provideMockStore } from '@ngrx/store/testing';
import { HttpClient } from '@angular/common/http';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { EnketoTranslationService } from '@mm-services/enketo-translation.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { ContactSaveService } from '@mm-services/contact-save.service';
import { Contact, Qualifier } from '@medic/cht-datasource';

describe('ContactSave service', () => {

  let service;
  let enketoTranslationService;
  let extractLineageService;
  let clock;
  let chtDatasourceService;
  let getContact;

  beforeEach(() => {
    enketoTranslationService = {
      contactRecordToJs: sinon.stub(),
    };

    extractLineageService = { extract: sinon.stub() };
    getContact = sinon.stub();
    chtDatasourceService = { bind: sinon.stub().withArgs(Contact.v1.get).returns(getContact) };
    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: EnketoTranslationService, useValue: enketoTranslationService },
        { provide: ExtractLineageService, useValue: extractLineageService },
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
});
