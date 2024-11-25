import { v1 } from '../src/contact';
import createQualifier = v1.createQualifier;
import { expect } from 'chai';

describe('contact-types', () => {
  describe('createQualifier', () => {
    it('should throw InvalidArgumentError when both freetext and type are null', () => {
      expect(() => createQualifier(null, null)).to.throw('Either "freetext" or "type" is required');
    });

    it('should throw InvalidArgumentError when both freetext and type are undefined', () => {
      expect(() => createQualifier(undefined, undefined))
        .to.throw('Either "freetext" or "type" is required');
    });

    it('should create a FreetextQualifier when only freetext is provided', () => {
      const result = createQualifier('search text', null);
      expect(result).to.deep.equal({ freetext: 'search text' });
    });

    it('should handle InvalidArgumentError when empty string freetext', () => {
      expect(() => createQualifier('', null)).to.throw('Either "freetext" or "type" is required');
    });

    it('should create a ContactTypeQualifier when only type is provided', () => {
      const result = createQualifier(null, 'person');
      expect(result).to.deep.equal({ contactType: 'person' });
    });

    it('should merge both qualifiers when freetext and type are provided', () => {
      const result = createQualifier('search text', 'person');
      expect(result).to.deep.equal({
        freetext: 'search text',
        contactType: 'person'
      });
    });

    it('should handle empty string freetext with valid type', () => {
      const result = createQualifier('', 'phone');
      expect(result).to.deep.equal({
        contactType: 'phone'
      });
    });

    it('should handle falsy but valid values', () => {
      const result = createQualifier('0', 'email');
      expect(result).to.deep.equal({
        freetext: '0',
        contactType: 'email'
      });
    });

    it('should handle whitespace-only freetext', () => {
      const result = createQualifier('   ', null);
      expect(result).to.deep.equal({
        freetext: '   '
      });
    });
  });
});
