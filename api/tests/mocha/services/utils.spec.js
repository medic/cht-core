const chai = require('chai');
const utils= require('../../../src/services/utils');

describe('API utils service', () => {
  describe('parseQueryParams', () => {
    it('should work with bad params', () => {
      chai.expect(utils.parseQueryParams()).to.deep.equal({});
      chai.expect(utils.parseQueryParams(null)).to.deep.equal({});
      chai.expect(utils.parseQueryParams([])).to.deep.equal({});
      chai.expect(utils.parseQueryParams('arandom')).to.deep.equal({});
    });

    it('should json.parse every key in the query without failing', () => {
      const query = {
        first: undefined,
        second: 'whatever',
        third: '"something"',
        foo: 'true',
        bar: 'false',
        baz: false,
        esc: JSON.stringify(['a', 'b', 'c'])
      };
      const result = utils.parseQueryParams(query);
      chai.expect(result).not.to.equal(query);
      chai.expect(result).to.deep.equal({
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
