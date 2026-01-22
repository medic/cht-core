import { expect } from 'chai';
import { TestBed } from '@angular/core/testing';
import { DbService } from '../../../src/stubs/db.service';

describe('DB Service', () => {
  let service: DbService;

  beforeEach(() => service = TestBed.inject(DbService));

  ['get', 'info'].forEach(fnName => {
    it(fnName, async () => {
      const result = await service.get()[fnName]();

      expect(result).to.be.undefined;
    });
  });

  describe('query', () => {
    it('returns empty rows for shared-contacts/contacts_by_phone', async () => {
      const selector = 'shared-contacts/contacts_by_phone';

      const result = await service
        .get()
        .query(selector);

      expect(result).to.deep.equal({ rows: [] });
    });

    it('throws error for other queries', async () => {
      const selector = 'anythingelse';
      const options = { hello: 'world' };

      const db = service.get();

      await expect(db.query(selector, options)).to.be.rejectedWith(
        `Unsupported selector: DbService.get.query(${selector}, ${JSON.stringify(options)})`
      );
    });
  });

  it('getAttachment', async () => {
    const result = await service
      .get()
      .getAttachment();

    expect(result).to.be.instanceof(Blob);
  });
});
