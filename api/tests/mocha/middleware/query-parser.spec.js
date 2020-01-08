const chai = require('chai');
const sinon = require('sinon');
const queryParser = require('../../../src/middleware/query-parser');

let req;
let res;
let next;

describe('API queryParser middleware', () => {
  beforeEach(() => {
    req = {};
    res = {};
    next = sinon.stub();
  });
  afterEach(() => sinon.restore());

  describe('json', () => {
    it('should work with bad params', () => {
      req = {};
      queryParser.json(req, res, next);
      chai.expect(req.query).to.deep.equal({});

      req = { query: null };
      queryParser.json(req, res, next);
      chai.expect(req.query).to.deep.equal({});

      chai.expect(next.callCount).to.equal(2);
    });

    it('should json.parse every key in the query without failing', () => {
      req = {
        query: {
          first: undefined,
          second: 'whatever',
          third: '"something"',
          foo: 'true',
          bar: 'false',
          baz: false,
          esc: JSON.stringify(['a', 'b', 'c'])
        }
      };

      queryParser.json(req, res, next);
      chai.expect(req.query).to.deep.equal({
        first: undefined,
        second: 'whatever',
        third: 'something',
        foo: true,
        bar: false,
        baz: false,
        esc: ['a', 'b', 'c']
      });
    });
  });
});
