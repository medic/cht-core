import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { GetReportContentService } from '@mm-services/get-report-content.service';
import { DbService } from '@mm-services/db.service';

describe('GetReportContentService service', () => {
  let service;
  let db;

  beforeEach(() => {
    db = {
      getAttachment: sinon.stub()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: () => db } },
      ]
    });

    service = TestBed.inject(GetReportContentService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getReportContent', () => {
    it('should do nothing if no doc', async () => {
      const content = await service.getReportContent();
      expect(content).to.be.undefined;
      expect(db.getAttachment.called).to.be.false;
    });

    it('should do nothing when doc has no _id', async () => {
      const content = await service.getReportContent({ content: 'whatever' });
      expect(content).to.be.undefined;
      expect(db.getAttachment.called).to.be.false;
    });

    it('should return old style content if present', async () => {
      const doc = {
        _id: 'id',
        content: 'this is the content',
        fields: {
          field: '1',
        },
        _attachments: {
          content: 'defined',
        }
      };

      const content = await service.getReportContent(doc);
      expect(content).to.equal('this is the content');
      expect(db.getAttachment.called).to.be.false;
    });

    it('should return attachment content if present', async () => {
      const attachment = 'this is the attachment content';
      const doc = {
        _id: 'whatever',
        fields: {
          field: '1',
        },
        _attachments: {
          content: 'defined',
        }
      };
      db.getAttachment.resolves(new Blob([attachment]));
      const content = await service.getReportContent(doc);

      expect(content).to.equal(attachment);
      expect(db.getAttachment.args).to.deep.equal([['whatever', 'content']]);
    });

    it('should throw db attachment errors', async () => {
      const doc = {
        _id: 'whatever',
        fields: {
          field: '1',
        },
        _attachments: {
          content: 'defined',
        }
      };
      db.getAttachment.rejects({ error: 'whatever' });
      try {
        await service.getReportContent(doc);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ error: 'whatever' });
      }
    });

    it('should return fields if there are no attachments', async () => {
      const doc = {
        _id: 'whatever',
        fields: {
          field: '1',
          field2: '2',
        },
      };

      const content = await service.getReportContent(doc);
      expect(content).to.deep.equal({ field: '1', field2: '2' });
      expect(db.getAttachment.called).to.be.false;
    });

    it('should return fields if content attachment is not present', async () => {
      const doc = {
        _id: 'id',
        fields: {
          one: '1',
          two: 2,
          three: false,
        },
        _attachments: {
          not_content: 'defined',
        }
      };

      const content = await service.getReportContent(doc);
      expect(content).to.deep.equal({ one: '1', two: 2, three: false });
      expect(db.getAttachment.called).to.be.false;
    });
  });
});
