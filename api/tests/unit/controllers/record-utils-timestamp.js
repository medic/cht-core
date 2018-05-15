const recordUtils = require('../../../src/controllers/record-utils');

const process = timestamp => {
  const body = {
    from: '+888',
    message: 'hmm this is test',
    sent_timestamp: timestamp
  };
  const doc = recordUtils.createByForm(body);
  return new Date(doc.reported_date);
};

exports['ms since epoch'] = test => {
  const actual = process('1352659197736');
  test.equals(actual.getMilliseconds(), 736);
  test.equals(actual.getSeconds(), 57);
  test.done();
};

exports['support moment.js compat dates'] = test => {
  const actual = process('Apr 11, 2021 18:00 +0800');
  test.equals(actual.valueOf(), 1618135200000);
  test.done();
};
