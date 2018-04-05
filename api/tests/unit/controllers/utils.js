var utils = require('../../../controllers/utils'),
    sinon = require('sinon').sandbox.create();

var clock;

exports.setUp = function(callback) {
  clock = sinon.useFakeTimers();
  callback();
};

exports.tearDown = function (callback) {
  sinon.restore();
  callback();
};

exports['describe isDateStrValid'] = function(test) {
  var tests = [
    {
      // reject object type
      val: {},
      res: false
    },
    {
      // reject null type
      val: null,
      res: false
    },
    {
      // reject undefined type
      val: undefined,
      res: false
    },
    {
      // reject array type
      val: [],
      res: false
    },
    {
      // reject empty string
      val: '',
      res: false
    },
    {
      // reject badly formatted string
      val: 'xyz',
      res: false
    },
    {
      // reject badly formatted string
      val: 'Mar, 12 2001',
      res: false
    },
    {
      // reject incomplete string, use strict matching
      val: '2011-10-10',
      res: false
    },
    {
      // reject missing timezone
      val: '2011-10-10T14:48:00',
      res: false
    },
    {
      // rejects timezone with 5 digits
      val: '2011-10-10T14:48:00-00000',
      res: false
    },
    {
      // accepts proper format
      val: '2011-10-10T14:48:00-03',
      res: true
    },
    {
      // accept 4 digit timezone
      val: '2011-10-10T14:48:00-0330',
      res: true
    },
    {
      // accept Z for UTC
      val: '2011-10-10T14:48:00Z',
      res: true
    },
    {
      // accept ms since epoch
      val: '0',
      res: true
    },
    {
      // accept ms since epoch
      val: 0,
      res: true
    },
    {
      // accept ms since epoch
      val: '123',
      res: true
    },
    {
      // accept ms since epoch
      val: 123,
      res: true
    },
    {
      // accept ms since epoch
      val: '1467383343484',
      res: true
    },
    {
      // accept ms since epoch
      val: 1467383343484,
      res: true
    },
    {
      // accept output from native javascript method
      val: new Date().valueOf(),
      res: true
    },
    {
      // accept output from native javascript method
      val: '2016-07-01T14:58:26.336Z',
      res: true
    },
    {
      // accept output from native javascript method
      val: new Date().toISOString(),
      res: true
    }
  ];
  test.expect(test.length);
  tests.forEach(function(t) {
    test.equals(t.res, utils.isDateStrValid(t.val));
  });
  test.done();
};
