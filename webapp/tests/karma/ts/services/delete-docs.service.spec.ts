import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';
import mock from 'xhr-mock';

import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { ChangesService } from '@mm-services/changes.service';
import { DeleteDocsService } from '@mm-services/delete-docs.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';

describe('DeleteDocs service', () => {

  let service;
  let bulkDocs;
  let isOnlineOnly;
  let extractLineageService;
  let getDataContext;
  let bind;
  let getContact;

  beforeEach(() => {
    bulkDocs = sinon.stub();
    isOnlineOnly = sinon.stub().returns(false);
    const Changes = () => undefined;
    Changes.killWatchers = () => undefined;
    extractLineageService = { extract: sinon.stub() };

    getContact = sinon.stub();
    bind = sinon.stub().returns(getContact);
    getDataContext = sinon.stub().resolves({ bind });
    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: () => ({ bulkDocs }) } },
        { provide: SessionService, useValue: { isOnlineOnly } },
        { provide: ChangesService, useValue: Changes },
        { provide: ExtractLineageService, useValue: extractLineageService },
        { provide: CHTDatasourceService, useValue: { getDataContext } },
      ]
    });
    service = TestBed.inject(DeleteDocsService);

    mock.setup();
  });

  afterEach(() => {
    sinon.restore();
    mock.teardown();
  });

  it('returns bulkDocs errors', () => {
    bulkDocs.rejects('errcode2');
    return service
      .delete({ _id: 'xyz' })
      .then(() => assert.fail('expected error to be thrown'))
      .catch((err) => {
        expect(bulkDocs.callCount).to.equal(1);
        expect(err.name).to.equal('errcode2');
        expect(getDataContext.calledOnceWithExactly()).to.be.true;
        expect(bind.notCalled).to.be.true;
        expect(getContact.notCalled).to.be.true;
      });
  });

  it('throws if silent errors in bulkDocs', () => {
    const clinic = {
      _id: 'b',
      type: 'clinic',
      contact: {
        name: 'sally',
        phone: '+555'
      }
    };
    const person = {
      _id: 'a',
      type: 'person',
      phone: '+555',
      name: 'sally',
      parent: {
        _id: 'b'
      }
    };
    getContact.resolves(clinic);
    const consoleErrorMock = sinon.stub(console, 'error');
    bulkDocs.resolves(
      // person is not deleted, but clinic is edited just fine. Oops.
      [
        { id: person._id, error: 'conflict' },
        { id: clinic._id }
      ]
    );
    return service
      .delete(person)
      .then(() => {
        assert.fail('expected error to be thrown');
      })
      .catch((err) => {
        expect(err).to.be.ok;
        expect(consoleErrorMock.callCount).to.equal(1);
        expect(consoleErrorMock.args[0][0]).to.equal('Deletion errors');
        expect(getDataContext.calledOnceWithExactly()).to.be.true;
        
        expect(getContact.calledOnceWithExactly({ uuid: clinic._id })).to.be.true;
      });
  });

  it('does not allow deleting child and parent that will conflict', () => {
    const clinic = {
      _id: 'b',
      type: 'clinic',
      contact: {
        _id: 'a',
        name: 'sally'
      }
    };
    const person = {
      _id: 'a',
      type: 'person',
      name: 'sally',
      parent: {
        _id: 'b'
      }
    };
    getContact.resolves(clinic);
    return service
      .delete([ person, clinic ])
      .then(() => {
        assert.fail('expected error to be thrown');
      })
      .catch((err) => {
        expect(err).to.be.ok;
        expect(getDataContext.calledOnceWithExactly()).to.be.true;
        
        expect(getContact.calledOnceWithExactly({ uuid: clinic._id })).to.be.true;
      });
  });

  it('marks the record deleted', function() {
    bulkDocs.resolves([]);
    const record = {
      _id: 'xyz',
      _rev: '123',
      type: 'data_record'
    };
    const expected = {
      _id: 'xyz',
      _rev: '123',
      type: 'data_record',
      _deleted: true
    };
    return service.delete(record).then(function() {
      expect(bulkDocs.callCount).to.equal(1);
      expect(bulkDocs.args[0][0][0]).to.deep.equal(expected);
      expect(getDataContext.calledOnceWithExactly()).to.be.true;
      expect(bind.notCalled).to.be.true;
      expect(getContact.notCalled).to.be.true;
    });
  });

  it('marks multiple records deleted', () => {
    bulkDocs.resolves([]);
    const record1 = {
      _id: 'xyz',
      _rev: '123',
      type: 'data_record'
    };
    const record2 = {
      _id: 'abc',
      _rev: '456',
      type: 'data_record'
    };
    const expected1 = {
      _id: 'xyz',
      _rev: '123',
      type: 'data_record',
      _deleted: true
    };
    const expected2 = {
      _id: 'abc',
      _rev: '456',
      type: 'data_record',
      _deleted: true
    };
    return service.delete([ record1, record2 ]).then(() => {
      expect(bulkDocs.callCount).to.equal(1);
      expect(bulkDocs.args[0][0].length).to.equal(2);
      expect(bulkDocs.args[0][0][0]).to.deep.equal(expected1);
      expect(bulkDocs.args[0][0][1]).to.deep.equal(expected2);
      expect(getDataContext.calledOnceWithExactly()).to.be.true;
      expect(bind.notCalled).to.be.true;
      expect(getContact.notCalled).to.be.true;
    });
  });

  it('sends a direct request to the server when user is an admin', () => {
    const record1 = { _id: 'xyz', _rev: '1' };
    const record2 = { _id: 'abc', _rev: '1' };
    mock.post('/api/v1/bulk-delete', {
      status: 200,
      body: '{ "hello": "there" }'
    });

    isOnlineOnly.returns(true);
    return service.delete([ record1, record2 ]).then(() => {
      expect(bulkDocs.callCount).to.equal(0);
      expect(getDataContext.calledOnceWithExactly()).to.be.true;  
      expect(getContact.notCalled).to.be.true;
    });
  });

  it('fires the progress event handler on progress events', () => {
    const record1 = { _id: 'xyz' };
    const record2 = { _id: 'abc' };
    const onProgress = sinon.spy();
    const response = '[[{"ok": true}, {"ok": true}],';
    mock.post('/api/v1/bulk-delete', {
      status: 200,
      body: response
    });
    isOnlineOnly.returns(true);
    return service
      .delete([ record1, record2 ], { progress: onProgress })
      .then(() => {
        assert.fail('Should have thrown'); // The onload handler should throw an error due to partial json
      })
      .catch(() => {
        expect(onProgress.callCount).to.equal(1);
        expect(onProgress.getCall(0).args[0]).to.equal(2);
        expect(getDataContext.calledOnceWithExactly()).to.be.true;      
        expect(bind.notCalled).to.be.true;
        expect(getContact.notCalled).to.be.true;
      });
  });

  it('does not modify the given array - #2417', () => {
    const clinic = {
      _id: 'b',
      type: 'clinic',
      contact: {
        _id: 'a',
        name: 'sally'
      }
    };
    const person = {
      _id: 'a',
      type: 'person',
      name: 'sally',
      parent: {
        _id: 'b'
      }
    };
    const docs = [ person ];
    getContact.resolves(clinic);
    bulkDocs.resolves([]);
    return service.delete(docs).then(() => {
      expect(docs.length).to.equal(1);
      expect(bulkDocs.args[0][0].length).to.equal(2);
      expect(getDataContext.calledOnceWithExactly()).to.be.true; 
      expect(getContact.calledOnceWithExactly({ uuid: clinic._id })).to.be.true;
    });
  });

  it('minifies lineage for circular referenced report #4076', () => {
    const clinic = {
      _id: 'b',
      type: 'clinic',
      contact: {
        _id: 'a',
      }
    };
    const person = {
      _id: 'a',
      type: 'person',
      name: 'sally',
      parent: clinic
    };
    clinic.contact = person;

    const report = {
      _id: 'c',
      type: 'data_record',
      contact: person
    };

    const docs = [ report ];
    bulkDocs.resolves([]);
    let isCircularBefore = false;
    let isCircularAfter = false;
    try {
      JSON.stringify(report);
    } catch (e) {
      if (e.message.startsWith('Converting circular structure to JSON')) {
        isCircularBefore = true;
      }
    }

    return service.delete(docs).then(() => {
      expect(docs.length).to.equal(1);
      expect(isCircularBefore).to.equal(true);
      try {
        JSON.stringify(bulkDocs.args[0][0][0]);
      } catch (e) {
        if (e.message.startsWith('Converting circular structure to JSON')) {
          isCircularAfter = true;
        }
      }
      expect(isCircularAfter).to.equal(false);
      expect(bulkDocs.args[0][0].length).to.equal(1);
      expect(getDataContext.calledOnceWithExactly()).to.be.true;
      expect(bind.notCalled).to.be.true;
      expect(getContact.notCalled).to.be.true;
    });
  });
});
