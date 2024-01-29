require('chai').should();

const service = require('../../../../src/services/export/report-mapper');

describe('Report mapper', () => {

  describe('Flatten fields', () => {
    it('flattens fields', () => {
      service._flatten({
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
      service._flatten({
        foo: [1, 2, 3],
        bar: {
          smang: ['a', 'b', 'c']
        }
      }).should.deep.equal({
        foo: [1, 2, 3],
        'bar.smang': ['a', 'b', 'c']
      });
    });
  });

});
