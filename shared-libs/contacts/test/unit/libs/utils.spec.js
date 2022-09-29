const chai = require('chai');
const utils = require('../../../src/libs/utils');
const sinon = require('sinon');

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
});
