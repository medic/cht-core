import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { ChangesService } from '@mm-services/changes.service';
import { DeleteDocsService } from '@mm-services/delete-docs.service';

describe('DeleteDocs service', () => {

  let service;
  let get;
  let bulkDocs;
  let isOnlineOnly;
  let server;

  beforeEach(() => {
    get = sinon.stub();
    bulkDocs = sinon.stub();
    isOnlineOnly = sinon.stub().returns(false);
    const Changes = () => undefined;
    Changes.killWatchers = () => undefined;

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: () => ({ bulkDocs, get }) } },
        { provide: SessionService, useValue: { isOnlineOnly } },
        { provide: ChangesService, useValue: Changes },
      ]
    });
    service = TestBed.inject(DeleteDocsService);

    server = sinon.fakeServer.create();
    server.respondImmediately = true;
  });

  afterEach(() => {
    sinon.restore();
    server.restore();
  });

  it('returns bulkDocs errors', () => {
    bulkDocs.rejects('errcode2');
    return service
      .delete({ _id: 'xyz' })
      .then(() => assert.fail('expected error to be thrown'))
      .catch((err) => {
        expect(get.callCount).to.equal(0);
        expect(bulkDocs.callCount).to.equal(1);
        expect(err.name).to.equal('errcode2');
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
    get.resolves(clinic);
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
    get.resolves(clinic);
    return service
      .delete([ person, clinic ])
      .then(() => {
        assert.fail('expected error to be thrown');
      })
      .catch((err) => {
        expect(err).to.be.ok;
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
      expect(get.callCount).to.equal(0);
      expect(bulkDocs.callCount).to.equal(1);
      expect(bulkDocs.args[0][0][0]).to.deep.equal(expected);
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
      expect(get.callCount).to.equal(0);
      expect(bulkDocs.callCount).to.equal(1);
      expect(bulkDocs.args[0][0].length).to.equal(2);
      expect(bulkDocs.args[0][0][0]).to.deep.equal(expected1);
      expect(bulkDocs.args[0][0][1]).to.deep.equal(expected2);
    });
  });

  it('sends a direct request to the server when user is an admin', () => {
    const record1 = { _id: 'xyz', _rev: '1' };
    const record2 = { _id: 'abc', _rev: '1' };
    const expected1 = { _id: 'xyz' };
    const expected2 = { _id: 'abc' };
    server.respondWith([200, { 'Content-Type': 'application/json' }, '{ "hello": "there" }']);
    isOnlineOnly.returns(true);
    return service.delete([ record1, record2 ]).then(() => {
      expect(server.requests).to.have.lengthOf(1);
      expect(server.requests[0].url).to.equal('/api/v1/bulk-delete');
      expect(server.requests[0].requestBody).to.equal(JSON.stringify({
        docs: [expected1, expected2]
      }));
      expect(bulkDocs.callCount).to.equal(0);
    });
  });

  it('fires the progress event handler on progress events', () => {
    const record1 = { _id: 'xyz' };
    const record2 = { _id: 'abc' };
    const onProgress = sinon.spy();
    const response = '[[{"ok": true}, {"ok": true}],';
    server.respondWith([200, { 'Content-Type': 'application/json' }, response]);
    isOnlineOnly.returns(true);
    return service
      .delete([ record1, record2 ], { progress: onProgress })
      .then(() => {
        assert.fail('Should have thrown'); // The onload handler should throw an error due to partial json
      })
      .catch(() => {
        expect(onProgress.callCount).to.equal(1);
        expect(onProgress.getCall(0).args[0]).to.equal(2);
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
    get.resolves(clinic);
    bulkDocs.resolves([]);
    return service.delete(docs).then(() => {
      expect(docs.length).to.equal(1);
      expect(bulkDocs.args[0][0].length).to.equal(2);
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
    });
  });
});
