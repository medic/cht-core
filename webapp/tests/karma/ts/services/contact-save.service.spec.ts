import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { assert } from 'chai';
import { provideMockStore } from '@ngrx/store/testing';

import { DbService } from '@mm-services/db.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { EnketoTranslationService } from '@mm-services/enketo-translation.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { ContactSaveService } from '@mm-services/contact-save.service';
import { ServicesActions } from '@mm-actions/services';

describe('ContactSave service', () => {

  let service;
  let bulkDocs;
  let get;
  let contactTypesService;
  let enketoTranslationService;
  let extractLineageService;
  let setLastChangedDoc;

  beforeEach(() => {
    enketoTranslationService = {
      contactRecordToJs: sinon.stub(),
    };

    contactTypesService = { isHardcodedType: sinon.stub().returns(false) };
    extractLineageService = { extract: sinon.stub() };
    bulkDocs = sinon.stub();
    get = sinon.stub();
    setLastChangedDoc = sinon.stub(ServicesActions.prototype, 'setLastChangedDoc');

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: DbService, useValue: { get: () => ({ get, bulkDocs }) } },
        { provide: ContactTypesService, useValue: contactTypesService },
        { provide: EnketoTranslationService, useValue: enketoTranslationService },
        { provide: ExtractLineageService, useValue: extractLineageService },

      ]
    });

    service = TestBed.inject(ContactSaveService);
  });

  afterEach(() => sinon.restore());

  it('fetches and binds db types and minifies string contacts', () => {
    const form = { getDataStr: () => '<data></data>' };
    const docId = null;
    const type = 'some-contact-type';

    enketoTranslationService.contactRecordToJs.returns({
      doc: { _id: 'main1', type: 'main', contact: 'abc' }
    });
    bulkDocs.returns(Promise.resolve([]));
    get.returns(Promise.resolve({ _id: 'abc', name: 'gareth', parent: { _id: 'def' } }));
    extractLineageService.extract.returns({ _id: 'abc', parent: { _id: 'def' } });

    return service
      .save(form, docId, type)
      .then(() => {
        assert.equal(get.callCount, 1);
        assert.equal(get.args[0][0], 'abc');

        assert.equal(bulkDocs.callCount, 1);

        const savedDocs = bulkDocs.args[0][0];

        assert.equal(savedDocs.length, 1);
        assert.deepEqual(savedDocs[0].contact, {
          _id: 'abc',
          parent: {
            _id: 'def'
          }
        });
        assert.equal(setLastChangedDoc.callCount, 1);
        assert.deepEqual(setLastChangedDoc.args[0], [savedDocs[0]]);
      });
  });

  it('fetches and binds db types and minifies object contacts', () => {
    const form = { getDataStr: () => '<data></data>' };
    const docId = null;
    const type = 'some-contact-type';

    enketoTranslationService.contactRecordToJs.returns({
      doc: { _id: 'main1', type: 'main', contact: { _id: 'abc', name: 'Richard' } }
    });
    bulkDocs.returns(Promise.resolve([]));
    get.returns(Promise.resolve({ _id: 'abc', name: 'Richard', parent: { _id: 'def' } }));
    extractLineageService.extract.returns({ _id: 'abc', parent: { _id: 'def' } });

    return service
      .save(form, docId, type)
      .then(() => {
        assert.equal(get.callCount, 1);
        assert.equal(get.args[0][0], 'abc');

        assert.equal(bulkDocs.callCount, 1);

        const savedDocs = bulkDocs.args[0][0];

        assert.equal(savedDocs.length, 1);
        assert.deepEqual(savedDocs[0].contact, {
          _id: 'abc',
          parent: {
            _id: 'def'
          }
        });
        assert.equal(setLastChangedDoc.callCount, 1);
        assert.deepEqual(setLastChangedDoc.args[0], [savedDocs[0]]);
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

    bulkDocs.returns(Promise.resolve([]));

    return service
      .save(form, docId, type)
      .then(() => {
        assert.isTrue(bulkDocs.calledOnce);

        const savedDocs = bulkDocs.args[0][0];

        assert.equal(savedDocs[0]._id, 'main1');

        assert.equal(savedDocs[1]._id, 'kid1');
        assert.equal(savedDocs[1].parent._id, 'main1');
        assert.equal(savedDocs[1].parent.extracted, true);

        assert.equal(savedDocs[2]._id, 'sis1');
        assert.equal(savedDocs[2].parent._id, 'main1');
        assert.equal(savedDocs[2].parent.extracted, true);

        assert.equal(extractLineageService.extract.callCount, 3);

        assert.equal(setLastChangedDoc.callCount, 1);
        assert.deepEqual(setLastChangedDoc.args[0], [savedDocs[0]]);
      });
  });

});
