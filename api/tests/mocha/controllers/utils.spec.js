const chai = require('chai'),
      utils = require('../../../src/controllers/utils'),
      sinon = require('sinon');
const _ = require('underscore');
const uuid = require('uuid');
const { performance } = require('perf_hooks');

let clock;

describe('controller utils', () => {

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  describe('invalid', () => {
    [
      {}, // object type
      null, // null type
      undefined, // undefined type
      [], // array type
      '', // empty string
      'xyz', // badly formatted string
      'Mar, 12 2001', // badly formatted string
      '2011-10-10', // incomplete string, use strict matching
      '2011-10-10T14:48:00', // missing timezone
      '2011-10-10T14:48:00-00000', // timezone with 5 digits
    ].forEach(val => {
      it(`${JSON.stringify(val)}`, () => {
        chai.expect(utils.isDateStrValid(val)).to.equal(false);
      });
    });
  });

  describe('valid', () => {
    [
      '2011-10-10T14:48:00-03', // proper format
      '2011-10-10T14:48:00-0330', // 4 digit timezone
      '2011-10-10T14:48:00Z', // Z for UTC
      '0', // ms since epoch
      0, // ms since epoch
      '123', // ms since epoch
      123, // ms since epoch
      '1467383343484', // ms since epoch
      1467383343484, // ms since epoch
      new Date().valueOf(), // output from native javascript method
      '2016-07-01T14:58:26.336Z', // output from native javascript method
      new Date().toISOString(), // utput from native javascript method
    ].forEach(val => {
      it(`${JSON.stringify(val)}`, () => {
        chai.expect(utils.isDateStrValid(val)).to.equal(true);
      });
    });
  });

  describe('difference', () => {
    it('should compute correct result', () => {
      chai.expect(utils.difference([1, 2, 3, 9], [4, 5, 6, 12, 15, 16])).to.deep.equal([1, 2, 3, 9]);
      chai.expect(utils.difference([1, 2, 3, 9], [1, 2, 3, 9])).to.deep.equal([]);
      chai.expect(utils.difference([1, 2, 3, 9], [1, 2, 3, 9, 11])).to.deep.equal([]);
      chai.expect(utils.difference([9, 3, 2, 1], [11, 9, 2, 1, 3])).to.deep.equal([]);
      chai.expect(utils.difference([9, 3, 2, 1, 17], [11, 9, 2, 1, 3])).to.deep.equal([17]);
      chai.expect(utils.difference([9, 6, 3, 2, 1, 17, 17], [11, 9, 2, 1, 3])).to.deep.equal([17, 17, 6]);
    });

    it('should compute correct result and faster comparing with underscore', () => {
      clock.restore();
      const common = Array.from({ length: 5000 }, () => uuid());
      const array1 = _.shuffle(Array.from({ length: 5000 }, () => uuid()).concat(common));
      const array2 = _.shuffle(Array.from({ length: 5000 }, () => uuid()).concat(common));

      let start = performance.now();
      const differenceUnderscore = _.difference(array1, array2);
      const durationUnderscore = performance.now() - start;

      start = performance.now();
      const differenceUtils = utils.difference(array1, array2);
      const durationUtils = performance.now() - start;

      chai.expect(differenceUnderscore.sort()).to.deep.equal(differenceUtils);
      chai.expect(durationUnderscore).to.be.above(durationUtils);
    });

    it('should compute correct result faster then underscore when no common elements', () => {
      clock.restore();
      const array1 = Array.from({ length: 10000 }, () => uuid());
      const array2 = Array.from({ length: 10000 }, () => uuid());

      let start = performance.now();
      const differenceUnderscore = _.difference(array1, array2);
      const durationUnderscore = performance.now() - start;

      start = performance.now();
      const differenceUtils = utils.difference(array1, array2);
      const durationUtils = performance.now() - start;

      chai.expect(differenceUnderscore.sort()).to.deep.equal(differenceUtils);
      chai.expect(durationUnderscore).to.be.above(durationUtils);
    });

    it('should compute correct result faster then underscore when all common elements', () => {
      clock.restore();
      const array1 = Array.from({ length: 10000 }, () => uuid());
      const array2 = _.shuffle(array1);

      let start = performance.now();
      const differenceUnderscore = _.difference(array1, array2);
      const durationUnderscore = performance.now() - start;

      start = performance.now();
      const differenceUtils = utils.difference(array1, array2);
      const durationUtils = performance.now() - start;

      chai.expect(differenceUnderscore.sort()).to.deep.equal(differenceUtils);
      chai.expect(durationUnderscore).to.be.above(durationUtils);
    });
  });

});
