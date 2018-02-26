const chai = require('chai');
const sinon = require('sinon').sandbox.create();
const lineageFactory = require('../src/lineage');

describe('Lineage', function() {
  let get;
  let DB;
  let lineage;

  beforeEach(function() {
    get = sinon.stub();
    DB = { get };
    lineage = lineageFactory({ Promise, DB });
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('some func', function() {
    it('does something cool', function() {
      chai.expect(1).to.equal(2);
    });
  });
});
