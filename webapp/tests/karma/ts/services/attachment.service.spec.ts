import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { AttachmentService } from '@mm-services/attachment.service';

describe('Attachment service', () => {
  let service;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttachmentService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('add', () => {
    it('should work with no doc', () => {
      const doc = undefined;
      service.add();
      expect(doc).to.equal(undefined);
    });

    it('should add already encoded attachment', () => {
      const doc = {};
      service.add(doc, 'attname', 'string', 'text/plain', true);
      expect(doc).to.deep.equal({
        _attachments: {
          attname: {
            data: 'string',
            content_type: 'text/plain'
          }
        }
      });
    });

    it('should encode and add attachment', () => {
      const doc = {
        _attachments: {
          anAttachment: {},
        }
      };
      service.add(doc, 'name', 'string', 'text/plain');
      expect(doc).to.deep.equal({
        _attachments: {
          name: {
            data: new Blob([ 'string' ], { type: 'text/plain' }),
            content_type: 'text/plain'
          },
          anAttachment: {}
        }
      });
    });

    it('should overwrite existing attachment', () => {
      const doc = {
        _attachments: {
          'the_attachment.xml': {
            data: 'whatever',
          },
        }
      };
      service.add(doc, 'the_attachment.xml', 'whaterver', 'font/woff2', true);
      expect(doc).to.deep.equal({
        _attachments: {
          'the_attachment.xml': {
            data: 'whaterver',
            content_type: 'font/woff2'
          },
        }
      });
    });
  });

  describe('remove', () => {
    it('should work with no doc', () => {
      service.remove();
    });

    it('should work with doc with no attachments', () => {
      const doc = { a: '1', b: 2 };
      service.remove(doc, 'attname');
      expect(doc).to.deep.equal( { a: '1', b: 2 });
    });

    it('should work with doc with no attachment name', () => {
      const doc = { a: '1', b: 2 };
      service.remove(doc);
      expect(doc).to.deep.equal( { a: '1', b: 2 });
    });

    it('should work with doc missing attachment', () => {
      const doc = {
        a: 1,
        _attachments: {
          att1: { data: 'a' },
          att2: { data: 'a' },
        },
      };
      service.remove(doc, 'noattachment');
      expect(doc).to.deep.equal({
        a: 1,
        _attachments: {
          att1: { data: 'a' },
          att2: { data: 'a' },
        },
      });
    });

    it('should remove attachment', () => {
      const doc = {
        a: 1,
        _attachments: {
          att1: { data: 'a' },
          att2: { data: 'a' },
        },
      };
      service.remove(doc, 'att2');
      expect(doc).to.deep.equal({
        a: 1,
        _attachments: {
          att1: { data: 'a' },
        },
      });
    });
  });
});
