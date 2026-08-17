const pagination = require('../../../src/services/pagination');

describe('Pagination', () => {
  describe('parseCursor', () => {
    it('returns 0 when the cursor is not provided', () => {
      expect(pagination.parseCursor(undefined)).to.equal(0);
      expect(pagination.parseCursor(null)).to.equal(0);
      expect(pagination.parseCursor('')).to.equal(0);
    });

    it('returns the parsed offset for a valid cursor string', () => {
      expect(pagination.parseCursor('0')).to.equal(0);
      expect(pagination.parseCursor('42')).to.equal(42);
    });

    it('returns the parsed offset for a valid cursor number', () => {
      expect(pagination.parseCursor(0)).to.equal(0);
      expect(pagination.parseCursor(152)).to.equal(152);
    });

    it('throws InvalidArgumentError for non-numeric strings', () => {
      expect(() => pagination.parseCursor('abc')).to.throw(/cursor must be a non-negative integer/);
    });

    it('throws InvalidArgumentError for negative numbers', () => {
      expect(() => pagination.parseCursor('-1')).to.throw(/cursor must be a non-negative integer/);
    });

    it('throws InvalidArgumentError for non-integer numbers', () => {
      expect(() => pagination.parseCursor('1.5')).to.throw(/cursor must be a non-negative integer/);
    });

    it('throws InvalidArgumentError for values that don\'t coerce to a number', () => {
      expect(() => pagination.parseCursor({})).to.throw(/cursor must be a non-negative integer/);
    });
  });

  describe('parseLimit', () => {
    it('returns the default limit when none provided', () => {
      expect(pagination.parseLimit(undefined)).to.equal(pagination.DEFAULT_LIMIT);
      expect(pagination.parseLimit(null)).to.equal(pagination.DEFAULT_LIMIT);
      expect(pagination.parseLimit('')).to.equal(pagination.DEFAULT_LIMIT);
    });

    it('returns a custom default limit when none provided', () => {
      expect(pagination.parseLimit(undefined, 25)).to.equal(25);
    });

    it('returns the parsed number for valid string input', () => {
      expect(pagination.parseLimit('1')).to.equal(1);
      expect(pagination.parseLimit('500')).to.equal(500);
    });

    it('returns the number directly when given a number', () => {
      expect(pagination.parseLimit(42)).to.equal(42);
    });

    it('throws InvalidArgumentError for non-positive integers', () => {
      expect(() => pagination.parseLimit('0')).to.throw(/limit must be a positive integer/);
      expect(() => pagination.parseLimit('-5')).to.throw(/limit must be a positive integer/);
    });

    it('throws InvalidArgumentError for non-integer values', () => {
      expect(() => pagination.parseLimit('1.5')).to.throw(/limit must be a positive integer/);
      expect(() => pagination.parseLimit('not-a-number')).to.throw(/limit must be a positive integer/);
    });
  });

  describe('buildNextCursor', () => {
    it('returns the stringified next-skip offset when hasMore is true', () => {
      expect(pagination.buildNextCursor(0, 10, true)).to.equal('10');
      expect(pagination.buildNextCursor(20, 10, true)).to.equal('30');
    });

    it('returns null when hasMore is false', () => {
      expect(pagination.buildNextCursor(0, 5, false)).to.equal(null);
      expect(pagination.buildNextCursor(95, 5, false)).to.equal(null);
    });

    it('treats any falsy hasMore as no-more', () => {
      expect(pagination.buildNextCursor(0, 0, undefined)).to.equal(null);
      expect(pagination.buildNextCursor(0, 0, 0)).to.equal(null);
    });
  });
});
