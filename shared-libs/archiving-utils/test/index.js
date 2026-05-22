const chai = require('chai');
const utils = require('../src/index');

describe('Archiving Utils', () => {
  describe('constants', () => {
    it('exposes the attachment metadata used to carry the id list', () => {
      chai.expect(utils.ATTACHMENT_NAME).to.equal('ids');
      chai.expect(utils.ATTACHMENT_TYPE).to.equal('text/plain');
    });
  });

  describe('encodeIds / decodeIds', () => {
    it('round-trips a list of ids through the attachment payload', () => {
      const ids = ['doc-1', 'doc-2', 'doc-3'];
      const encoded = utils.encodeIds(ids);
      chai.expect(Buffer.isBuffer(encoded)).to.equal(true);
      chai.expect(encoded.toString('utf8')).to.equal('doc-1\ndoc-2\ndoc-3');
      chai.expect(utils.decodeIds(encoded)).to.deep.equal(ids);
    });

    it('encodes an empty list to an empty buffer', () => {
      const encoded = utils.encodeIds([]);
      chai.expect(encoded.length).to.equal(0);
      chai.expect(utils.decodeIds(encoded)).to.deep.equal(['']);
    });

    it('preserves ids that contain non-ascii characters', () => {
      const ids = ['ünïcødé', 'mañana'];
      const encoded = utils.encodeIds(ids);
      chai.expect(utils.decodeIds(encoded)).to.deep.equal(ids);
    });
  });
});
