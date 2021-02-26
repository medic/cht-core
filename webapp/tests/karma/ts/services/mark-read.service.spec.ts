import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { MarkReadService } from '@mm-services/mark-read.service';
import { DbService } from '@mm-services/db.service';
import { ReadDocsProvider } from '@mm-providers/read-docs.provider';

describe('MarkReadService', () => {
  let service: MarkReadService;
  let dbService;
  let bulkDocs;

  beforeEach(() => {
    bulkDocs = sinon.stub();
    dbService = { get: sinon.stub().returns({ bulkDocs }) };

    TestBed.configureTestingModule({
      providers: [
        ReadDocsProvider,
        { provide: DbService, useValue: dbService },
      ]
    });
    service = TestBed.inject(MarkReadService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should mark messages as read', async() => {
    const given = [ { _id: 'xyz' } ];
    const expected = [ { _id: 'read:message:xyz' } ];
    bulkDocs.resolves();

    await service.markAsRead(given);

    expect(dbService.get.args[0][0].meta).to.equal(true);
    expect(bulkDocs.args[0][0]).to.deep.equal(expected);
  });

  it('should mark reports as read', async() => {
    const given = [ { _id: 'xyz', form: 'P' } ];
    const expected = [ { _id: 'read:report:xyz' } ];
    bulkDocs.resolves();

    await service.markAsRead(given);

    expect(dbService.get.args[0][0].meta).to.equal(true);
    expect(bulkDocs.args[0][0]).to.deep.equal(expected);
  });

  it('should ignore conflicts when marking a document read thats already read', async () => {
    const given = [ { _id: 'xyz' } ];
    const conflictResult = { ok: false, id: 'read:message:xyz', rev: '1' };
    bulkDocs.resolves([ conflictResult ]);

    await service.markAsRead(given);

    expect(bulkDocs.callCount).to.equal(1);
  });

  it('should return bulkDocs errors', () => {
    const given = { _id: 'xyz' };
    const expected = 'errcode2';
    bulkDocs.rejects(expected);

    return service
      .markAsRead([given])
      .catch(err => {
        expect(err).to.include({ name: expected });
      });
  });

  it('should mark multiple docs read', async() => {
    const given = [
      { _id: 'a' },
      { _id: 'b' }
    ];
    const expected = [
      { _id: 'read:message:a' },
      { _id: 'read:message:b' }
    ];
    bulkDocs.resolves();

    await service.markAsRead(given);

    expect(bulkDocs.args[0][0]).to.deep.equal(expected);
  });
});
