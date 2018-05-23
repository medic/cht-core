const chai = require('chai'),
      recordUtils = require('../../../src/controllers/record-utils');

const process = timestamp => {
  const body = {
    from: '+888',
    message: 'hmm this is test',
    sent_timestamp: timestamp
  };
  const doc = recordUtils.createByForm(body);
  return new Date(doc.reported_date);
};

describe('record-utils-timestamp', () => {

  it('ms since epoch', () => {
    const actual = process('1352659197736');
    chai.expect(actual.getMilliseconds()).to.equal(736);
    chai.expect(actual.getSeconds()).to.equal(57);
  });

  it('support moment.js compat dates', () => {
    const actual = process('Apr 11, 2021 18:00 +0800');
    chai.expect(actual.valueOf()).to.equal(1618135200000);
  });

});
