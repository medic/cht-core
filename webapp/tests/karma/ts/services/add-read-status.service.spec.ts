import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { AddReadStatusService } from '@mm-services/add-read-status.service';
import { DbService } from '@mm-services/db.service';

describe('Add Read Status Service', () => {
  let service: AddReadStatusService;
  let dbService;
  let allDocs;

  beforeEach(() => {
    allDocs = sinon.stub();
    dbService = {
      get: () => ({ allDocs, query: sinon.stub() })
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService }
      ]
    });

    service = TestBed.inject(AddReadStatusService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('updateReports()', () => {
    it('should return empty array when no models', async () => {
      const result = await service.updateReports([]);

      expect(result).to.deep.equal([]);
      expect(allDocs.callCount).to.equal(0);
    });

    it('should set the read status', async () => {
      allDocs.resolves({
        rows: [
          { id: 'a', key: 'a', value: { rev: 'x' } },
          { key: 'b', error: 'not_found' }, // read doc never existed
          { id: 'c', key: 'c', value: { rev: 'y', deleted: true } }, // read doc has been deleted
          { id: 'd', key: 'd', value: { rev: 'z' } }
        ]
      });
      const given = [
        { id: 'a' },  // supports no underscore prefix
        { _id: 'b' }, // AND works with underscore prefix
        { _id: 'c' },
        { _id: 'd' }
      ];
      const expected = [
        { id: 'a', read: true },
        { _id: 'b', read: false },
        { _id: 'c', read: false },
        { _id: 'd', read: true }
      ];

      const result = await service.updateReports(given);
      expect(result).to.deep.equal(expected);
      expect(allDocs.callCount).to.equal(1);
      expect(allDocs.args[0][0].keys).to.deep.equal([
        'read:report:a',
        'read:report:b',
        'read:report:c',
        'read:report:d'
      ]);
    });
  });

  describe('updateMessages()', () => {
    it('should return given when no models', async () => {
      const result = await service.updateMessages([]);

      expect(result).to.deep.equal([]);
      expect(allDocs.callCount).to.equal(0);
    });

    it('should set the read status', async () => {
      allDocs.resolves({
        rows: [
          { id: 'a', key: 'a', value: { rev: 'x' } },
          { key: 'b', error: 'not_found' },
          { id: 'c', key: 'c', value: { rev: 'y' } },
        ]
      });
      const given = [
        { id: 'a' },  // supports no underscore prefix
        { _id: 'b' }, // AND works with underscore prefix
        { _id: 'c' }
      ];
      const expected = [
        { id: 'a', read: true },
        { _id: 'b', read: false },
        { _id: 'c', read: true }
      ];

      const result = await service.updateMessages(given);

      expect(result).to.deep.equal(expected);
      expect(allDocs.callCount).to.equal(1);
      expect(allDocs.args[0][0].keys).to.deep.equal([
        'read:message:a',
        'read:message:b',
        'read:message:c'
      ]);
    });
  });
});
