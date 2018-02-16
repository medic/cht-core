require('chai').should();

const controller = require('../../../controllers/export-data-2');

describe('Export Data 2.0', () => {
  describe('Extract fields', () => {
    it('flattens fields', () => {
      controller._flatten({
        foo: 'fooVal',
        bars: {
          bar1: 'bar1Val',
          smang: {
            smong: 'smongVal'
          }
        }
      }).should.deep.equal({
        foo: 'fooVal',
        'bars.bar1': 'bar1Val',
        'bars.smang.smong': 'smongVal'
      });
    });
    it('Handles arrays', () => {
      // TODO: do we want it to work this way? Does it matter?
      controller._flatten({
        foo: [1,2,3],
        bar: {
          smang:['a','b','c']
        }
      }).should.deep.equal({
        'foo.0': 1,
        'foo.1': 2,
        'foo.2': 3,
        'bar.smang.0': 'a',
        'bar.smang.1': 'b',
        'bar.smang.2': 'c'
      });
    });
  });
});
