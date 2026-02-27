const { expect } = require('chai');
const sinon = require('sinon');

const service = require('../../../src/services/forms');
const db = require('../../../src/db');
const logger = require('@medic/logger');

describe('forms service', () => {

  afterEach(() => {
    sinon.restore();
  });

  describe('getXFormAttachment', () => {

    it('returns attachment called "xml"', () => {
      const expected = '<myxml/>';
      const given = { _attachments: { xml: expected } };
      const actual = service.getXFormAttachment(given);
      expect(actual).to.equal(expected);
    });

    it('returns attachment with "xml" file extension', () => {
      const expected = '<myxml/>';
      const given = { _attachments: { 'my-form.xml': expected } };
      const actual = service.getXFormAttachment(given);
      expect(actual).to.equal(expected);
    });

    it('ignores attachment called "model.xml"', () => {
      const given = { _attachments: { 'model.xml': '<myxml/>' } };
      const actual = service.getXFormAttachment(given);
      expect(actual).to.equal(undefined);
    });
  });

  describe('getAttachment', () => {
    it('should return attachment when db.medic.getAttachment succeeds', async () => {
      const fakeDoc = { _id: 'doc1', _rev: '1-abc' };
      const fakeName = 'file.txt';
      const fakeAttachment = { data: 'hello' };

      sinon.stub(db.medic, 'getAttachment').resolves(fakeAttachment);
      sinon.stub(logger, 'error');
      const result = await service.getAttachment(fakeDoc._id, fakeName);

      expect(result).to.equal(fakeAttachment);
      expect(db.medic.getAttachment.calledOnceWith(fakeDoc._id, fakeName)).to.be.true;
      expect(logger.error.called).to.be.false;
    });

    it('should return undefined and log warning when error status is 404', async () => {
      const fakeDoc = { _id: 'doc1', _rev: '1-abc' };
      const fakeName = 'missing.txt';
      const notFoundError = new Error('Not found');
      notFoundError.status = 404;

      sinon.stub(db.medic, 'getAttachment').rejects(notFoundError);
      sinon.stub(logger, 'error');
      sinon.stub(logger, 'warn');
      const result = await service.getAttachment(fakeDoc._id, fakeName);

      expect(result).to.be.undefined;
      expect(logger.error.called).to.be.false;
      expect(logger.warn.called).to.be.true;
    });

    it('should throw error for non-404 errors', async () => {
      const fakeDoc = { _id: 'doc1', _rev: '1-abc' };
      const fakeName = 'error.txt';
      const someError = new Error('DB down');
      someError.status = 500;

      sinon.stub(db.medic, 'getAttachment').rejects(someError);
      sinon.stub(logger, 'error');

      try {
        await service.getAttachment(fakeDoc, fakeName, db);
        throw new Error('Expected error to be thrown');
      } catch (err) {
        expect(err).to.equal(someError);
        expect(logger.error.called).to.be.false;
      }
    });
  });

  describe('getFormDocs', () => {

    it('returns an empty array when no docs found', () => {
      const given = [];
      sinon.stub(db.medic, 'allDocs').resolves({ rows: given });
      return service.getFormDocs().then(actual => {
        expect(actual).to.deep.equal([]);
        expect(db.medic.allDocs.args).to.deep.equal([[{
          startkey: 'form:',
          endkey: 'form:\ufff0',
          include_docs: true,
        }]]);
      });
    });

    it('returns an empty array when no xform docs found', () => {
      const given = [{ doc: {} }];
      sinon.stub(db.medic, 'allDocs').resolves({ rows: given });
      return service.getFormDocs().then(actual => {
        expect(actual).to.deep.equal([]);
        expect(db.medic.allDocs.args).to.deep.equal([[{
          startkey: 'form:',
          endkey: 'form:\ufff0',
          include_docs: true,
        }]]);
      });
    });

    it('returns doc with form type and "xml" attachment', () => {
      const given = [
        { doc: { _id: 'form:a', type: 'form', _attachments: { xml: '<myxml/>' } } },
        { doc: { _id: 'form:b', type: 'form', _attachments: { xsl: '<myxsl/>' } } },
        { doc: { _id: 'form:c', _attachments: { xml: '<myxml/>' } } },
        { doc: { _id: 'form:d', type: 'not_form', _attachments: { xml: '<myxml/>' } } },
      ];
      sinon.stub(db.medic, 'allDocs').resolves({ rows: given });
      sinon.stub(service, 'getAttachment').resolves('<myxsl>');
      return service.getFormDocs().then(actual => {
        expect(actual.length).to.equal(1);
        expect(actual[0]._id).to.equal('form:a');
      });
    });

  });


});
