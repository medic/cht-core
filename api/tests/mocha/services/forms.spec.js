const { expect } = require('chai');
const sinon = require('sinon');

const service = require('../../../src/services/forms');
const db = require('../../../src/db');

describe('forms service', () => {

  afterEach(() => {
    sinon.restore();
  });

  describe('getXFormAttachment', () => {

    it('returns attachment called "xml"', () => {
      const expected = '<myxml/>';
      const given =  { _attachments: { xml: expected } };
      const actual = service.getXFormAttachment(given);
      expect(actual).to.equal(expected);
    });

    it('returns attachment with "xml" file extension', () => {
      const expected = '<myxml/>';
      const given =  { _attachments: { 'my-form.xml': expected } };
      const actual = service.getXFormAttachment(given);
      expect(actual).to.equal(expected);
    });

    it('ignores attachment called "model.xml"', () => {
      const given =  { _attachments: { 'model.xml': '<myxml/>' } };
      const actual = service.getXFormAttachment(given);
      expect(actual).to.equal(undefined);
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
          attachments: true,
          binary: true,
        }]]);
      });
    });

    it('returns an empty array when no xform docs found', () => {
      const given = [ { doc: {} } ];
      sinon.stub(db.medic, 'allDocs').resolves({ rows: given });
      return service.getFormDocs().then(actual => {
        expect(actual).to.deep.equal([]);
        expect(db.medic.allDocs.args).to.deep.equal([[{
          startkey: 'form:',
          endkey: 'form:\ufff0',
          include_docs: true,
          attachments: true,
          binary: true,
        }]]);
      });
    });

    it('returns doc with form type and "xml" attachment', () => {
      const given = [
        { doc: { _id: 'form:a', type: 'form', _attachments: { xml: '<myxml/>' } } },
        { doc: { _id: 'form:b', type: 'form', _attachments: { xsl: '<myxsl/>' } } },
        { doc: { _id: 'form:c', _attachments: { xml: '<myxml/>' } } },
      ];
      sinon.stub(db.medic, 'allDocs').resolves({ rows: given });
      return service.getFormDocs().then(actual => {
        expect(actual.length).to.equal(1);
        expect(actual[0]._id).to.equal('form:a');
      });
    });

  });


});
