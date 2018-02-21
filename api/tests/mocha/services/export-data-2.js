require('chai').should();

const controller = require('../../../services/export-data-2');

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
    it('assigns arrays to a single cell', () => {
      controller._flatten({
        foo: [1,2,3],
        bar: {
          smang:['a','b','c']
        }
      }).should.deep.equal({
        foo: [1,2,3],
        'bar.smang': ['a', 'b', 'c']
      });
    });
  });
});
